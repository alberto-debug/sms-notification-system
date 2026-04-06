import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contactId = parseInt(id)

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    await executeQuery(
      'DELETE FROM contacts WHERE id = ?',
      [contactId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const contactId = parseInt(id)
    const body = await request.json()
    const { name, email, phoneNumber, groupId } = body

    if (!contactId) {
      return NextResponse.json(
        { error: 'Contact ID is required' },
        { status: 400 }
      )
    }

    // Build dynamic update query to only update provided fields
    const fields: string[] = []
    const values: any[] = []

    if (name !== undefined) {
      fields.push('name = ?')
      values.push(name)
    }
    if (email !== undefined) {
      fields.push('email = ?')
      values.push(email)
    }
    if (phoneNumber !== undefined) {
      fields.push('phone_number = ?')
      values.push(phoneNumber)
    }
    if (groupId !== undefined) {
      fields.push('group_id = ?')
      values.push(groupId)
    }

    if (fields.length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      )
    }

    values.push(contactId)
    const query = `UPDATE contacts SET ${fields.join(', ')} WHERE id = ?`

    await executeQuery(query, values)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}
