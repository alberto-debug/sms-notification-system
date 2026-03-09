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
      `SELECT id, name, email, phone_number as phoneNumber, group_id as groupId, created_at as createdAt 
       FROM contacts 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    )

    return NextResponse.json({
      contacts: Array.isArray(results) ? results : [],
    })
  } catch (error) {
    console.error('Error fetching contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, email, phoneNumber, groupId } = body

    if (!userId || !name || !phoneNumber) {
      return NextResponse.json(
        { error: 'User ID, name, and phone number are required' },
        { status: 400 }
      )
    }

    const result: any = await executeQuery(
      'INSERT INTO contacts (user_id, name, email, phone_number, group_id) VALUES (?, ?, ?, ?, ?)',
      [userId, name, email || null, phoneNumber, groupId || null]
    )

    return NextResponse.json({
      contact: {
        id: result.insertId,
        name,
        email,
        phoneNumber,
        groupId,
      },
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating contact:', error)
    
    // Handle duplicate phone number
    if (error?.code === 'ER_DUP_ENTRY' && error?.sqlMessage?.includes('unique_user_phone')) {
      return NextResponse.json(
        { error: 'This phone number is already in your contacts' },
        { status: 409 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to create contact' },
      { status: 500 }
    )
  }
}
