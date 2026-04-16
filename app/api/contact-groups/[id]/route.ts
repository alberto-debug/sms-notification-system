import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const groupId = parseInt(id)

    if (!groupId) {
      return NextResponse.json(
        { error: 'Group ID is required' },
        { status: 400 }
      )
    }

    // Delete the group
    await executeQuery(
      'DELETE FROM contact_groups WHERE id = ?',
      [groupId]
    )

    return NextResponse.json({
      success: true,
      message: 'Group deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting group:', error)
    return NextResponse.json(
      { error: 'Failed to delete group' },
      { status: 500 }
    )
  }
}
