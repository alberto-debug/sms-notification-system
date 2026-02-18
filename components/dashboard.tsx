'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { ArrowUp, Send, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react'

export default function Dashboard() {
  // Mock data
  const kpiData = [
    { title: 'Total Sent', value: '12,543', change: '+12.5%', icon: Send, color: 'bg-blue-500' },
    { title: 'Delivered', value: '11,234', change: '+8.2%', icon: CheckCircle, color: 'bg-green-500' },
    { title: 'Failed', value: '1,309', change: '-2.1%', icon: AlertCircle, color: 'bg-red-500' },
    { title: 'Pending', value: '342', change: '+5.3%', icon: TrendingUp, color: 'bg-yellow-500' },
  ]

  const chartData = [
    { date: 'Jan 1', sent: 400, delivered: 380, failed: 20 },
    { date: 'Jan 2', sent: 520, delivered: 490, failed: 30 },
    { date: 'Jan 3', sent: 480, delivered: 450, failed: 30 },
    { date: 'Jan 4', sent: 620, delivered: 590, failed: 30 },
    { date: 'Jan 5', sent: 750, delivered: 710, failed: 40 },
    { date: 'Jan 6', sent: 890, delivered: 840, failed: 50 },
    { date: 'Jan 7', sent: 1020, delivered: 960, failed: 60 },
  ]

  const categoryData = [
    { name: 'Exam Reminders', value: 35 },
    { name: 'Fee Deadlines', value: 25 },
    { name: 'Class Cancellations', value: 20 },
    { name: 'General Notices', value: 20 },
  ]

  const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899']

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Welcome back to your SMS notification system</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiData.map((kpi, index) => {
          const Icon = kpi.icon
          return (
            <Card key={index} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-card-foreground">{kpi.title}</CardTitle>
                <div className={`${kpi.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-card-foreground">{kpi.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  <span className="text-green-400">{kpi.change}</span> from last period
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <Card className="lg:col-span-2 bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">SMS Activity</CardTitle>
            <CardDescription className="text-muted-foreground">Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#a3a3a3" />
                <YAxis stroke="#a3a3a3" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#f5f5f5' }}
                />
                <Line type="monotone" dataKey="sent" stroke="#3b82f6" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="delivered" stroke="#10b981" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="failed" stroke="#ef4444" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Message Types</CardTitle>
            <CardDescription className="text-muted-foreground">Distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626', borderRadius: '0.5rem' }}
                  labelStyle={{ color: '#f5f5f5' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Recent Messages</CardTitle>
          <CardDescription className="text-muted-foreground">Latest SMS broadcasts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { type: 'Exam Reminder', recipients: '5,234', status: 'Delivered', time: '2 hours ago' },
              { type: 'Fee Deadline', recipients: '4,891', status: 'Delivered', time: '5 hours ago' },
              { type: 'Class Notice', recipients: '3,421', status: 'Delivered', time: '1 day ago' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                <div>
                  <p className="font-medium text-card-foreground">{item.type}</p>
                  <p className="text-sm text-muted-foreground">{item.recipients} recipients</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-green-400">{item.status}</p>
                  <p className="text-xs text-muted-foreground">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
