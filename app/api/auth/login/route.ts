import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import crypto from 'crypto'

// Health check endpoint
export async function GET() {
  return NextResponse.json({ status: 'ok' }, { status: 200 })
}

function hashPassword(password: string): string {
  return crypto
    .pbkdf2Sync(password, 'salt', 1000, 64, 'sha512')
    .toString('hex')
}

function verifyPassword(password: string, hash: string): boolean {
  const hashPassword = crypto
    .pbkdf2Sync(password, 'salt', 1000, 64, 'sha512')
    .toString('hex')
  return hashPassword === hash
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find user by email
    const results: any = await executeQuery(
      'SELECT id, email, name, password FROM users WHERE email = ?',
      [email]
    )

    if (!Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    const user = results[0]

    // Verify password
    if (!verifyPassword(password, user.password)) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Return user data (without password)
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
