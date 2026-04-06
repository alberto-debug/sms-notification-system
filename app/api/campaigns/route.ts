import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { scheduleMessageJob } from '@/lib/scheduler'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const results: any = await executeQuery(
      `SELECT 
        id,
        name,
        description,
        message_content as messageContent,
        status,
        total_recipients as totalRecipients,
        sent_count as sentCount,
        failed_count as failedCount,
        scheduled_at as scheduledAt,
        created_at as createdAt
      FROM sms_campaigns 
      WHERE user_id = ? 
      ORDER BY created_at DESC`,
      [userId]
    )

    return NextResponse.json({
      campaigns: Array.isArray(results) ? results : [],
    })
  } catch (error) {
    console.error('Error fetching campaigns:', error)
    return NextResponse.json(
      { error: 'Failed to fetch campaigns' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, messageContent, scheduledAt, targetType, targets } = body

    if (!userId || !name || !messageContent) {
      return NextResponse.json(
        { error: 'User ID, name, and message content are required' },
        { status: 400 }
      )
    }

    if (!targetType || !targets || targets.length === 0) {
      return NextResponse.json(
        { error: 'At least one target contact or group is required' },
        { status: 400 }
      )
    }

    // Count total recipients based on target type
    let totalRecipients = 0
    if (targetType === 'contacts') {
      totalRecipients = targets.length
    } else if (targetType === 'groups') {
      // Count distinct contacts in selected groups using junction table
      const placeholders = targets.map(() => '?').join(',')
      const groupContacts: any = await executeQuery(
        `SELECT COUNT(DISTINCT c.id) as count 
         FROM contacts c
         INNER JOIN contact_group_mapping cgm ON c.id = cgm.contact_id
         WHERE c.user_id = ? AND cgm.group_id IN (${placeholders})`,
        [userId, ...targets]
      )
      totalRecipients = groupContacts[0]?.count || 0
    } else if (targetType === 'mixed') {
      // For mixed, targets contains both contact IDs and group IDs
      // We need to get distinct recipients from both individual contacts AND group members
      const placeholders = targets.map(() => '?').join(',')
      const mixedRecipients: any = await executeQuery(
        `SELECT COUNT(DISTINCT c.id) as count 
         FROM (
           SELECT DISTINCT id FROM contacts WHERE user_id = ? AND id IN (${placeholders})
           UNION
           SELECT DISTINCT c.id FROM contacts c
           INNER JOIN contact_group_mapping cgm ON c.id = cgm.contact_id
           WHERE c.user_id = ? AND cgm.group_id IN (${placeholders})
         ) as combined_contacts
         JOIN contacts c ON combined_contacts.id = c.id`,
        [userId, ...targets, userId, ...targets]
      )
      totalRecipients = mixedRecipients[0]?.count || 0
    }

    const result: any = await executeQuery(
      `INSERT INTO sms_campaigns 
       (user_id, name, message_content, target_type, targets, status, total_recipients, scheduled_at) 
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
      [userId, name, messageContent, targetType, JSON.stringify(targets), totalRecipients, scheduledAt]
    )

    // Schedule the message to be sent at the specified time
    scheduleMessageJob({
      id: result.insertId,
      user_id: userId,
      message_content: messageContent,
      target_type: targetType as 'contacts' | 'groups' | 'mixed',
      targets: JSON.stringify(targets),
      scheduled_at: scheduledAt,
    })

    return NextResponse.json({
      campaign: {
        id: result.insertId,
        name,
        messageContent,
        status: 'scheduled',
        totalRecipients,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to create campaign' },
      { status: 500 }
    )
  }
}
