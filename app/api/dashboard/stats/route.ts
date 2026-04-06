import { NextRequest, NextResponse } from 'next/server'
import { executeQuery } from '@/lib/db'
import { checkAccountBalance } from '@/lib/africas-talking'

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId')
    const includeBalance = request.nextUrl.searchParams.get('includeBalance') === 'true'

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      )
    }

    // Get KPI stats
    const [totalSent] = await Promise.all([
      executeQuery(
        'SELECT COUNT(*) as count FROM sms_messages WHERE user_id = ?',
        [userId]
      )
    ])

    const [delivered] = await Promise.all([
      executeQuery(
        `SELECT COUNT(*) as count FROM sms_messages WHERE user_id = ? AND status = 'delivered'`,
        [userId]
      )
    ])

    const [failed] = await Promise.all([
      executeQuery(
        `SELECT COUNT(*) as count FROM sms_messages WHERE user_id = ? AND status = 'failed'`,
        [userId]
      )
    ])

    const [pending] = await Promise.all([
      executeQuery(
        `SELECT COUNT(*) as count FROM sms_messages WHERE user_id = ? AND status = 'pending'`,
        [userId]
      )
    ])

    // Get daily activity for last 7 days
    const activityData: any = await executeQuery(
      `SELECT 
        DATE(created_at) as date,
        COUNT(*) as sent,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
      FROM sms_messages 
      WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7`,
      [userId]
    )

    // Get contact groups distribution
    const groupsData: any = await executeQuery(
      `SELECT 
        cg.name,
        COUNT(c.id) as value
      FROM contact_groups cg
      LEFT JOIN contacts c ON cg.id = c.group_id
      WHERE cg.user_id = ?
      GROUP BY cg.id, cg.name`,
      [userId]
    )

    const kpiData = [
      { title: 'Total Sent', value: (totalSent as any)[0]?.count || 0 },
      { title: 'Delivered', value: (delivered as any)[0]?.count || 0 },
      { title: 'Failed', value: (failed as any)[0]?.count || 0 },
      { title: 'Pending', value: (pending as any)[0]?.count || 0 },
    ]

    // Get Africa's Talking balance if requested
    let atBalance = null
    if (includeBalance) {
      try {
        atBalance = await checkAccountBalance()
      } catch (error) {
        console.warn('Failed to fetch Africa\'s Talking balance:', error)
        atBalance = null
      }
    }

    return NextResponse.json({
      kpi: kpiData,
      activity: Array.isArray(activityData) ? activityData : [],
      groups: Array.isArray(groupsData) ? groupsData : [],
      africasTalkingBalance: atBalance,
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
