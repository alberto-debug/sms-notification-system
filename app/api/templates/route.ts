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
      `SELECT id, name, content, variables, created_at as createdAt 
       FROM sms_templates 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [userId]
    )

    return NextResponse.json({
      templates: Array.isArray(results) ? results : [],
    })
  } catch (error) {
    console.error('Error fetching templates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, name, content, variables } = body

    if (!userId || !name || !content) {
      return NextResponse.json(
        { error: 'User ID, name, and content are required' },
        { status: 400 }
      )
    }

    const result: any = await executeQuery(
      'INSERT INTO sms_templates (user_id, name, content, variables) VALUES (?, ?, ?, ?)',
      [userId, name, content, variables ? JSON.stringify(variables) : null]
    )

    return NextResponse.json({
      template: {
        id: result.insertId,
        name,
        content,
        variables,
      },
    }, { status: 201 })
  } catch (error) {
    console.error('Error creating template:', error)
    return NextResponse.json(
      { error: 'Failed to create template' },
      { status: 500 }
    )
  }
}
