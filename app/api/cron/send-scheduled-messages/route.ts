import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { sendSMSViaAfricasTalking } from '@/lib/africas-talking'

export async function GET(request: NextRequest) {
  try {
    // Verify it's a valid cron request (from your service or internal)
    const authHeader = request.headers.get('authorization')
    const cronToken = process.env.CRON_SECRET || 'cron-secret'

    if (authHeader !== `Bearer ${cronToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    console.log('🕐 Running scheduled message sender cron job...')

    // Get all campaigns that are scheduled and due to be sent
    const campaigns: any = await executeQuery(
      `SELECT id, user_id, message_content, target_type, targets, status, scheduled_at
       FROM sms_campaigns 
       WHERE status = 'scheduled' 
       AND scheduled_at IS NOT NULL
       AND scheduled_at <= NOW()
       ORDER BY scheduled_at ASC`,
      []
    )

    console.log(`Found ${campaigns?.length || 0} campaigns to process`)

    if (!campaigns || campaigns.length === 0) {
      console.log('✅ No campaigns to send at this time')
      return NextResponse.json({
        success: true,
        message: 'No campaigns to send',
        processed: 0,
      })
    }

    let processed = 0
    let failed = 0
    let expired = 0

    for (const campaign of campaigns) {
      try {
        const scheduledDate = new Date(campaign.scheduled_at)
        const now = new Date()
        const minutesPassed = Math.floor((now.getTime() - scheduledDate.getTime()) / 60000)

        console.log(`📧 Processing campaign ${campaign.id}: scheduled at ${campaign.scheduled_at}, ${minutesPassed} minutes ago`)

        // If more than 60 minutes have passed, mark as expired instead of sending
        if (minutesPassed > 60) {
          console.log(`⏰ Campaign ${campaign.id} expired (${minutesPassed} minutes past scheduled time) - NOT sending`)
          
          await executeQuery(
            `UPDATE sms_campaigns 
             SET status = 'cancelled', updated_at = NOW()
             WHERE id = ?`,
            [campaign.id]
          )
          
          expired++
          continue
        }

        // Get recipients based on target type
        let recipients: any = []
        const targets = JSON.parse(campaign.targets)

        if (campaign.target_type === 'contacts') {
          // Build IN clause with proper placeholders for array
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
          } catch (error) {
            console.error(`❌ Error sending SMS to ${recipient.phone_number}:`, error)
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

        console.log(`✅ Campaign ${campaign.id} sent: ${sentCount} success, ${failedCount} failed`)
        processed++
      } catch (error) {
        console.error(`❌ Failed to process campaign ${campaign.id}:`, error)
        failed++

        // Don't update status on error - keep as scheduled so it can be retried
        try {
          await executeQuery(
            `UPDATE sms_campaigns SET updated_at = NOW() WHERE id = ?`,
            [campaign.id]
          )
        } catch (updateError) {
          console.error(`Failed to update campaign ${campaign.id} timestamp:`, updateError)
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processed} campaigns, ${expired} expired, ${failed} failed`,
      processed,
      expired,
      failed,
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Cron job failed', details: String(error) },
      { status: 500 }
    )
  }
}
