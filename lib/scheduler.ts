import schedule from 'node-schedule'
import { executeQuery } from './db'
import { sendSMSViaAfricasTalking } from './africas-talking'

interface Campaign {
  id: number
  user_id: number
  message_content: string
  target_type: 'contacts' | 'groups'
  targets: string
  scheduled_at: string
}

const scheduledJobs: Map<number, schedule.Job> = new Map()

export async function setupScheduledMessageJobs() {
  try {
    console.log('📋 Loading scheduled campaigns from database...')

    // Get all campaigns that are scheduled
    const campaigns: any = await executeQuery(
      `SELECT id, user_id, message_content, target_type, targets, scheduled_at
       FROM sms_campaigns 
       WHERE status = 'scheduled' 
       AND scheduled_at IS NOT NULL`,
      []
    )

    console.log(`Found ${campaigns?.length || 0} campaigns to schedule`)

    if (!campaigns || campaigns.length === 0) {
      console.log('✅ No campaigns to schedule')
      return
    }

    // Schedule each campaign
    for (const campaign of campaigns) {
      scheduleMessageJob(campaign)
    }

    console.log(`✅ Scheduled ${campaigns.length} message jobs`)
  } catch (error: any) {
    console.error('❌ Failed to setup scheduled jobs:', error?.message || error)
  }
}

export function scheduleMessageJob(campaign: Campaign) {
  const campaignId = campaign.id
  
  // Cancel existing job if it exists
  if (scheduledJobs.has(campaignId)) {
    const existingJob = scheduledJobs.get(campaignId)
    existingJob?.cancel()
    scheduledJobs.delete(campaignId)
  }

  try {
    const scheduledDate = new Date(campaign.scheduled_at)
    const now = new Date()

    // Check if time has already passed
    if (scheduledDate <= now) {
      console.warn(`⚠️  Campaign ${campaignId} scheduled time has already passed, skipping`)
      return
    }

    // Check if more than 60 minutes in the future (safety check)
    const minutesUntilSend = Math.floor((scheduledDate.getTime() - now.getTime()) / 60000)
    if (minutesUntilSend > 1440) {
      // More than 24 hours - this might be a long-term schedule, still schedule it
      console.log(`📅 Campaign ${campaignId} scheduled for ${scheduledDate} (${minutesUntilSend} minutes away)`)
    }

    // Schedule the job
    const job = schedule.scheduleJob(scheduledDate, async () => {
      console.log(`🚀 Executing scheduled campaign ${campaignId}`)
      await sendScheduledCampaign(campaign)
      
      // Remove from map after execution
      scheduledJobs.delete(campaignId)
    })

    if (job) {
      scheduledJobs.set(campaignId, job)
      console.log(`✅ Campaign ${campaignId} scheduled to send at ${scheduledDate.toISOString()}`)
    } else {
      console.error(`❌ Failed to schedule campaign ${campaignId}`)
    }
  } catch (error: any) {
    console.error(`❌ Error scheduling campaign ${campaignId}:`, error?.message || error)
  }
}

export function cancelScheduledJob(campaignId: number) {
  try {
    const job = scheduledJobs.get(campaignId)
    if (job) {
      job.cancel()
      scheduledJobs.delete(campaignId)
      console.log(`🚫 Cancelled scheduled job for campaign ${campaignId}`)
    }
  } catch (error: any) {
    console.error(`❌ Error cancelling job for campaign ${campaignId}:`, error?.message || error)
  }
}

async function sendScheduledCampaign(campaign: Campaign) {
  try {
    console.log(`📧 Sending campaign ${campaign.id}: "${campaign.message_content.substring(0, 50)}..."`)

    // Get recipients based on target type
    let recipients: any = []
    const targets = JSON.parse(campaign.targets)

    if (campaign.target_type === 'contacts') {
      const placeholders = targets.map(() => '?').join(',')
      recipients = await executeQuery(
        `SELECT id, phone_number FROM contacts WHERE user_id = ? AND id IN (${placeholders})`,
        [campaign.user_id, ...targets]
      )
    } else {
      // target_type === 'groups'
      const placeholders = targets.map(() => '?').join(',')
      recipients = await executeQuery(
        `SELECT id, phone_number FROM contacts WHERE user_id = ? AND group_id IN (${placeholders})`,
        [campaign.user_id, ...targets]
      )
    }

    if (!recipients || recipients.length === 0) {
      console.warn(`⚠️  No recipients found for campaign ${campaign.id}`)
      
      // Update campaign status
      await executeQuery(
        `UPDATE sms_campaigns 
         SET status = 'sent', sent_count = 0, failed_count = 0, sent_at = NOW()
         WHERE id = ?`,
        [campaign.id]
      )
      return
    }

    let sentCount = 0
    let failedCount = 0

    // Send messages to each recipient
    for (const recipient of recipients) {
      try {
        const result = await sendSMSViaAfricasTalking(recipient.phone_number, campaign.message_content)
        if (result.success) {
          sentCount++
          console.log(`✅ SMS sent to ${recipient.phone_number} (messageId: ${result.messageId})`)
        } else {
          failedCount++
          console.warn(`⚠️  Failed to send SMS to ${recipient.phone_number}: ${result.error}`)
        }
      } catch (error: any) {
        console.error(`❌ Error sending SMS to ${recipient.phone_number}:`, error?.message || error)
        failedCount++
      }
    }

    // Update campaign status to sent
    await executeQuery(
      `UPDATE sms_campaigns 
       SET status = 'sent', sent_count = ?, failed_count = ?, sent_at = NOW()
       WHERE id = ?`,
      [sentCount, failedCount, campaign.id]
    )

    console.log(`✅ Campaign ${campaign.id} completed: ${sentCount} sent, ${failedCount} failed`)
  } catch (error: any) {
    console.error(`❌ Failed to send campaign ${campaign.id}:`, error?.message || error)
    
    // Mark as sent with error (after 1 hour window)
    try {
      await executeQuery(
        `UPDATE sms_campaigns 
         SET status = 'cancelled', updated_at = NOW()
         WHERE id = ?`,
        [campaign.id]
      )
    } catch (updateError: any) {
      console.error(`Failed to update campaign ${campaign.id} status:`, updateError?.message || updateError)
    }
  }
}
