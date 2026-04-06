import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

/**
 * POST /api/sms/delivery-report
 * 
 * Receives delivery status callbacks from Africa's Talking provider.
 * Official docs: https://africastalking.com/sms/api
 * 
 * Sent as application/x-www-form-urlencoded with the following fields:
 * - id: unique identifier for the message (same as messageId from send response)
 * - status: Sent, Submitted, Buffered, Rejected, Success, Failed, AbsentSubscriber, Expired
 * - phoneNumber: recipient phone number
 * - networkCode: unique identifier for the telco (62120=Airtel Nigeria, 63902=Safaricom, etc.)
 * - failureReason: (optional) only provided if status is Rejected or Failed
 *   (InsufficientCredit, InvalidLinkId, UserIsInactive, UserInBlackList, etc.)
 * - retryCount: (optional) number of times retry was attempted for premium SMS
 */
export async function POST(request: NextRequest) {
  try {
    let reports: any[] = []

    // Parse the request based on content type
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      // JSON format (fallback support)
      const body = await request.json()

      // Handle both single report and array of reports
      if (Array.isArray(body)) {
        reports = body
      } else if (body && typeof body === 'object') {
        // Single report or wrapped reports
        if (body.reports && Array.isArray(body.reports)) {
          reports = body.reports
        } else if (body.id) {
          reports = [body]
        }
      }
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Form-encoded format (official Africa's Talking delivery report format)
      const formData = await request.text()
      const params = new URLSearchParams(formData)

      // Africa's Talking sends one report per request
      const id = params.get('id')
      const phoneNumber = params.get('phoneNumber')
      const status = params.get('status')
      const networkCode = params.get('networkCode')
      const failureReason = params.get('failureReason')
      const retryCount = params.get('retryCount')

      if (id) {
        reports = [
          {
            id,
            phoneNumber,
            status,
            networkCode,
            failureReason,
            retryCount,
          },
        ]
      }
    }

    if (reports.length === 0) {
      console.warn('No delivery reports found in request')
      return NextResponse.json({
        success: false,
        message: 'No delivery reports found',
      })
    }

    // Process each delivery report
    const results = []
    for (const report of reports) {
      try {
        const { id: providerMessageId, status, networkCode, failureReason } = report

        if (!providerMessageId) {
          console.warn('Report missing provider message ID:', report)
          results.push({
            providerMessageId,
            success: false,
            error: 'Missing provider message ID',
          })
          continue
        }

        // Map Africa's Talking status to our status
        const mappedStatus = mapAfricasTalkingStatus(status)

        // Build update query - only set delivered_at for delivered status
        let updateQuery = `
          UPDATE sms_messages 
          SET status = ?, 
              provider_network_code = ?,
              provider_failure_reason = ?,
              updated_at = NOW()
        `
        
        if (mappedStatus === 'delivered') {
          updateQuery += ', delivered_at = NOW()'
        }
        
        updateQuery += ' WHERE provider_message_id = ? LIMIT 1'

        const updateResult: any = await executeQuery(updateQuery, [
          mappedStatus,
          networkCode || null,
          failureReason || null,
          providerMessageId,
        ])

        console.log(
          `✅ Delivery report processed: Provider ID ${providerMessageId} -> ${mappedStatus}${
            failureReason ? ` (Reason: ${failureReason})` : ''
          }`
        )

        results.push({
          providerMessageId,
          success: true,
          status: mappedStatus,
          networkCode,
          failureReason: failureReason || null,
          recordsUpdated: updateResult.affectedRows || 0,
        })
      } catch (error) {
        console.error('Error processing delivery report:', error, report)
        results.push({
          providerMessageId: report.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Delivery reports processed',
        processed: results.length,
        results,
      },
      { status: 200 }
    )
  } catch (error) {
    console.error('Error processing delivery report webhook:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process delivery report',
      },
      { status: 400 }
    )
  }
}

/**
 * Maps Africa's Talking status values to our internal status values
 * 
 * Africa's Talking official statuses:
 * - Sent: message sent by network (not yet delivered)
 * - Submitted: submitted to MSP (not yet delivered)
 * - Buffered: queued by MSP (not yet delivered)
 * - Rejected: rejected by MSP (FINAL)
 * - Success: successfully delivered to handset (FINAL)
 * - Failed: could not be delivered (FINAL)
 * - AbsentSubscriber: user SIM unreachable (FINAL)
 * - Expired: discarded by telco, flagged content/sender (FINAL)
 * 
 * Our internal statuses: pending, sent, failed, delivered
 */
function mapAfricasTalkingStatus(
  providerStatus: string | undefined
): 'pending' | 'sent' | 'failed' | 'delivered' {
  if (!providerStatus) {
    return 'pending'
  }

  const status = providerStatus.toLowerCase().trim()

  // Final success status -> delivered
  if (status === 'success') {
    return 'delivered'
  }

  // Intermediate/sent statuses -> sent (not yet delivered)
  if (
    status === 'sent' ||
    status === 'submitted' ||
    status === 'buffered' ||
    status === 'queued'
  ) {
    return 'sent'
  }

  // Final failure statuses -> failed
  if (
    status === 'failed' ||
    status === 'rejected' ||
    status === 'absentsubscriber' ||
    status === 'expired' ||
    status === 'error' ||
    status === 'undelivered' ||
    status === 'bounced'
  ) {
    return 'failed'
  }

  // Unknown statuses default to pending
  return 'pending'
}

/**
 * GET /api/sms/delivery-report
 * 
 * Optional: Health check endpoint to verify the webhook is accessible
 */
export async function GET(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: 'SMS delivery report webhook is accessible',
    expectedMethod: 'POST',
    supportedContentTypes: [
      'application/json',
      'application/x-www-form-urlencoded',
    ],
  })
}
