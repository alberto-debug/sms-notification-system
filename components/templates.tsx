'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, Copy } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export default function Templates() {
  const [templates, setTemplates] = useState([
    {
      id: 1,
      name: 'Exam Reminder',
      category: 'Academic',
      content: 'Reminder: Your exam is scheduled for {date}. Please report 15 minutes early. Visit the portal for venue details.',
      uses: 45,
    },
    {
      id: 2,
      name: 'Fee Deadline Notice',
      category: 'Finance',
      content: 'Important: School fees payment deadline is {date}. Please complete payment to avoid penalties. Visit the portal to pay.',
      uses: 32,
    },
    {
      id: 3,
      name: 'Class Cancellation',
      category: 'Schedule',
      content: '{course} class scheduled for {date} has been cancelled. Reschedule will be announced soon.',
      uses: 18,
    },
    {
      id: 4,
      name: 'Event Announcement',
      category: 'Events',
      content: 'You are invited to {event} on {date} at {time}. Venue: {location}. RSVP on the portal.',
      uses: 25,
    },
    {
      id: 5,
      name: 'Course Registration',
      category: 'Academic',
      content: 'Course registration opens {date}. Login to portal to register. Deadline: {deadline}.',
      uses: 12,
    },
    {
      id: 6,
      name: 'General Notice',
      category: 'General',
      content: '{message}',
      uses: 67,
    },
  ])

  const categories = ['Academic', 'Finance', 'Schedule', 'Events', 'General']

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">SMS Templates</h1>
          <p className="text-muted-foreground mt-1">Save and reuse message templates</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Template</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a reusable SMS template for quick messaging
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Template Name</label>
                <Input placeholder="e.g., Exam Reminder" className="bg-secondary border-border text-foreground mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Category</label>
                <select className="w-full bg-secondary border border-border rounded-md p-2 text-foreground mt-1">
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="bg-secondary">{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Message Content</label>
                <Textarea placeholder="Type your template. Use {variable} for dynamic content." className="bg-secondary border-border text-foreground mt-1 min-h-24" />
              </div>
              <Button className="w-full bg-primary hover:bg-primary/90">Create Template</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" className="border-primary text-primary bg-primary/10">
          All Templates ({templates.length})
        </Button>
        {categories.map(cat => (
          <Button key={cat} variant="outline" className="border-border text-foreground">
            {cat}
          </Button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <Card key={template.id} className="bg-card border-border hover:border-accent/50 transition-colors">
            <CardHeader>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <CardTitle className="text-card-foreground">{template.name}</CardTitle>
                  <Badge variant="outline" className="mt-2 border-border text-muted-foreground">
                    {template.category}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground line-clamp-3 bg-secondary p-3 rounded-md">
                {template.content}
              </p>
              
              <div className="text-xs text-muted-foreground">
                Used {template.uses} times
              </div>

              <div className="flex gap-2 pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border text-foreground gap-2"
                >
                  <Copy className="w-4 h-4" />
                  Use
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-border text-foreground gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-border text-destructive hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Template Variables Help */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-sm text-foreground">Available Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
            {[
              { var: '{date}', desc: 'Date/Event date' },
              { var: '{course}', desc: 'Course name' },
              { var: '{time}', desc: 'Time' },
              { var: '{location}', desc: 'Location/Venue' },
              { var: '{event}', desc: 'Event name' },
              { var: '{deadline}', desc: 'Deadline' },
              { var: '{name}', desc: 'Recipient name' },
              { var: '{message}', desc: 'Custom message' },
            ].map(item => (
              <div key={item.var}>
                <code className="bg-card px-2 py-1 rounded text-primary text-xs font-mono">{item.var}</code>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
