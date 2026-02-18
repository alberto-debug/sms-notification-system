'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, Edit, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

export default function Scheduler() {
  const [scheduledMessages, setScheduledMessages] = useState([
    {
      id: 1,
      title: 'Exam Reminder',
      message: 'Exam scheduled next week. Check portal for details.',
      recipients: 4234,
      scheduledFor: '2024-02-25 09:00',
      status: 'Scheduled',
      timezone: 'EAT',
    },
    {
      id: 2,
      title: 'Fee Payment Deadline',
      message: 'School fees payment deadline is Feb 28.',
      recipients: 3456,
      scheduledFor: '2024-02-20 10:00',
      status: 'Scheduled',
      timezone: 'EAT',
    },
    {
      id: 3,
      title: 'Course Registration Open',
      message: 'Course registration is now open.',
      recipients: 4234,
      scheduledFor: '2024-02-15 08:00',
      status: 'Sent',
      timezone: 'EAT',
    },
    {
      id: 4,
      title: 'Class Cancellation Notice',
      message: 'Physics 101 class is cancelled today.',
      recipients: 567,
      scheduledFor: '2024-02-18 14:00',
      status: 'Failed',
      timezone: 'EAT',
    },
  ])

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Message Scheduler</h1>
          <p className="text-muted-foreground mt-1">Schedule SMS notifications for specific dates and times</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              Schedule Message
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Schedule New Message</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set up an automated SMS notification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Message Title</label>
                <Input placeholder="e.g., Exam Reminder" className="bg-secondary border-border text-foreground mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Message Content</label>
                <Textarea placeholder="Type your message..." className="bg-secondary border-border text-foreground mt-1 min-h-20" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Date</label>
                  <Input type="date" className="bg-secondary border-border text-foreground mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Time</label>
                  <Input type="time" className="bg-secondary border-border text-foreground mt-1" />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Timezone</label>
                <select className="w-full bg-secondary border border-border rounded-md p-2 text-foreground mt-1">
                  <option value="eat" className="bg-secondary">East Africa Time (EAT)</option>
                  <option value="cat" className="bg-secondary">Central Africa Time (CAT)</option>
                  <option value="wat" className="bg-secondary">West Africa Time (WAT)</option>
                </select>
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90">Schedule Message</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Scheduled', value: '8', icon: Clock, color: 'bg-blue-500' },
          { label: 'Pending', value: '4', icon: Clock, color: 'bg-yellow-500' },
          { label: 'Sent', value: '3', icon: CheckCircle, color: 'bg-green-500' },
          { label: 'Failed', value: '1', icon: AlertCircle, color: 'bg-red-500' },
        ].map((stat, index) => {
          const Icon = stat.icon
          return (
            <Card key={index} className="bg-card border-border">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <div className={`${stat.color} p-2 rounded-lg`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Scheduled Messages Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">Scheduled Messages</CardTitle>
          <CardDescription className="text-muted-foreground">Manage your scheduled SMS notifications</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Title</TableHead>
                  <TableHead className="text-muted-foreground">Scheduled For</TableHead>
                  <TableHead className="text-muted-foreground">Recipients</TableHead>
                  <TableHead className="text-muted-foreground">Status</TableHead>
                  <TableHead className="text-right text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scheduledMessages.map((msg) => (
                  <TableRow key={msg.id} className="border-border hover:bg-secondary/50">
                    <TableCell>
                      <div>
                        <p className="font-medium text-foreground">{msg.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{msg.message}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-foreground">
                      {msg.scheduledFor}
                      <p className="text-xs text-muted-foreground">{msg.timezone}</p>
                    </TableCell>
                    <TableCell className="text-foreground">{msg.recipients.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          msg.status === 'Scheduled'
                            ? 'border-blue-500 text-blue-400'
                            : msg.status === 'Sent'
                            ? 'border-green-500 text-green-400'
                            : 'border-red-500 text-red-400'
                        }
                      >
                        {msg.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {msg.status === 'Scheduled' && (
                        <>
                          <Button variant="ghost" size="sm" className="text-foreground hover:text-accent">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Schedule important reminders in advance to ensure timely delivery</p>
          <p>• Use timezone settings to send messages at optimal times for recipients</p>
          <p>• Scheduled messages can be edited or cancelled anytime before sending</p>
          <p>• Track delivery status in real-time through the dashboard</p>
        </CardContent>
      </Card>
    </div>
  )
}
