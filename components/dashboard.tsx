'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { ArrowUp, Send, CheckCircle, AlertCircle, TrendingUp, Loader } from 'lucide-react'
import { useAuth } from '@/context/auth'
import { useFetch } from '@/hooks/use-api'

interface KPI {
  title: string
  value: number
}

interface ActivityData {
  date: string
  sent: number
  delivered: number
  failed: number
}

interface GroupData {
  name: string
  value: number
}

interface DashboardStats {
  kpi: KPI[]
  activity: ActivityData[]
  groups: GroupData[]
}

export default function Dashboard() {
  const { user } = useAuth()
  const { data, isLoading } = useFetch<DashboardStats>(
    '/api/dashboard/stats',
    { userId: user?.id }
  )

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899']

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
            {data?.kpi?.map((kpi, index) => {
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
            {/* Area Chart - Activity Trends */}
            <Card className="lg:col-span-2 bg-gradient-to-br from-card/80 to-card border-0 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-card-foreground to-primary bg-clip-text text-transparent">SMS Activity Trends</CardTitle>
                <CardDescription className="text-muted-foreground">Last 7 days comprehensive analytics</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.activity && data.activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={data.activity} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 82, 91, 0.3)" vertical={false} />
                      <XAxis dataKey="date" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(26, 26, 26, 0.98)', 
                          border: '2px solid #3b82f6',
                          borderRadius: '0.75rem',
                          boxShadow: '0 20px 25px -5px rgba(59, 130, 246, 0.2)'
                        }}
                        labelStyle={{ color: '#60a5fa', fontWeight: 'bold' }}
                        itemStyle={{ color: '#f5f5f5' }}
                        cursor={{ stroke: 'rgba(59, 130, 246, 0.3)', strokeWidth: 2 }}
                        wrapperStyle={{ outline: 'none' }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        contentStyle={{ color: '#a3a3a3' }}
                      />
                      <Line type="monotone" dataKey="sent" stroke="#3b82f6" strokeWidth={3} dot={false} name="Sent" />
                      <Line type="monotone" dataKey="delivered" stroke="#10b981" strokeWidth={3} dot={false} name="Delivered" />
                      <Line type="monotone" dataKey="failed" stroke="#ef4444" strokeWidth={3} dot={false} name="Failed" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No activity data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Bar Chart - Revenue/Contact Distribution */}
            <Card className="bg-gradient-to-br from-card/80 to-card border-0 shadow-2xl overflow-hidden">
              <CardHeader>
                <CardTitle className="text-xl font-bold bg-gradient-to-r from-card-foreground to-primary bg-clip-text text-transparent">Distribution Report</CardTitle>
                <CardDescription className="text-muted-foreground">Contact group breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.groups && data.groups.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={data.groups} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                      <defs>
                        {data.groups.map((_, i) => (
                          <linearGradient key={i} id={`colorGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.9}/>
                            <stop offset="100%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3}/>
                          </linearGradient>
                        ))}
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(82, 82, 91, 0.3)" vertical={false} />
                      <XAxis dataKey="name" stroke="#a3a3a3" style={{ fontSize: '11px' }} />
                      <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(26, 26, 26, 0.98)', 
                          border: '2px solid #8b5cf6',
                          borderRadius: '0.75rem',
                          boxShadow: '0 20px 25px -5px rgba(139, 92, 246, 0.2)'
                        }}
                        labelStyle={{ color: '#d8b4fe' }}
                        cursor={{ fill: 'rgba(139, 92, 246, 0.1)' }}
                      />
                      <Bar dataKey="value" fill="url(#colorGrad0)" radius={[8, 8, 0, 0]} name="Count" />
                    </BarChart>
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
