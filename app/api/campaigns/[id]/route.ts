import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { cancelScheduledJob } from '@/lib/scheduler'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId, action } = body

    if (!userId || !id) {
      return NextResponse.json(
        { error: 'User ID and campaign ID are required' },
        { status: 400 }
      )
    }

    // Verify the campaign belongs to the user
    const campaign: any = await executeQuery(
      'SELECT id, status FROM sms_campaigns WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    if (action === 'cancel') {
      // Can only cancel scheduled or draft campaigns
      if (campaign[0].status === 'sent' || campaign[0].status === 'cancelled') {
        return NextResponse.json(
          { error: `Cannot cancel a ${campaign[0].status} campaign` },
          { status: 400 }
        )
      }

      await executeQuery(
        `UPDATE sms_campaigns SET status = 'cancelled' WHERE id = ? AND user_id = ?`,
        [id, userId]
      )

      // Cancel the scheduled job if it exists
      cancelScheduledJob(parseInt(id))

      return NextResponse.json({
        success: true,
        message: 'Campaign cancelled successfully',
        status: 'cancelled',
      })
    }

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error updating campaign:', error)
    return NextResponse.json(
      { error: 'Failed to update campaign' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { userId } = body

    if (!userId || !id) {
      return NextResponse.json(
        { error: 'User ID and campaign ID are required' },
        { status: 400 }
      )
    }

    // Verify the campaign belongs to the user
    const campaign: any = await executeQuery(
      'SELECT id, status FROM sms_campaigns WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    if (!campaign || campaign.length === 0) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      )
    }

    // Can only delete cancelled campaigns
    if (campaign[0].status !== 'cancelled') {
      return NextResponse.json(
        { error: 'Can only delete cancelled campaigns. Please cancel first.' },
        { status: 400 }
      )
    }

    // Delete the campaign
    await executeQuery(
      'DELETE FROM sms_campaigns WHERE id = ? AND user_id = ?',
      [id, userId]
    )

    return NextResponse.json({
      success: true,
      message: 'Campaign deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting campaign:', error)
    return NextResponse.json(
      { error: 'Failed to delete campaign' },
      { status: 500 }
    )
  }
}
