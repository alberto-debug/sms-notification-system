import { NextRequest, NextResponse } from 'next/server'
import { initializeDatabase } from '@/lib/db-init'

export async function GET(request: NextRequest) {
  try {
    // Check if initialization is already in progress or completed
    const authHeader = request.headers.get('authorization')
    const initToken = process.env.DB_INIT_TOKEN || 'dev-token'

    // For development, allow without token. For production, require token
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${initToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    await initializeDatabase()

    return NextResponse.json({
      success: true,
      message: 'Database initialized successfully',
    })
  } catch (error) {
    console.error('Database initialization error:', error)
    return NextResponse.json(
      { error: 'Database initialization failed', details: String(error) },
      { status: 500 }
    )
  }
}
