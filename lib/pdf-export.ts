import jsPDF from 'jspdf'

export interface Message {
  id: number
  recipientPhone: string
  messageContent: string
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  failureReason?: string
  networkCode?: string
  sentAt?: string
  deliveredAt?: string
  errorMessage?: string
  createdAt: string
  contactGroupId?: number
}

export interface GroupStats {
  groupId: number
  groupName: string
  total: number
  delivered: number
  failed: number
  pending: number
  deliveryRate: number
  successRate: number
}

// Color constants
const PRIMARY_COLOR_RGB = [26, 35, 126] as const // #1a237e - ANU Blue
const SUCCESS_COLOR_RGB = [76, 175, 80] as const // #4caf50
const ERROR_COLOR_RGB = [244, 67, 54] as const // #f44336
const WARNING_COLOR_RGB = [255, 152, 0] as const // #ff9800
const LIGHT_GRAY_RGB = [240, 242, 245] as const
const DARK_TEXT_RGB = [44, 62, 80] as const
const MUTE_TEXT_RGB = [144, 164, 174] as const

function generateGroupStats(messages: Message[], groups: any[]): GroupStats[] {
  const groupMap = new Map<number, Message[]>()

  groups.forEach(group => {
    groupMap.set(group.id, messages.filter(m => m.contactGroupId === group.id))
  })

  return Array.from(groupMap.entries()).map(([groupId, msgs]) => {
    const group = groups.find(g => g.id === groupId)
    const total = msgs.length
    const delivered = msgs.filter(m => m.status === 'delivered' || m.status === 'sent').length
    const failed = msgs.filter(m => m.status === 'failed').length
    const pending = msgs.filter(m => m.status === 'pending').length

    return {
      groupId,
      groupName: group?.name || `Group ${groupId}`,
      total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100 * 10) / 10 : 0,
      successRate: total > 0 ? Math.round(((total - failed) / total) * 100 * 10) / 10 : 0,
    }
  })
}

function addHeader(doc: jsPDF, pageNumber: number, totalPages: number) {
  const width = 210
  const margin = 15

  // Header background
  doc.setFillColor(LIGHT_GRAY_RGB[0], LIGHT_GRAY_RGB[1], LIGHT_GRAY_RGB[2])
  doc.rect(0, 0, width, 35, 'F')

  // Left side - Logo text
  doc.setTextColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('ANU SMS Campaign Analytics', margin, 12)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(MUTE_TEXT_RGB[0], MUTE_TEXT_RGB[1], MUTE_TEXT_RGB[2])
  doc.text('Africa Nazarene University', margin, 19)

  // Right side - Page number
  doc.setFontSize(8)
  doc.setTextColor(MUTE_TEXT_RGB[0], MUTE_TEXT_RGB[1], MUTE_TEXT_RGB[2])
  doc.text(`Page ${pageNumber} of ${totalPages}`, width - margin - 25, 12)

  // Bottom line
  doc.setDrawColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
  doc.setLineWidth(0.5)
  doc.line(0, 35, width, 35)
}

function addFooter(doc: jsPDF) {
  const width = 210
  const height = 297
  const margin = 15

  // Footer line
  doc.setDrawColor(LIGHT_GRAY_RGB[0], LIGHT_GRAY_RGB[1], LIGHT_GRAY_RGB[2])
  doc.setLineWidth(0.5)
  doc.line(margin, height - 10, width - margin, height - 10)

  // Footer text
  doc.setFontSize(7)
  doc.setTextColor(MUTE_TEXT_RGB[0], MUTE_TEXT_RGB[1], MUTE_TEXT_RGB[2])
  doc.text('Africa Nazarene University SMS Notification System', margin, height - 5)
  doc.text(`Generated: ${new Date().toLocaleString()}`, width - margin - 70, height - 5)
}

function drawStatBox(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  label: string,
  value: string | number,
  color: readonly [number, number, number]
) {
  const height = 25

  // Box background
  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(220, 220, 220)
  doc.setLineWidth(0.5)
  doc.rect(x, y, width, height, 'FD')

  // Color bar on left
  doc.setFillColor(color[0], color[1], color[2])
  doc.rect(x, y, 2, height, 'F')

  // Label
  doc.setFontSize(8)
  doc.setTextColor(MUTE_TEXT_RGB[0], MUTE_TEXT_RGB[1], MUTE_TEXT_RGB[2])
  doc.setFont('helvetica', 'normal')
  doc.text(label, x + 4, y + 6)

  // Value
  doc.setFontSize(14)
  doc.setTextColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
  doc.setFont('helvetica', 'bold')
  doc.text(String(value), x + 4, y + 17)
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  const margin = 15

  doc.setFontSize(11)
  doc.setTextColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
  doc.setFont('helvetica', 'bold')
  doc.text(title, margin, y)

  // Underline
  doc.setDrawColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
  doc.setLineWidth(0.8)
  doc.line(margin, y + 1.5, 195 - margin, y + 1.5)

  return y + 6
}

export async function generatePDFReport(
  messages: Message[],
  groups: any[] = [],
  dateFrom?: string,
  dateTo?: string
): Promise<void> {
  try {
    // Calculate overall statistics
    const totalMessages = messages.length
    const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'sent').length
    const failed = messages.filter(m => m.status === 'failed').length
    const pending = messages.filter(m => m.status === 'pending').length
    const deliveryRate = totalMessages > 0 ? Math.round((delivered / totalMessages) * 100 * 10) / 10 : 0
    const successRate = totalMessages > 0 ? Math.round(((totalMessages - failed) / totalMessages) * 100 * 10) / 10 : 0
    const failureRate = totalMessages > 0 ? Math.round((failed / totalMessages) * 100 * 10) / 10 : 0

    // Group statistics
    const groupStats = generateGroupStats(messages, groups)

    // Daily trends
    const dateMap = new Map<string, { sent: number; delivered: number; failed: number }>()
    messages.forEach(msg => {
      const date = new Date(msg.createdAt)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })

      if (!dateMap.has(dateStr)) {
        dateMap.set(dateStr, { sent: 0, delivered: 0, failed: 0 })
      }

      const data = dateMap.get(dateStr)!
      data.sent++
      if (msg.status === 'delivered' || msg.status === 'sent') {
        data.delivered++
      } else if (msg.status === 'failed') {
        data.failed++
      }
    })

    const dailyTrends = Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Get failure reasons
    const failureReasons = new Map<string, number>()
    messages
      .filter(m => m.status === 'failed' && m.failureReason)
      .forEach(msg => {
        const reason = msg.failureReason!
        failureReasons.set(reason, (failureReasons.get(reason) || 0) + 1)
      })

    // Create PDF document
    const doc = new jsPDF('p', 'mm', 'a4')
    const width = 210
    const height = 297
    const margin = 15
    let currentY = 40
    let pageNum = 1

    // Page 1: Title and Summary
    addHeader(doc, pageNum, 1)

    // Title section
    doc.setFontSize(22)
    doc.setTextColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
    doc.setFont('helvetica', 'bold')
    doc.text('SMS Campaign Analytics', margin, currentY)

    currentY += 8

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(MUTE_TEXT_RGB[0], MUTE_TEXT_RGB[1], MUTE_TEXT_RGB[2])
    const generatedDate = new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    doc.text(`Report Generated: ${generatedDate}`, margin, currentY)

    if (dateFrom || dateTo) {
      currentY += 5
      const fromText = dateFrom ? new Date(dateFrom).toLocaleDateString() : 'N/A'
      const toText = dateTo ? new Date(dateTo).toLocaleDateString() : 'N/A'
      doc.text(`Report Period: ${fromText} to ${toText}`, margin, currentY)
    }

    currentY += 10

    // Executive Summary section
    currentY = drawSectionTitle(doc, 'Executive Summary', currentY)
    currentY += 3

    // Summary stats in grid
    const boxWidth = (width - margin * 2 - 9) / 4
    drawStatBox(doc, margin, currentY, boxWidth, 'Total Messages', totalMessages.toLocaleString(), [52, 152, 219] as const)
    drawStatBox(doc, margin + boxWidth + 3, currentY, boxWidth, 'Delivery Rate', `${deliveryRate}%`, SUCCESS_COLOR_RGB)
    drawStatBox(doc, margin + (boxWidth + 3) * 2, currentY, boxWidth, 'Success Rate', `${successRate}%`, [155, 89, 182] as const)
    drawStatBox(doc, margin + (boxWidth + 3) * 3, currentY, boxWidth, 'Failure Rate', `${failureRate}%`, ERROR_COLOR_RGB)

    currentY += 32

    // Overall statistics table
    currentY = drawSectionTitle(doc, 'Message Delivery Status', currentY)
    currentY += 2

    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.setFillColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
    doc.rect(margin, currentY, 180, 6, 'F')
    doc.text('Status', margin + 2, currentY + 4)
    doc.text('Count', margin + 50, currentY + 4)
    doc.text('Percentage', margin + 90, currentY + 4)
    doc.text('Details', margin + 130, currentY + 4)
    currentY += 6

    const statsRows = [
      ['Delivered', delivered.toLocaleString(), `${deliveryRate}%`, `${delivered}/${totalMessages}`],
      ['Failed', failed.toLocaleString(), `${failureRate}%`, `${failed}/${totalMessages}`],
      ['Pending', pending.toLocaleString(), `${((pending / totalMessages) * 100).toFixed(1)}%`, `${pending}/${totalMessages}`],
    ]

    doc.setFont('helvetica', 'normal')
    doc.setTextColor(DARK_TEXT_RGB[0], DARK_TEXT_RGB[1], DARK_TEXT_RGB[2])
    doc.setFontSize(7)

    statsRows.forEach((row, idx) => {
      if (idx % 2 === 0) {
        doc.setFillColor(LIGHT_GRAY_RGB[0], LIGHT_GRAY_RGB[1], LIGHT_GRAY_RGB[2])
        doc.rect(margin, currentY, 180, 5, 'F')
      }
      doc.setDrawColor(220, 220, 220)
      doc.rect(margin, currentY, 180, 5)
      doc.text(row[0], margin + 2, currentY + 3.5)
      doc.text(row[1], margin + 50, currentY + 3.5)
      doc.text(row[2], margin + 90, currentY + 3.5)
      doc.text(row[3], margin + 130, currentY + 3.5)
      currentY += 5
    })

    currentY += 3

    // Add group statistics if available
    if (groupStats.length > 0) {
      doc.addPage()
      pageNum++
      addHeader(doc, pageNum, 1)

      currentY = 40
      // Performance by Contact Group section
      currentY = drawSectionTitle(doc, 'Performance by Contact Group', currentY)
      currentY += 2

      // Draw table header for groups
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
      doc.rect(margin, currentY, 180, 5, 'F')
      doc.text('Group', margin + 2, currentY + 3.5, { maxWidth: 40 })
      doc.text('Total', margin + 45, currentY + 3.5, { maxWidth: 15, align: 'center' })
      doc.text('Delivered', margin + 65, currentY + 3.5, { maxWidth: 15, align: 'center' })
      doc.text('Failed', margin + 85, currentY + 3.5, { maxWidth: 15, align: 'center' })
      doc.text('DelRate %', margin + 105, currentY + 3.5, { maxWidth: 15, align: 'center' })
      doc.text('Success %', margin + 130, currentY + 3.5, { maxWidth: 15, align: 'center' })
      currentY += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(DARK_TEXT_RGB[0], DARK_TEXT_RGB[1], DARK_TEXT_RGB[2])
      doc.setFontSize(6)

      groupStats.forEach((stat, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(LIGHT_GRAY_RGB[0], LIGHT_GRAY_RGB[1], LIGHT_GRAY_RGB[2])
          doc.rect(margin, currentY, 180, 4, 'F')
        }
        doc.setDrawColor(220, 220, 220)
        doc.rect(margin, currentY, 180, 4)
        doc.text(stat.groupName.substring(0, 20), margin + 2, currentY + 3)
        doc.text(stat.total.toString(), margin + 50, currentY + 3)
        doc.text(stat.delivered.toString(), margin + 70, currentY + 3)
        doc.text(stat.failed.toString(), margin + 90, currentY + 3)
        doc.text(`${stat.deliveryRate}%`, margin + 110, currentY + 3)
        doc.text(`${stat.successRate}%`, margin + 135, currentY + 3)
        currentY += 4
      })

      addFooter(doc)
    }

    // Add daily trends if available
    if (dailyTrends.length > 0) {
      doc.addPage()
      pageNum++
      addHeader(doc, pageNum, 1)

      currentY = 40
      currentY = drawSectionTitle(doc, 'Daily Delivery Trends', currentY)
      currentY += 2

      // Draw table header for trends
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(PRIMARY_COLOR_RGB[0], PRIMARY_COLOR_RGB[1], PRIMARY_COLOR_RGB[2])
      doc.rect(margin, currentY, 180, 5, 'F')
      doc.text('Date', margin + 2, currentY + 3.5)
      doc.text('Sent', margin + 35, currentY + 3.5, { align: 'center' })
      doc.text('Delivered', margin + 65, currentY + 3.5, { align: 'center' })
      doc.text('Failed', margin + 100, currentY + 3.5, { align: 'center' })
      doc.text('Rate %', margin + 135, currentY + 3.5, { align: 'center' })
      currentY += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(DARK_TEXT_RGB[0], DARK_TEXT_RGB[1], DARK_TEXT_RGB[2])
      doc.setFontSize(7)

      dailyTrends.forEach((trend, idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(LIGHT_GRAY_RGB[0], LIGHT_GRAY_RGB[1], LIGHT_GRAY_RGB[2])
          doc.rect(margin, currentY, 180, 4, 'F')
        }
        doc.setDrawColor(220, 220, 220)
        doc.rect(margin, currentY, 180, 4)
        doc.text(trend.date, margin + 2, currentY + 3)
        doc.text(trend.sent.toString(), margin + 40, currentY + 3)
        doc.text(trend.delivered.toString(), margin + 70, currentY + 3)
        doc.text(trend.failed.toString(), margin + 105, currentY + 3)
        doc.text(`${((trend.delivered / trend.sent) * 100).toFixed(1)}%`, margin + 138, currentY + 3)
        currentY += 4
      })

      addFooter(doc)
    }

    // Add failure analysis if available
    if (failureReasons.size > 0) {
      doc.addPage()
      pageNum++
      addHeader(doc, pageNum, 1)

      currentY = 40
      currentY = drawSectionTitle(doc, 'Failure Analysis', currentY)
      currentY += 2

      const topReasons = Array.from(failureReasons.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)

      // Draw table header for failures
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(255, 255, 255)
      doc.setFillColor(ERROR_COLOR_RGB[0], ERROR_COLOR_RGB[1], ERROR_COLOR_RGB[2])
      doc.rect(margin, currentY, 180, 5, 'F')
      doc.text('Failure Reason', margin + 2, currentY + 3.5, { maxWidth: 100 })
      doc.text('Count', margin + 110, currentY + 3.5, { align: 'center' })
      doc.text('%', margin + 145, currentY + 3.5, { align: 'center' })
      currentY += 5

      doc.setFont('helvetica', 'normal')
      doc.setTextColor(DARK_TEXT_RGB[0], DARK_TEXT_RGB[1], DARK_TEXT_RGB[2])
      doc.setFontSize(6)

      topReasons.forEach(([reason, count], idx) => {
        if (idx % 2 === 0) {
          doc.setFillColor(255, 245, 245)
          doc.rect(margin, currentY, 180, 4, 'F')
        }
        doc.setDrawColor(220, 220, 220)
        doc.rect(margin, currentY, 180, 4)
        doc.text(reason.substring(0, 50), margin + 2, currentY + 3, { maxWidth: 105 })
        doc.text(count.toString(), margin + 115, currentY + 3)
        doc.text(`${((count / failed) * 100).toFixed(1)}%`, margin + 148, currentY + 3)
        currentY += 4
      })

      addFooter(doc)
    }

    // Add footer to first page if not already added
    if (groupStats.length === 0 && dailyTrends.length === 0 && failureReasons.size === 0) {
      doc.setPage(1)
      addFooter(doc)
    }

    // Save the PDF
    const filename = `ANU_SMS_Report_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(filename)
  } catch (error) {
    console.error('Error generating PDF:', error)
    throw error
  }
}

export async function exportReportToPDF(
  messages: Message[],
  groups?: any[],
  dateFrom?: string,
  dateTo?: string
): Promise<void> {
  await generatePDFReport(messages, groups || [], dateFrom, dateTo)
}



