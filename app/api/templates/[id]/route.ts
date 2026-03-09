import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const templateId = parseInt(id)

    if (!templateId) {
      return NextResponse.json(
        { error: 'Template ID is required' },
        { status: 400 }
      )
    }

    await executeQuery(
      'DELETE FROM sms_templates WHERE id = ?',
      [templateId]
    )

    return NextResponse.json({ success: true })
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
    const { name, content, variables } = body

    await executeQuery(
      'UPDATE sms_templates SET name = ?, content = ?, variables = ? WHERE id = ?',
      [name, content, variables ? JSON.stringify(variables) : null, templateId]
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating template:', error)
    return NextResponse.json(
      { error: 'Failed to update template' },
      { status: 500 }
    )
  }
}
