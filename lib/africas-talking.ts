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
 
/**
 * Initialize the Africa's Talking SDK client
 */
function initializeATClient() {
  const apiKey = process.env.AFRICAS_TALKING_API_KEY
  const username = process.env.AFRICAS_TALKING_USERNAME

  if (!apiKey || !username) {
    throw new Error('Africa\'s Talking API credentials not configured')
  }

  return new AfricasTalking({
    apiKey: apiKey,
    username: username,
  })
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
    const at = initializeATClient()
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

    // Status codes: 100=Processed, 101=Sent, 102=Queued
    if (recipient.statusCode >= 100 && recipient.statusCode <= 102) {
      return {
        success: true,
        recipient: recipient.number,
        messageId: recipient.messageId,
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
 * Send SMS to multiple recipients
 * @param recipients Array of phone numbers
 * @param messageContent Message text
 * @returns Array of send results
 */
export async function sendBulkSMSViaAfricasTalking(
  recipients: string[],
  messageContent: string
): Promise<SendSMSResult[]> {
  const results: SendSMSResult[] = []

  for (const recipient of recipients) {
    try {
      const result = await sendSMSViaAfricasTalking(recipient, messageContent)
      results.push(result)
    } catch (error) {
      results.push({
        success: false,
        recipient,
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  return results
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
