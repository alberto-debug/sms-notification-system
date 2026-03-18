/**
 * Server-side initialization module
 * Handles automatic setup tasks when the app starts
 */

import { initializeDatabase } from './db-init'
import { setupScheduledMessageJobs } from './scheduler'

let initialized = false
let schedulerStarted = false

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

    // Start the proper job scheduler
    startProperJobScheduler()
  } catch (error: any) {
    console.error('❌ Server initialization failed:', error?.message || error)
    // Don't re-throw - allow app to start even if DB init fails
    // This allows graceful recovery if DB is temporarily unavailable
  }
}

function startProperJobScheduler() {
  if (schedulerStarted) return

  schedulerStarted = true
  console.log('⏰ Starting proper job scheduler with node-schedule...')

  setupScheduledMessageJobs().catch((error: any) => {
    console.error('❌ Failed to setup scheduled message jobs:', error?.message || error)
  })
}

