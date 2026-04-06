/**
 * Africa's Talking SMS API Integration
 * This module handles sending SMS messages via Africa's Talking API using the official SDK
 * 
 * Authentication documentation:
 * - API Key is included in the request header as 'apiKey'
 * - For POST requests with form-encoded body, username goes in the form fields
 * - For GET requests, username goes as a query parameter
 */

import AfricasTalking from 'africastalking'

interface SendSMSResult {
  success: boolean
  recipient: string
  messageId?: string
  cost?: string
  statusCode?: number
  error?: string
}

interface BulkSMSResult {
  successful: Array<{
    phone: string
    messageId: string
    cost: string
  }>
  failed: Array<{
    phone: string
    error: string
    statusCode: number
  }>
}

// Singleton instance to prevent creating multiple SDK clients
let atClientInstance: any = null

/**
 * Initialize the Africa's Talking SDK client (singleton pattern)
 * Ensures the SDK client is only created once
 */
function getATClient() {
  if (atClientInstance) {
    return atClientInstance
  }

  const apiKey = process.env.AFRICAS_TALKING_API_KEY
  const username = process.env.AFRICAS_TALKING_USERNAME

  if (!apiKey || !username) {
    throw new Error('Africa\'s Talking API credentials not configured')
  }

  atClientInstance = new AfricasTalking({
    apiKey: apiKey,
    username: username,
  })

  return atClientInstance
}

export async function sendSMSViaAfricasTalking(
  recipientPhone: string,
  messageContent: string
): Promise<SendSMSResult> {
  const senderId = process.env.AFRICAS_TALKING_SENDER_ID

  if (!senderId) {
    throw new Error('Africa\'s Talking Sender ID not configured')
  }

  try {
    const at = getATClient()
    const sms = at.SMS

    // Send SMS using the SDK
    const result = await sms.send({
      to: [recipientPhone],
      message: messageContent,
      from: senderId,
    })

    // Check if the request was successful
    if (!result || !result.SMSMessageData) {
      throw new Error('Invalid response from Africa\'s Talking API')
    }

    const data = result.SMSMessageData

    // Check if there are recipients in the response
    if (!data.Recipients || data.Recipients.length === 0) {
      throw new Error('No recipients in Africa\'s Talking response')
    }

    const recipient = data.Recipients[0]

    console.log('🔍 Africa\'s Talking Response for recipient:', {
      number: recipient.number,
      statusCode: recipient.statusCode,
      messageId: recipient.messageId,
      id: recipient.id,
      status: recipient.status,
      allKeys: Object.keys(recipient),
    })

    // Status codes: 100=Processed, 101=Sent, 102=Queued
    if (recipient.statusCode >= 100 && recipient.statusCode <= 102) {
      const msgId = recipient.messageId || recipient.id

      // Validate that we have a messageId before marking as successful
      if (!msgId) {
        console.error(`❌ CRITICAL: No messageId/id from Africa's Talking for ${recipient.number}!`)
        console.error(`   Full recipient object:`, recipient)
        throw new Error('Provider did not return messageId - cannot track delivery status')
      }

      console.log(`✅ SMS successfully queued. Using messageId: ${msgId}`)

      return {
        success: true,
        recipient: recipient.number,
        messageId: msgId,
        cost: recipient.cost,
        statusCode: recipient.statusCode,
      }
    }

    // Handle error status codes
    const errorMessages: Record<number, string> = {
      401: 'Risk Hold - Please contact Africa\'s Talking support',
      402: 'Invalid Sender ID',
      403: 'Invalid Phone Number',
      404: 'Unsupported Number Type',
      405: 'Insufficient Balance',
      406: 'User in Blacklist',
      407: 'Could Not Route',
      500: 'Internal Server Error',
      501: 'Gateway Error',
      502: 'Rejected By Gateway',
    }

    throw new Error(
      errorMessages[recipient.statusCode] ||
        `Africa\'s Talking API error: ${recipient.statusCode} - ${recipient.status}`
    )
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to send SMS via Africa\'s Talking: ${String(error)}`)
  }
}

/**
 * Send SMS to one or more recipients
 * The SDK automatically handles bulk sends when multiple recipients are provided
 * Just pass an array of phone numbers and the SDK manages the rest
 *
 * @param recipients Array of phone numbers (1 or more)
 * @param messageContent Message text
 * @returns BulkSMSResult with successful and failed recipients
 */
export async function sendBulkSMSViaAfricasTalking(
  recipients: string[],
  messageContent: string
): Promise<BulkSMSResult> {
  const senderId = process.env.AFRICAS_TALKING_SENDER_ID

  if (!senderId) {
    throw new Error('Africa\'s Talking Sender ID not configured')
  }

  if (!recipients || recipients.length === 0) {
    throw new Error('No recipients provided')
  }

  try {
    const at = getATClient()
    const sms = at.SMS

    // Send SMS to all recipients - SDK automatically handles bulk when array is provided
    // Do NOT include bulkSMSMode parameter - it's not a valid SDK parameter
    const result = await sms.send({
      to: recipients,
      message: messageContent,
      from: senderId,
    })

    if (!result || !result.SMSMessageData) {
      throw new Error('Invalid response from Africa\'s Talking API')
    }

    const data = result.SMSMessageData

    if (!data.Recipients || data.Recipients.length === 0) {
      throw new Error('No recipients in Africa\'s Talking response')
    }

    const successful: BulkSMSResult['successful'] = []
    const failed: BulkSMSResult['failed'] = []

    for (const recipient of data.Recipients) {
      const msgId = recipient.messageId || recipient.id
      
      console.log('📊 Africa\'s Talking Bulk SMS Response:', {
        number: recipient.number,
        statusCode: recipient.statusCode,
        messageId: recipient.messageId,
        id: recipient.id,
        resolvedMessageId: msgId,
        allKeys: Object.keys(recipient),
      })

      if (recipient.statusCode >= 100 && recipient.statusCode <= 102) {
        // Validate that we have a messageId before marking as successful
        if (!msgId) {
          console.error(`❌ CRITICAL: No messageId/id from Africa's Talking for ${recipient.number}!`)
          console.error(`   Full recipient object:`, recipient)
          failed.push({
            phone: recipient.number,
            error: 'No messageId returned from provider - cannot track delivery',
            statusCode: recipient.statusCode,
          })
          continue
        }

        successful.push({
          phone: recipient.number,
          messageId: msgId,
          cost: recipient.cost || '0',
        })
      } else {
        const errorMessages: Record<number, string> = {
          401: 'Risk Hold',
          402: 'Invalid Sender ID',
          403: 'Invalid Phone Number',
          404: 'Unsupported Number Type',
          405: 'Insufficient Balance',
          406: 'User in Blacklist',
          407: 'Could Not Route',
          500: 'Internal Server Error',
          501: 'Gateway Error',
          502: 'Rejected By Gateway',
        }
        failed.push({
          phone: recipient.number,
          error: errorMessages[recipient.statusCode] || `Error ${recipient.statusCode}`,
          statusCode: recipient.statusCode,
        })
      }
    }

    console.log(`📊 Bulk SMS Summary: ${successful.length} successful, ${failed.length} failed`)
    return { successful, failed }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to send bulk SMS: ${String(error)}`)
  }
}

/**
 * Check remaining account balance
 * For GET requests, username is passed as a query parameter per Africa's Talking API docs
 */
export async function checkAccountBalance(): Promise<string> {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY
  const username = process.env.AFRICAS_TALKING_USERNAME
  const useSandbox = process.env.AFRICAS_TALKING_SANDBOX === 'true'

  if (!apiKey || !username) {
    throw new Error('Africa\'s Talking API credentials not configured')
  }

  // For GET requests, the username must be passed as a query parameter
  const baseEndpoint = useSandbox
    ? 'https://api.sandbox.africastalking.com/version1/user'
    : 'https://api.africastalking.com/version1/user'

  const endpoint = `${baseEndpoint}?username=${encodeURIComponent(username)}`

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        apiKey: apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`API error ${response.status}: ${errorText}`)
    }

    const data: any = await response.json()

    // Extract balance from response
    // The response structure includes UserData with balance information
    if (data.UserData && data.UserData.balance) {
      return data.UserData.balance
    }

    // Fallback if response structure is different
    return JSON.stringify(data)
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error(`Failed to check account balance: ${String(error)}`)
  }
}
