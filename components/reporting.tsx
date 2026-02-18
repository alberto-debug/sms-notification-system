'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Download, Filter, Calendar, TrendingUp } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function Reporting() {
  const [dateFrom, setDateFrom] = useState('2024-01-01')
  const [dateTo, setDateTo] = useState('2024-02-18')
  const [filterStatus, setFilterStatus] = useState('all')

  const deliveryData = [
    { date: 'Jan 1-7', sent: 2800, delivered: 2650, failed: 150 },
    { date: 'Jan 8-14', sent: 3200, delivered: 3040, failed: 160 },
    { date: 'Jan 15-21', sent: 2900, delivered: 2755, failed: 145 },
    { date: 'Jan 22-28', sent: 3500, delivered: 3325, failed: 175 },
    { date: 'Feb 1-7', sent: 3800, delivered: 3610, failed: 190 },
    { date: 'Feb 8-14', sent: 3400, delivered: 3230, failed: 170 },
    { date: 'Feb 15-18', sent: 1200, delivered: 1140, failed: 60 },
  ]

  const messageHistory = [
    { id: 1, type: 'Exam Reminder', sent: 4234, delivered: 4012, failed: 45, date: '2024-02-18', status: 'Delivered' },
    { id: 2, type: 'Fee Deadline', sent: 3456, delivered: 3284, failed: 89, date: '2024-02-17', status: 'Delivered' },
    { id: 3, type: 'Class Notice', sent: 2156, delivered: 2045, failed: 23, date: '2024-02-16', status: 'Delivered' },
    { id: 4, type: 'Course Registration', sent: 4234, delivered: 4012, failed: 112, date: '2024-02-15', status: 'Delivered' },
    { id: 5, type: 'General Notice', sent: 5890, delivered: 5456, failed: 234, date: '2024-02-14', status: 'Delivered' },
    { id: 6, type: 'Emergency Alert', sent: 1234, delivered: 1100, failed: 89, date: '2024-02-13', status: 'Failed' },
  ]

  const stats = [
    { label: 'Total Messages', value: '25,390', change: '+8.5%', color: 'bg-blue-500' },
    { label: 'Delivery Rate', value: '94.2%', change: '+2.1%', color: 'bg-green-500' },
    { label: 'Avg Response', value: '2.3s', change: '-0.5s', color: 'bg-cyan-500' },
    { label: 'Success Rate', value: '98.1%', change: '+1.2%', color: 'bg-purple-500' },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Message delivery and performance metrics</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90 gap-2">
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
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end">
          <Button variant="outline" className="border-border text-foreground gap-2">
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
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-foreground">{stat.value}</div>
              <p className="text-xs text-green-400 mt-1">{stat.change} from last period</p>
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
            <CardDescription className="text-muted-foreground">Weekly SMS delivery metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={deliveryData}>
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
          </CardContent>
        </Card>

        {/* Success Rate Trend */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">Success Rate</CardTitle>
            <CardDescription className="text-muted-foreground">Delivery success percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={deliveryData.map(item => ({
                date: item.date,
                rate: Math.round((item.delivered / item.sent) * 100 * 10) / 10
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="date" stroke="#a3a3a3" />
                <YAxis stroke="#a3a3a3" domain={[90, 100]} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #262626' }}
                  labelStyle={{ color: '#f5f5f5' }}
                  formatter={(value) => `${value}%`}
                />
                <Line type="monotone" dataKey="rate" stroke="#10b981" strokeWidth={3} dot={true} />
              </LineChart>
            </ResponsiveContainer>
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
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Message Type</TableHead>
                  <TableHead className="text-muted-foreground">Sent</TableHead>
                  <TableHead className="text-muted-foreground">Delivered</TableHead>
                  <TableHead className="text-muted-foreground">Failed</TableHead>
                  <TableHead className="text-muted-foreground">Date</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {messageHistory.map((msg) => (
                  <TableRow key={msg.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">{msg.type}</TableCell>
                    <TableCell className="text-foreground">{msg.sent.toLocaleString()}</TableCell>
                    <TableCell className="text-green-400">{msg.delivered.toLocaleString()}</TableCell>
                    <TableCell className="text-red-400">{msg.failed}</TableCell>
                    <TableCell className="text-foreground">{msg.date}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-green-500 text-green-400">
                        {msg.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
