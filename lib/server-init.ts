/**
 * Server-side initialization module
 * Handles automatic setup tasks when the app starts
 */

import { initializeDatabase } from './db-init'

let initialized = false
let cronJobStarted = false

export async function initializeServer() {
  // Prevent multiple initialization attempts
  if (initialized) {
    return
  }

  try {
    console.log('🚀 Initializing server...')
    
    // Initialize database tables
    await initializeDatabase()
    
    initialized = true
    console.log('✅ Server initialization complete')

    // Start the scheduled message sender cron job
    startScheduledMessageCron()
  } catch (error) {
    console.error('❌ Server initialization failed:', error)
    // Don't re-throw - allow app to start even if DB init fails
    // This allows graceful recovery if DB is temporarily unavailable
  }
}

function startScheduledMessageCron() {
  if (cronJobStarted) return

  cronJobStarted = true
  console.log('⏰ Starting scheduled message cron job (runs every 10 seconds)...')

  // Run immediately on startup
  triggerScheduledMessageCron()

  // Then run every 10 seconds for precise timing
  setInterval(() => {
    triggerScheduledMessageCron()
  }, 10000) // 10 seconds
}

async function triggerScheduledMessageCron() {
  try {
    const cronSecret = process.env.CRON_SECRET || 'cron-secret'
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'

    const response = await fetch(`${baseUrl}/api/cron/send-scheduled-messages`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cronSecret}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      const result = await response.json()
      if (result.processed > 0 || result.failed > 0) {
        console.log(`📧 Cron job result: ${result.processed} processed, ${result.failed} failed`)
      }
    } else {
      console.error(`Cron job failed: ${response.status}`)
    }
  } catch (error) {
    console.error('Error triggering cron job:', error)
  }
}

