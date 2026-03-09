import { NextRequest, NextResponse } from 'next/server'
import { checkAccountBalance } from '@/lib/africas-talking'

export async function GET(request: NextRequest) {
  try {
    const balance = await checkAccountBalance()

    return NextResponse.json({
      balance,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking balance:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check balance' },
      { status: 500 }
    )
  }
}
