import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

/**
 * GET /api/debug/messages
 * 
 * Diagnostic endpoint to check message status and provider_message_id
 * Shows recent messages and whether they have provider_message_id set
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get recent messages with provider_message_id info
    const [messagesWithId]: any = await executeQuery(
      `SELECT 
        id,
        recipient_phone,
        status,
        provider_message_id,
        sent_at,
        created_at
      FROM sms_messages 
      WHERE user_id = ? 
      ORDER BY created_at DESC 
      LIMIT 20`,
      [userId]
    )

    // Check for messages with NULL provider_message_id
    const [nullIdMessages]: any = await executeQuery(
      `SELECT COUNT(*) as count 
      FROM sms_messages 
      WHERE user_id = ? AND provider_message_id IS NULL`,
      [userId]
    )

    // Check for messages with status = 'delivered'
    const [deliveredMessages]: any = await executeQuery(
      `SELECT COUNT(*) as count 
      FROM sms_messages 
      WHERE user_id = ? AND status = 'delivered'`,
      [userId]
    )

    return NextResponse.json({
      diagnostic: {
        recentMessages: messagesWithId || [],
        messagesWithNullProviderId: nullIdMessages?.[0]?.count || 0,
        deliveredMessageCount: deliveredMessages?.[0]?.count || 0,
        summary: {
          issue: (nullIdMessages?.[0]?.count || 0) > 0
            ? '❌ Messages are being stored with NULL provider_message_id - this prevents delivery reports from matching!'
            : '✅ Messages have provider_message_id set correctly',
          recommendation: (nullIdMessages?.[0]?.count || 0) > 0
            ? 'Check Africa\'s Talking SDK response - messageId might not be in the response'
            : 'Delivery should work once callbacks arrive',
        }
      }
    })
  } catch (error) {
    console.error('Diagnostic error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Diagnostic failed',
      },
      { status: 500 }
    )
  }
}
