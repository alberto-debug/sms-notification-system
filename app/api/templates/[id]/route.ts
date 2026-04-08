import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const templateId = parseInt(id)
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Verify template belongs to user before deleting
    const existing: any = await executeQuery(
      'SELECT id FROM sms_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    )

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    await executeQuery(
      'DELETE FROM sms_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    )

    return NextResponse.json({ success: true, message: 'Template deleted' })
  } catch (error) {
    console.error('Error deleting template:', error)
    return NextResponse.json(
      { error: 'Failed to delete template' },
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
    const templateId = parseInt(id)
    const body = await request.json()
    const { userId, name, content, variables } = body

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    if (!userId || !name || !content) {
      return NextResponse.json(
        { error: 'User ID, name, and content are required' },
        { status: 400 }
      )
    }

    // Verify template belongs to user before updating
    const existing: any = await executeQuery(
      'SELECT id FROM sms_templates WHERE id = ? AND user_id = ?',
      [templateId, userId]
    )

    if (!existing || existing.length === 0) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      )
    }

    await executeQuery(
      'UPDATE sms_templates SET name = ?, content = ?, variables = ? WHERE id = ? AND user_id = ?',
      [name, content, variables ? JSON.stringify(variables) : null, templateId, userId]
    )

    return NextResponse.json({ 
      success: true, 
      message: 'Template updated',
      template: {
        id: templateId,
        name,
        content,
      }
    })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}
