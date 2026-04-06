'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { Download, Filter, Calendar, TrendingUp, Loader, MessageSquare, AlertCircle, CheckCircle } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuth } from '@/context/auth'
import { useFetch } from '@/hooks/use-api'
import { exportReportToPDF } from '@/lib/pdf-export'

interface Message {
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
}

interface Campaign {
  id: number
  name: string
  messageContent: string
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled'
  totalRecipients: number
  sentCount: number
  failedCount: number
  createdAt: string
}

export default function Reporting() {
  const { user } = useAuth()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showDeliveryStatus, setShowDeliveryStatus] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const { data: messagesData, isLoading: messagesLoading } = useFetch<{ messages: Message[] }>(
    '/api/messages',
    { userId: user?.id, limit: 1000 }
  )

  const { data: campaignData, isLoading: campaignLoading } = useFetch<{ campaigns: Campaign[] }>(
    '/api/campaigns',
    { userId: user?.id }
  )

  // Calculate statistics from real data
  const messages = messagesData?.messages || []
  const campaigns = campaignData?.campaigns || []

  const filteredMessages = useMemo(() => {
    let filtered = messages

    if (filterStatus !== 'all') {
      // When user selects "delivered", show both sent (pending delivery) and delivered (confirmed)
      if (filterStatus === 'delivered') {
        filtered = filtered.filter(m => m.status === 'delivered' || m.status === 'sent')
      } else {
        filtered = filtered.filter(m => m.status === filterStatus)
      }
    }

    if (dateFrom) {
      filtered = filtered.filter(m => new Date(m.createdAt) >= new Date(dateFrom))
    }

    if (dateTo) {
      filtered = filtered.filter(m => new Date(m.createdAt) <= new Date(dateTo))
    }

    return filtered
  }, [messages, dateFrom, dateTo, filterStatus])

  const messageStats = useMemo(() => {
    const total = filteredMessages.length
    const delivered = filteredMessages.filter(m => m.status === 'delivered' || m.status === 'sent').length
    const failed = filteredMessages.filter(m => m.status === 'failed').length
    const pending = filteredMessages.filter(m => m.status === 'pending').length

    return {
      total,
      delivered,
      failed,
      pending,
      deliveryRate: total > 0 ? Math.round((delivered / total) * 100 * 10) / 10 : 0,
      successRate: total > 0 ? Math.round(((total - failed) / total) * 100 * 10) / 10 : 0,
    }
  }, [filteredMessages])

  const campaignStats = useMemo(() => {
    const totalSent = campaigns.reduce((sum, c) => sum + c.sentCount, 0)
    const totalFailed = campaigns.reduce((sum, c) => sum + c.failedCount, 0)
    const totalCampaigns = campaigns.length

    return {
      totalCampaigns,
      totalSent,
      totalFailed,
    }
  }, [campaigns])

  // Build delivery trend data from messages grouped by date
  const deliveryTrend = useMemo(() => {
    const dateMap = new Map<string, { sent: number; delivered: number; failed: number }>()

    filteredMessages.forEach(msg => {
      const date = new Date(msg.createdAt)
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

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

    return Array.from(dateMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7) // Last 7 days
  }, [filteredMessages])

  const stats = [
    { label: 'Total Messages', value: messageStats.total.toLocaleString(), change: `${messageStats.delivered} delivered`, color: 'bg-blue-500' },
    { label: 'Delivery Rate', value: `${messageStats.deliveryRate}%`, change: `${messageStats.delivered}/${messageStats.total}`, color: 'bg-green-500' },
    { label: 'Failed Messages', value: messageStats.failed.toLocaleString(), change: `${((messageStats.failed / messageStats.total) * 100).toFixed(1)}%`, color: 'bg-red-500' },
    { label: 'Success Rate', value: `${messageStats.successRate}%`, change: `${messageStats.total - messageStats.failed}/${messageStats.total}`, color: 'bg-purple-500' },
  ]

  const isLoading = messagesLoading || campaignLoading

  const handleExportReport = async () => {
    try {
      setIsExporting(true)
      await exportReportToPDF(filteredMessages, [], dateFrom, dateTo)
    } catch (error) {
      console.error('Failed to export report:', error)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Message delivery and performance metrics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={() => setShowDeliveryStatus(true)}
            className="bg-blue-600 hover:bg-blue-700 gap-2" 
            disabled={isLoading}
          >
            <MessageSquare className="w-4 h-4" />
            Message Delivery Status
          </Button>
          <Button 
            onClick={handleExportReport}
            className="bg-primary hover:bg-primary/90 gap-2" 
            disabled={isLoading || isExporting || filteredMessages.length === 0}
          >
            {isExporting ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export Report
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground">From Date</label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="bg-secondary border-border text-foreground mt-1"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground">To Date</label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="bg-secondary border-border text-foreground mt-1"
          />
        </div>
        <div className="flex-1">
          <label className="text-sm font-medium text-muted-foreground">Status</label>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="bg-secondary border-border text-foreground mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="border-border text-foreground gap-2" disabled={isLoading}>
            <Filter className="w-4 h-4" />
            Apply
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index} className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <div className={`${stat.color} p-2 rounded-lg`}>
                {isLoading ? (
                  <Loader className="w-4 h-4 text-white animate-spin" />
                ) : (
                  <TrendingUp className="w-4 h-4 text-white" />
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{isLoading ? '-' : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{isLoading ? 'Loading...' : stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Delivery Trend - Progress Bars */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Delivery Trend</CardTitle>
            <CardDescription className="text-muted-foreground">Daily SMS delivery metrics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || deliveryTrend.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                {isLoading ? 'Loading chart data...' : 'No data available'}
              </div>
            ) : (
              <div className="space-y-8">
                {/* Sent Activity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Messages Sent</span>
                    <span className="text-lg font-bold text-primary">{deliveryTrend.reduce((sum, d) => sum + d.sent, 0).toLocaleString()}</span>
                  </div>
                  <div className="relative h-12 bg-secondary rounded-full overflow-hidden shadow-lg group cursor-pointer">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-between px-4 transition-all duration-500 group-hover:shadow-xl"
                      style={{ width: `${Math.max((deliveryTrend.reduce((sum, d) => sum + d.sent, 0) / Math.max(deliveryTrend.reduce((sum, d) => sum + d.sent, 0), deliveryTrend.reduce((sum, d) => sum + d.delivered, 0), deliveryTrend.reduce((sum, d) => sum + d.failed, 0))) * 100, 5)}%` }}
                    >
                      {(deliveryTrend.reduce((sum, d) => sum + d.sent, 0) / Math.max(deliveryTrend.reduce((sum, d) => sum + d.sent, 0), deliveryTrend.reduce((sum, d) => sum + d.delivered, 0), deliveryTrend.reduce((sum, d) => sum + d.failed, 0))) * 100 > 15 && (
                        <>
                          <span className="text-xs font-medium text-white">Total Sent</span>
                          <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Delivered Activity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Successfully Delivered</span>
                    <span className="text-lg font-bold text-green-500">{deliveryTrend.reduce((sum, d) => sum + d.delivered, 0).toLocaleString()}</span>
                  </div>
                  <div className="relative h-12 bg-secondary rounded-full overflow-hidden shadow-lg group cursor-pointer">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-between px-4 transition-all duration-500 group-hover:shadow-xl"
                      style={{ width: `${Math.max((deliveryTrend.reduce((sum, d) => sum + d.delivered, 0) / Math.max(deliveryTrend.reduce((sum, d) => sum + d.sent, 0), deliveryTrend.reduce((sum, d) => sum + d.delivered, 0), deliveryTrend.reduce((sum, d) => sum + d.failed, 0))) * 100, 5)}%` }}
                    >
                      {(deliveryTrend.reduce((sum, d) => sum + d.delivered, 0) / Math.max(deliveryTrend.reduce((sum, d) => sum + d.sent, 0), deliveryTrend.reduce((sum, d) => sum + d.delivered, 0), deliveryTrend.reduce((sum, d) => sum + d.failed, 0))) * 100 > 15 && (
                        <>
                          <span className="text-xs font-medium text-white">Delivered</span>
                          <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Failed Activity */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Failed Messages</span>
                    <span className="text-lg font-bold text-red-500">{deliveryTrend.reduce((sum, d) => sum + d.failed, 0).toLocaleString()}</span>
                  </div>
                  <div className="relative h-12 bg-secondary rounded-full overflow-hidden shadow-lg group cursor-pointer">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-between px-4 transition-all duration-500 group-hover:shadow-xl"
                      style={{ width: `${Math.max((deliveryTrend.reduce((sum, d) => sum + d.failed, 0) / Math.max(deliveryTrend.reduce((sum, d) => sum + d.sent, 0), deliveryTrend.reduce((sum, d) => sum + d.delivered, 0), deliveryTrend.reduce((sum, d) => sum + d.failed, 0))) * 100, 5)}%` }}
                    >
                      {(deliveryTrend.reduce((sum, d) => sum + d.failed, 0) / Math.max(deliveryTrend.reduce((sum, d) => sum + d.sent, 0), deliveryTrend.reduce((sum, d) => sum + d.delivered, 0), deliveryTrend.reduce((sum, d) => sum + d.failed, 0))) * 100 > 15 && (
                        <>
                          <span className="text-xs font-medium text-white">Failed</span>
                          <div className="w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                            <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Success Rate - Pie Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Success Rate</CardTitle>
            <CardDescription className="text-muted-foreground">Delivery success percentage</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || deliveryTrend.length === 0 ? (
              <div className="h-80 flex items-center justify-center text-muted-foreground">
                {isLoading ? 'Loading chart data...' : 'No data available'}
              </div>
            ) : (
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Delivered', value: deliveryTrend.reduce((sum, d) => sum + d.delivered, 0) },
                        { name: 'Failed', value: deliveryTrend.reduce((sum, d) => sum + d.failed, 0) }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={70}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                      labelLine={true}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(15, 23, 42, 0.95)', 
                        border: '1px solid rgba(148, 163, 184, 0.3)',
                        borderRadius: '0.75rem',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                        padding: '12px'
                      }}
                      labelStyle={{ color: '#e2e8f0', fontWeight: 'bold', marginBottom: '8px' }}
                      itemStyle={{ color: '#f5f5f5', padding: '4px 0' }}
                      formatter={(value) => [value.toLocaleString(), 'Count']}
                      wrapperStyle={{ outline: 'none' }}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Message History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Message History</CardTitle>
          <CardDescription className="text-muted-foreground">All sent messages and delivery status</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No messages found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Recipient</TableHead>
                    <TableHead className="text-muted-foreground">Message</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMessages.slice(0, 10).map((msg) => (
                    <TableRow key={msg.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium text-foreground">{msg.recipientPhone}</TableCell>
                      <TableCell className="text-foreground text-sm truncate max-w-xs">{msg.messageContent}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          msg.status === 'delivered' || msg.status === 'sent'
                            ? 'border-green-500 text-green-400'
                            : msg.status === 'failed'
                            ? 'border-red-500 text-red-400'
                            : 'border-yellow-500 text-yellow-400'
                        }>
                          {(msg.status === 'delivered' || msg.status === 'sent') ? 'Delivered' : msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {new Date(msg.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {filteredMessages.length > 10 && (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  Showing 10 of {filteredMessages.length} messages
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delivery Status Dialog */}
      <Dialog open={showDeliveryStatus} onOpenChange={setShowDeliveryStatus}>
        <DialogContent className="bg-card border-border flex flex-col" style={{ width: '90vw', maxWidth: '1400px', height: '90vh' }}>
          <DialogHeader>
            <DialogTitle>Message Delivery Status</DialogTitle>
            <DialogDescription>
              View all sent messages with their delivery status and failure reasons from Africa's Talking
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto flex-1 border border-border rounded bg-secondary/30">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="text-foreground">Phone Number</TableHead>
                  <TableHead className="text-foreground">Status</TableHead>
                  <TableHead className="text-foreground">Network</TableHead>
                  <TableHead className="text-foreground">Failure Reason</TableHead>
                  <TableHead className="text-foreground">Sent At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.length > 0 ? (
                  filteredMessages.map(msg => (
                    <TableRow key={msg.id} className="hover:bg-secondary/50">
                      <TableCell className="font-mono text-sm text-foreground">{msg.recipientPhone}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            msg.status === 'delivered' || msg.status === 'sent'
                              ? 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-300'
                              : msg.status === 'failed'
                              ? 'bg-red-500/20 text-red-700 dark:text-red-400 border-red-300'
                              : 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-300'
                          }
                        >
                          {(msg.status === 'delivered' || msg.status === 'sent') && <CheckCircle className="w-3 h-3 inline mr-1" />}
                          {msg.status === 'failed' && <AlertCircle className="w-3 h-3 inline mr-1" />}
                          {(msg.status === 'delivered' || msg.status === 'sent') ? 'Delivered' : msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {msg.networkCode ? (
                          <span className="px-2 py-1 bg-secondary rounded text-xs">{msg.networkCode}</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {msg.failureReason ? (
                          <span className="text-red-600 dark:text-red-400 font-medium">
                            {msg.failureReason}
                          </span>
                        ) : msg.status === 'delivered' ? (
                          <span className="text-green-600 dark:text-green-400">✓ Delivered</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {msg.sentAt 
                          ? new Date(msg.sentAt).toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : new Date(msg.createdAt).toLocaleString('en-US', {
                              month: '2-digit',
                              day: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                        }
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      No messages found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
