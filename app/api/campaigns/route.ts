import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

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
    } else {
      // Count contacts in selected groups
      const groupContacts: any = await executeQuery(
        'SELECT COUNT(DISTINCT id) as count FROM contacts WHERE user_id = ? AND group_id IN (?)',
        [userId, targets]
      )
      totalRecipients = groupContacts[0]?.count || 0
    }

    const result: any = await executeQuery(
      `INSERT INTO sms_campaigns 
       (user_id, name, message_content, target_type, targets, status, total_recipients, scheduled_at) 
       VALUES (?, ?, ?, ?, ?, 'scheduled', ?, ?)`,
      [userId, name, messageContent, targetType, JSON.stringify(targets), totalRecipients, scheduledAt]
    )

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
