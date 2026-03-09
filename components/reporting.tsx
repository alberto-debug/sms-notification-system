'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, Filter, Calendar, TrendingUp, Loader } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/context/auth'
import { useFetch } from '@/hooks/use-api'

interface Message {
  id: number
  recipientPhone: string
  messageContent: string
  status: 'pending' | 'sent' | 'failed' | 'delivered'
  sentAt?: string
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
      filtered = filtered.filter(m => m.status === filterStatus)
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

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Message delivery and performance metrics</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2" disabled={isLoading}>
          <Download className="w-4 h-4" />
          Export Report
        </Button>
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
        {/* Delivery Trend */}
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={deliveryTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626' }}
                    labelStyle={{ color: '#f5f5f5' }}
                  />
                  <Legend />
                  <Bar dataKey="sent" fill="#3b82f6" />
                  <Bar dataKey="delivered" fill="#10b981" />
                  <Bar dataKey="failed" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Success Rate Trend */}
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
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={deliveryTrend.map(item => ({
                  date: item.date,
                  rate: item.sent > 0 ? Math.round((item.delivered / item.sent) * 100 * 10) / 10 : 0
                }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" stroke="#a3a3a3" />
                  <YAxis stroke="#a3a3a3" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626' }}
                    labelStyle={{ color: '#f5f5f5' }}
                    formatter={(value) => `${value}%`}
                  />
                  <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={true} />
                </LineChart>
              </ResponsiveContainer>
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
                          {msg.status.charAt(0).toUpperCase() + msg.status.slice(1)}
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
    </div>
  )
}
