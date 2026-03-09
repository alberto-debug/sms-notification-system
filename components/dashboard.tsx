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
        return 'bg-blue-500'
      case 'Delivered':
        return 'bg-green-500'
      case 'Failed':
        return 'bg-red-500'
      case 'Pending':
        return 'bg-yellow-500'
      default:
        return 'bg-blue-500'
    }
  }


  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back, {user?.name || 'User'}</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.kpi?.map((kpi, index) => {
              const Icon = getKpiIcon(kpi.title)
              const color = getKpiColor(kpi.title)
              return (
                <Card key={index} className="bg-card border-border">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-card-foreground">{kpi.title}</CardTitle>
                    <div className={`${color} p-2 rounded-lg`}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-card-foreground">{kpi.value.toLocaleString()}</div>
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Area Chart */}
            <Card className="lg:col-span-2 bg-card border-border overflow-hidden">
              <CardHeader>
                <CardTitle className="text-card-foreground">SMS Activity</CardTitle>
                <CardDescription className="text-muted-foreground">Last 7 days activity breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.activity && data.activity.length > 0 ? (
                  <ResponsiveContainer width="100%" height={350}>
                    <AreaChart data={data.activity} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSent" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                      <XAxis dataKey="date" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'rgba(26, 26, 26, 0.95)', 
                          border: '1px solid rgba(82, 82, 91, 0.5)',
                          borderRadius: '0.5rem',
                          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                        }}
                        labelStyle={{ color: '#f5f5f5' }}
                        itemStyle={{ color: '#f5f5f5' }}
                        cursor={{ stroke: 'rgba(255, 255, 255, 0.1)', strokeWidth: 1 }}
                      />
                      <Legend 
                        wrapperStyle={{ paddingTop: '20px' }}
                        iconType="line"
                        contentStyle={{ color: '#a3a3a3' }}
                      />
                      <Area type="monotone" dataKey="sent" stroke="#3b82f6" fillOpacity={1} fill="url(#colorSent)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="delivered" stroke="#10b981" fillOpacity={1} fill="url(#colorDelivered)" strokeWidth={2} dot={false} />
                      <Area type="monotone" dataKey="failed" stroke="#ef4444" fillOpacity={1} fill="url(#colorFailed)" strokeWidth={2} dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    No activity data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Pie Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-card-foreground">Contact Groups</CardTitle>
                <CardDescription className="text-muted-foreground">Distribution</CardDescription>
              </CardHeader>
              <CardContent>
                {data?.groups && data.groups.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={data.groups}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {data.groups.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '0.5rem' }}
                        labelStyle={{ color: '#f5f5f5' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No group data available
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
