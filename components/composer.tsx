'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { AlertCircle, Send, Eye, FileText } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function Composer() {
  const [message, setMessage] = useState('Reminder: Exam scheduled for next week. Visit the portal for details.')
  const [selectedGroups, setSelectedGroups] = useState<string[]>(['students'])
  const [characterCount, setCharacterCount] = useState(message.length)

  const groups = [
    { id: 'students', label: 'All Students', count: 4234 },
    { id: 'lecturers', label: 'All Lecturers', count: 156 },
    { id: 'engineering', label: 'Engineering Dept', count: 1256 },
    { id: 'business', label: 'Business Dept', count: 892 },
    { id: 'science', label: 'Science Dept', count: 645 },
  ]

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setCharacterCount(e.target.value.length)
  }

  const toggleGroup = (id: string) => {
    setSelectedGroups(prev => 
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const smsSegments = Math.ceil(characterCount / 160)
  const totalRecipients = groups
    .filter(g => selectedGroups.includes(g.id))
    .reduce((sum, g) => sum + g.count, 0)

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compose Message</h1>
        <p className="text-muted-foreground mt-1">Write and send SMS notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Message Content</CardTitle>
              <CardDescription className="text-muted-foreground">Compose your SMS notification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Type your message here..."
                className="min-h-32 bg-secondary border-border text-foreground placeholder:text-muted-foreground resize-none"
                value={message}
                onChange={handleMessageChange}
              />
              
              <div className="flex justify-between items-center">
                <div className="flex gap-4 text-sm">
                  <span className="text-muted-foreground">Characters: <span className="text-foreground font-semibold">{characterCount}/160</span></span>
                  <span className="text-muted-foreground">SMS Parts: <span className="text-foreground font-semibold">{smsSegments}</span></span>
                </div>
                <div className="w-32 bg-secondary rounded-full h-2">
                  <div
                    className="bg-primary h-full rounded-full transition-all"
                    style={{ width: `${(characterCount / 160) * 100}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Groups */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Recipients</CardTitle>
              <CardDescription className="text-muted-foreground">Select who receives this message</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groups.map(group => (
                  <div key={group.id} className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary/50 cursor-pointer">
                    <Checkbox
                      id={group.id}
                      checked={selectedGroups.includes(group.id)}
                      onCheckedChange={() => toggleGroup(group.id)}
                      className="border-border"
                    />
                    <label
                      htmlFor={group.id}
                      className="flex-1 cursor-pointer"
                    >
                      <p className="font-medium text-foreground">{group.label}</p>
                      <p className="text-sm text-muted-foreground">{group.count} recipients</p>
                    </label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Preview Card */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-sm text-card-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary p-4 rounded-lg border border-border">
                <p className="text-sm text-foreground leading-relaxed">{message || 'Your message preview will appear here...'}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <p className="text-muted-foreground">Total Recipients:</p>
                <p className="text-2xl font-bold text-primary">{totalRecipients.toLocaleString()}</p>
              </div>

              {message.length > 160 && (
                <Alert className="bg-secondary border-border">
                  <AlertCircle className="h-4 w-4 text-yellow-500" />
                  <AlertDescription className="text-muted-foreground text-sm">
                    Message will be sent as {smsSegments} part(s). Charges apply per segment.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            <Button className="w-full bg-primary hover:bg-primary/90 gap-2" size="lg">
              <Send className="w-4 h-4" />
              Send Now
            </Button>
            <Button variant="outline" className="w-full border-border text-foreground gap-2">
              <FileText className="w-4 h-4" />
              Save as Draft
            </Button>
            <Button variant="outline" className="w-full border-border text-foreground">
              Schedule for Later
            </Button>
          </div>

          {/* Tips */}
          <Card className="bg-secondary border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold text-muted-foreground">TIPS</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-muted-foreground space-y-2">
              <p>• Keep messages under 160 characters for single SMS</p>
              <p>• Use clear, concise language</p>
              <p>• Include deadline dates when relevant</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
