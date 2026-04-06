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
      `SELECT DISTINCT c.id, c.name, c.email, c.phone_number as phoneNumber, c.created_at as createdAt 
       FROM contacts c
       WHERE c.user_id = ? 
       ORDER BY c.created_at DESC`,
      [userId]
    )

    // For each contact, fetch all associated groups
    const contactsWithGroups = await Promise.all(
      results.map(async (contact: any) => {
        const groups: any = await executeQuery(
          `SELECT cgm.group_id as id, cg.name 
           FROM contact_group_mapping cgm
           JOIN contact_groups cg ON cgm.group_id = cg.id
           WHERE cgm.contact_id = ?`,
          [contact.id]
        )
        return {
          ...contact,
          groupIds: groups.map((g: any) => g.id),
          groupNames: groups.map((g: any) => g.name),
        }
      })
    )

    return NextResponse.json({
      contacts: contactsWithGroups,
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
    const { userId, name, email, phoneNumber, groupIds } = body

    if (!userId || !name || !phoneNumber) {
      return NextResponse.json(
        { error: 'User ID, name, and phone number are required' },
        { status: 400 }
      )
    }

    const result: any = await executeQuery(
      'INSERT INTO contacts (user_id, name, email, phone_number) VALUES (?, ?, ?, ?)',
      [userId, name, email || null, phoneNumber]
    )

    const contactId = result.insertId

    // If groupIds provided, create mappings in junction table
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      for (const groupId of groupIds) {
        await executeQuery(
          'INSERT INTO contact_group_mapping (contact_id, group_id) VALUES (?, ?)',
          [contactId, groupId]
        )
      }
    }

    return NextResponse.json({
      contact: {
        id: contactId,
        name,
        email,
        phoneNumber,
        groupIds: groupIds || [],
        groupNames: [],
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
