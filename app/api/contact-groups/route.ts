import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    const results: any = await executeQuery(
      `SELECT id, name, description, created_at as createdAt
       FROM contact_groups 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    )

    return NextResponse.json({
      groups: Array.isArray(results) ? results : [],
    })
  } catch (error) {
    console.error('Error fetching groups:', error)
    return NextResponse.json(
      { error: 'Failed to fetch groups' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, description } = body

    if (!userId || !name) {
      return NextResponse.json(
        { error: 'User ID and name are required' },
        { status: 400 }
      )
    }

    const result: any = await executeQuery(
      'INSERT INTO contact_groups (user_id, name, description) VALUES (?, ?, ?)',
      [userId, name, description || null]
    )

    return NextResponse.json({
      group: {
        id: result.insertId,
        name,
        description,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating group:', error)
    return NextResponse.json(
      { error: 'Failed to create group' },
      { status: 500 }
    )
  }
}
