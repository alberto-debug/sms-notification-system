/**
 * Type declarations for the africastalking npm package
 * This allows TypeScript to recognize the africastalking module
 */

declare module 'africastalking' {
  interface AfricasTalkingConfig {
    apiKey: string
    username: string
  }

  interface SMSOptions {
    to: string[]
    message: string
    from?: string
    enqueue?: number
    linkId?: string
    retryDurationInHours?: number
    requestId?: string
    keyword?: string
  }

  interface SMSRecipient {
    statusCode: number
    number: string
    status: string
    cost: string
    messageId: string
  }

  interface SMSResponse {
    SMSMessageData: {
      Message: string
      Recipients: SMSRecipient[]
    }
  }

  interface UserData {
    balance: string
  }

  interface UserResponse {
    UserData: UserData
  }

  interface SMS {
    send(options: SMSOptions): Promise<SMSResponse>
    sendBulk(options: SMSOptions): Promise<SMSResponse>
    fetchMessages(params: any): Promise<any>
  }

  interface AfricasTalkingClient {
    SMS: SMS
  }

  class AfricasTalking {
    constructor(config: AfricasTalkingConfig)
    SMS: SMS
  }

  export default AfricasTalking
}
