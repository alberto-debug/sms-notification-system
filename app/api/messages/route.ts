import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { sendBulkSMSViaAfricasTalking } from '@/lib/africas-talking'

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
        provider_failure_reason as failureReason,
        provider_network_code as networkCode,
        sent_at as sentAt,
        delivered_at as deliveredAt,
        error_message as errorMessage,
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
    const { userId, recipientPhones, messageContent, scheduledAt } = body

    // Handle both single and multiple recipients for backwards compatibility
    const phoneArray = Array.isArray(recipientPhones) 
      ? recipientPhones 
      : (recipientPhones ? [recipientPhones] : [])

    if (!userId || phoneArray.length === 0 || !messageContent) {
      return NextResponse.json(
        { error: 'User ID, recipient phone(s), and message content are required' },
        { status: 400 }
      )
    }

    // Normalize phone numbers to +254XXXXXXX format
    const normalizedPhones = phoneArray.map(phone => {
      let normalized = phone.trim()
      normalized = normalized.replace(/\s/g, '')
      normalized = normalized.replace(/\+/g, '')
      if (!normalized.startsWith('254')) {
        normalized = '254' + normalized
      }
      return '+' + normalized
    })

    console.log(`📤 Preparing to send bulk SMS to ${normalizedPhones.length} recipient(s)`)

    // If scheduled for later, just save as pending - don't send now
    if (scheduledAt) {
      const results = []
      for (const phone of normalizedPhones) {
        const result: any = await executeQuery(
          `INSERT INTO sms_messages 
           (user_id, recipient_phone, message_content, status, scheduled_at) 
           VALUES (?, ?, ?, 'pending', ?)`,
          [userId, phone, messageContent, scheduledAt]
        )
        results.push({
          id: result.insertId,
          recipientPhone: phone,
          status: 'pending',
        })
      }

      return NextResponse.json({
        messages: results,
        totalScheduled: results.length,
      }, { status: 201 })
    }

    // Send immediately via Africa's Talking (BULK MODE)
    try {
      console.log(`📊 Sending bulk SMS via Africa's Talking...`)
      const bulkResult = await sendBulkSMSViaAfricasTalking(normalizedPhones, messageContent)

      console.log(`📊 Bulk SMS Result:`, {
        successful: bulkResult.successful.length,
        failed: bulkResult.failed.length,
      })

      const savedMessages = []

      // Save successful messages
      for (const success of bulkResult.successful) {
        console.log(`💾 Saving successful message to DB:`, {
          phone: success.phone,
          messageId: success.messageId,
          cost: success.cost,
        })
        
        const result: any = await executeQuery(
          `INSERT INTO sms_messages 
           (user_id, recipient_phone, message_content, status, sent_at, provider_message_id) 
           VALUES (?, ?, ?, 'sent', NOW(), ?)`,
          [userId, success.phone, messageContent, success.messageId || null]
        )

        savedMessages.push({
          id: result.insertId,
          recipientPhone: success.phone,
          status: 'sent',
          providerMessageId: success.messageId,
          cost: success.cost,
        })
      }

      // Save failed messages
      for (const failure of bulkResult.failed) {
        console.log(`❌ Saving failed message to DB:`, {
          phone: failure.phone,
          error: failure.error,
          statusCode: failure.statusCode,
        })
        
        const result: any = await executeQuery(
          `INSERT INTO sms_messages 
           (user_id, recipient_phone, message_content, status, error_message) 
           VALUES (?, ?, ?, 'failed', ?)`,
          [userId, failure.phone, messageContent, failure.error]
        )

        savedMessages.push({
          id: result.insertId,
          recipientPhone: failure.phone,
          status: 'failed',
          error: failure.error,
        })
      }

      console.log(`💾 Saved ${savedMessages.length} messages to database`)

      return NextResponse.json({
        messages: savedMessages,
        summary: {
          total: normalizedPhones.length,
          successful: bulkResult.successful.length,
          failed: bulkResult.failed.length,
        },
      }, { status: 201 })
    } catch (smsError: any) {
      console.error(`❌ BULK SMS ERROR:`, smsError.message)
      
      // Save all as failed if bulk request fails
      const failedMessages = []
      for (const phone of normalizedPhones) {
        const result: any = await executeQuery(
          `INSERT INTO sms_messages 
           (user_id, recipient_phone, message_content, status, error_message) 
           VALUES (?, ?, ?, 'failed', ?)`,
          [userId, phone, messageContent, smsError.message]
        )
        failedMessages.push({
          id: result.insertId,
          recipientPhone: phone,
          status: 'failed',
          error: smsError.message,
        })
      }

      return NextResponse.json({
        messages: failedMessages,
        error: smsError.message,
        summary: {
          total: normalizedPhones.length,
          successful: 0,
          failed: normalizedPhones.length,
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
