'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts'
import { Send, CheckCircle, AlertCircle, TrendingUp, Loader } from 'lucide-react'
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

interface GroupData {
  name: string
  value: number
}

export default function Dashboard() {
  const { user } = useAuth()
  
  // Fetch raw messages instead of pre-calculated stats
  const { data: messagesData, isLoading: messagesLoading } = useFetch<{ messages: Message[] }>(
    '/api/messages',
    { userId: user?.id, limit: 10000 }
  )

  // Fetch contact groups separately
  const { data: groupsData, isLoading: groupsLoading } = useFetch<{ groups: any[] }>(
    '/api/contact-groups',
    { userId: user?.id }
  )

  // Calculate stats from raw message data
  const stats = useMemo(() => {
    const messages = messagesData?.messages || []
    
    const total = messages.length
    const delivered = messages.filter(m => m.status === 'delivered' || m.status === 'sent').length
    const sent = messages.filter(m => m.status === 'sent').length
    const failed = messages.filter(m => m.status === 'failed').length
    const pending = messages.filter(m => m.status === 'pending').length

    return {
      kpi: [
        { title: 'Total Sent', value: total },
        { title: 'Delivered', value: delivered },
        { title: 'Failed', value: failed },
        { title: 'Pending', value: pending },
      ],
      activity: messages.reduce((acc: any, msg) => {
        const date = new Date(msg.createdAt)
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        
        const existing = acc.find((a: any) => a.date === dateStr)
        if (existing) {
          existing.sent++
          if (msg.status === 'delivered' || msg.status === 'sent') existing.delivered++
          if (msg.status === 'failed') existing.failed++
        } else {
          acc.push({
            date: dateStr,
            sent: 1,
            delivered: (msg.status === 'delivered' || msg.status === 'sent') ? 1 : 0,
            failed: msg.status === 'failed' ? 1 : 0,
          })
        }
        return acc
      }, []).slice(-7),
    }
  }, [messagesData?.messages])

  const COLORS = [
    '#f59e0b', // amber
    '#ec4899', // pink
    '#3b82f6', // blue
    '#06b6d4', // cyan
    '#84cc16'  // lime
  ]

  const getKpiIcon = (title: string) => {
    switch (title) {
      case 'Total Sent':
        return Send
      case 'Delivered':
        return CheckCircle
      case 'Failed':
        return AlertCircle
      case 'Pending':
        return TrendingUp
      default:
        return Send
    }
  }

  const getKpiColor = (title: string) => {
    switch (title) {
      case 'Total Sent':
        return 'from-blue-500 to-cyan-500'
      case 'Delivered':
        return 'from-green-500 to-emerald-500'
      case 'Failed':
        return 'from-red-500 to-pink-500'
      case 'Pending':
        return 'from-yellow-500 to-orange-500'
      default:
        return 'from-blue-500 to-cyan-500'
    }
  }

  // Calculate totals across all activity data
  const totalSent = stats.activity?.reduce((sum: number, a: any) => sum + a.sent, 0) || 0
  const totalDelivered = stats.activity?.reduce((sum: number, a: any) => sum + a.delivered, 0) || 0
  const totalFailed = stats.activity?.reduce((sum: number, a: any) => sum + a.failed, 0) || 0
  
  // Calculate percentages based on the maximum total
  const maxActivityValue = Math.max(totalSent, totalDelivered, totalFailed) || 1
  const sentPercent = (totalSent / maxActivityValue) * 100
  const deliveredPercent = (totalDelivered / maxActivityValue) * 100
  const failedPercent = (totalFailed / maxActivityValue) * 100

  const isLoading = messagesLoading || groupsLoading

  return (
    <div className="p-8 space-y-8 bg-gradient-to-br from-background via-background to-muted/20 min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">Dashboard</h1>
        <p className="text-muted-foreground mt-2 text-lg">Welcome back, {user?.name || 'User'}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.kpi?.map((kpi, index) => {
              const Icon = getKpiIcon(kpi.title)
              const color = getKpiColor(kpi.title)
              return (
                <Card key={index} className="bg-gradient-to-br from-card/80 to-card border-0 shadow-2xl overflow-hidden group hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                    <CardTitle className="text-sm font-semibold text-card-foreground">{kpi.title}</CardTitle>
                    <div className={`bg-gradient-to-br ${color} p-3 rounded-lg shadow-lg`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-bold bg-gradient-to-r from-card-foreground to-primary bg-clip-text text-transparent">{kpi.value.toLocaleString()}</div>
                    <p className="text-xs text-muted-foreground mt-2">Total count</p>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Activity Trends - Horizontal Progress Bars */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-card/80 to-card border-0 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-card-foreground to-primary bg-clip-text text-transparent">SMS Activity Trends</CardTitle>
                <CardDescription className="text-muted-foreground">Last 7 days performance metrics</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.activity && stats.activity.length > 0 ? (
                  <div className="space-y-8">
                    {/* Sent Activity */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Messages Sent</span>
                        <span className="text-sm font-bold text-primary">{totalSent.toLocaleString()}</span>
                      </div>
                      <div className="relative h-6 bg-secondary rounded-full overflow-hidden shadow-sm group cursor-pointer">
                        <div 
                          className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full flex items-center justify-between px-3 transition-all duration-500 group-hover:shadow-md"
                          style={{ width: `${Math.max(sentPercent, 5)}%` }}
                        >
                          {sentPercent > 15 && (
                            <span className="text-xs font-medium text-white truncate">Sent</span>
                          )}
                        </div>
                        {sentPercent <= 15 && (
                          <div className="flex items-center justify-between px-3 h-full">
                            <span className="text-xs font-medium text-muted-foreground">{sentPercent.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Delivered Activity */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Successfully Delivered</span>
                        <span className="text-sm font-bold text-green-500">{totalDelivered.toLocaleString()}</span>
                      </div>
                      <div className="relative h-6 bg-secondary rounded-full overflow-hidden shadow-sm group cursor-pointer">
                        <div 
                          className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-between px-3 transition-all duration-500 group-hover:shadow-md"
                          style={{ width: `${Math.max(deliveredPercent, 5)}%` }}
                        >
                          {deliveredPercent > 15 && (
                            <span className="text-xs font-medium text-white truncate">Delivered</span>
                          )}
                        </div>
                        {deliveredPercent <= 15 && (
                          <div className="flex items-center justify-between px-3 h-full">
                            <span className="text-xs font-medium text-muted-foreground">{deliveredPercent.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Failed Activity */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-foreground">Failed Messages</span>
                        <span className="text-sm font-bold text-red-500">{totalFailed.toLocaleString()}</span>
                      </div>
                      <div className="relative h-6 bg-secondary rounded-full overflow-hidden shadow-sm group cursor-pointer">
                        <div 
                          className="h-full bg-gradient-to-r from-red-400 to-red-600 rounded-full flex items-center justify-between px-3 transition-all duration-500 group-hover:shadow-md"
                          style={{ width: `${Math.max(failedPercent, 5)}%` }}
                        >
                          {failedPercent > 15 && (
                            <span className="text-xs font-medium text-white truncate">Failed</span>
                          )}
                        </div>
                        {failedPercent <= 15 && (
                          <div className="flex items-center justify-between px-3 h-full">
                            <span className="text-xs font-medium text-muted-foreground">{failedPercent.toFixed(0)}%</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No activity data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Distribution Report - Doughnut Chart */}
            <Card className="bg-gradient-to-br from-card/80 to-card border-0 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-card-foreground to-primary bg-clip-text text-transparent">Distribution Report</CardTitle>
                <CardDescription className="text-muted-foreground">Contact group breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {groupsData?.groups && groupsData.groups.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={groupsData?.groups || []}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={true}
                      >
                        {groupsData?.groups?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
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
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No distribution data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
