import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { sendSMSViaAfricasTalking } from '@/lib/africas-talking'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const status = request.nextUrl.searchParams.get('status')
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    let query = `
      SELECT 
        id,
        recipient_phone as recipientPhone,
        message_content as messageContent,
        status,
        sent_at as sentAt,
        created_at as createdAt
      FROM sms_messages 
      WHERE user_id = ?
    `

    const params: any[] = [userId]

    if (status) {
      query += ' AND status = ?'
      params.push(status)
    }

    query += ' ORDER BY created_at DESC LIMIT ?'
    params.push(limit)

    const results: any = await executeQuery(query, params)

    return NextResponse.json({
      messages: Array.isArray(results) ? results : [],
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, recipientPhone, messageContent, scheduledAt } = body

    if (!userId || !recipientPhone || !messageContent) {
      return NextResponse.json(
        { error: 'User ID, recipient phone, and message content are required' },
        { status: 400 }
      )
    }

    // Normalize phone number to +254XXXXXXX format
    let normalizedPhone = recipientPhone.trim()
    
    // Remove any spaces
    normalizedPhone = normalizedPhone.replace(/\s/g, '')
    
    // Remove any existing + prefix temporarily
    normalizedPhone = normalizedPhone.replace(/\+/g, '')
    
    // If it doesn't start with 254, prepend it
    if (!normalizedPhone.startsWith('254')) {
      normalizedPhone = '254' + normalizedPhone
    }
    
    // Add + prefix for Africa's Talking API format
    normalizedPhone = '+' + normalizedPhone

    // If scheduled for later, just save as pending - don't send now
    if (scheduledAt) {
      const result: any = await executeQuery(
        `INSERT INTO sms_messages 
         (user_id, recipient_phone, message_content, status, scheduled_at) 
         VALUES (?, ?, ?, 'pending', ?)`,
        [userId, normalizedPhone, messageContent, scheduledAt]
      )

      return NextResponse.json({
        message: {
          id: result.insertId,
          recipientPhone: normalizedPhone,
          messageContent,
          status: 'pending',
          scheduledAt,
        },
      }, { status: 201 })
    }

    // Send immediately via Africa's Talking
    try {
      const atResponse = await sendSMSViaAfricasTalking(normalizedPhone, messageContent)

      // Save the sent message to database
      const result: any = await executeQuery(
        `INSERT INTO sms_messages 
         (user_id, recipient_phone, message_content, status, sent_at) 
         VALUES (?, ?, ?, 'sent', NOW())`,
        [userId, normalizedPhone, messageContent]
      )

      return NextResponse.json({
        message: {
          id: result.insertId,
          recipientPhone: normalizedPhone,
          messageContent,
          status: 'sent',
          timestamp: new Date().toISOString(),
          africasTalkingResponse: atResponse,
        },
      }, { status: 201 })
    } catch (smsError: any) {
      // Save failed message to database
      const result: any = await executeQuery(
        `INSERT INTO sms_messages 
         (user_id, recipient_phone, message_content, status, error_message) 
         VALUES (?, ?, ?, 'failed', ?)`,
        [userId, normalizedPhone, messageContent, smsError.message]
      )

      console.error('SMS sending failed:', smsError)
      return NextResponse.json({
        message: {
          id: result.insertId,
          recipientPhone: normalizedPhone,
          messageContent,
          status: 'failed',
          error: smsError.message,
        },
      }, { status: 201 })
    }
  } catch (error) {
    console.error('Error processing message:', error)
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    )
  }
}
