'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, Edit, Trash2, CheckCircle, AlertCircle, Loader, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useAuth } from '@/context/auth'
import { useFetch, usePost } from '@/hooks/use-api'
import { toast } from 'sonner'

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

interface Contact {
  id: number
  name: string
  phoneNumber: string
  groupId?: number
}

interface ContactGroup {
  id: number
  name: string
}

export default function Scheduler() {
  const { user } = useAuth()
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    messageContent: '',
    scheduledAt: '',
  })
  const [targetType, setTargetType] = useState<'contacts' | 'groups'>('contacts')
  const [selectedTargets, setSelectedTargets] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const { data, isLoading, error, refetch } = useFetch<{ campaigns: Campaign[] }>(
    '/api/campaigns',
    { userId: user?.id }
  )
  const { data: contactsData } = useFetch<{ contacts: Contact[] }>(
    '/api/contacts',
    { userId: user?.id }
  )
  const { data: groupsData } = useFetch<{ groups: ContactGroup[] }>(
    '/api/contact-groups',
    { userId: user?.id }
  )
  const { post: createCampaign } = usePost('/api/campaigns')

  const filteredTargets = useMemo(() => {
    if (targetType === 'contacts') {
      if (!contactsData?.contacts) return []
      return contactsData.contacts.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phoneNumber.includes(searchTerm)
      )
    } else {
      if (!groupsData?.groups) return []
      return groupsData.groups.filter(g =>
        g.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
  }, [contactsData?.contacts, groupsData?.groups, targetType, searchTerm])

  const handleSchedule = async () => {
    if (!newCampaign.name.trim() || !newCampaign.messageContent.trim() || !newCampaign.scheduledAt) {
      toast.error('Missing Fields', {
        description: 'Please fill in campaign title, message, and date/time',
      })
      return
    }

    if (selectedTargets.length === 0) {
      toast.error('No Recipients', {
        description: `Please select at least one ${targetType === 'contacts' ? 'contact' : 'group'}`,
      })
      return
    }

    try {
      setIsCreating(true)
      await createCampaign({
        userId: user?.id,
        name: newCampaign.name,
        messageContent: newCampaign.messageContent,
        scheduledAt: newCampaign.scheduledAt,
        targetType,
        targets: selectedTargets,
      })
      setNewCampaign({ name: '', messageContent: '', scheduledAt: '' })
      setSelectedTargets([])
      setSearchTerm('')
      toast.success('Campaign Scheduled', {
        description: 'Your message has been scheduled successfully',
      })
      refetch()
    } catch (err) {
      console.error('Failed to schedule campaign:', err)
      toast.error('Scheduling Failed', {
        description: 'Could not schedule the campaign. Please try again.',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const toggleTarget = (id: number) => {
    setSelectedTargets(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  // Calculate stats from real data
  const stats = {
    scheduled: data?.campaigns?.filter(c => c.status === 'scheduled').length || 0,
    sent: data?.campaigns?.filter(c => c.status === 'sent').length || 0,
    failed: data?.campaigns?.filter(c => c.status === 'cancelled').length || 0,
  }

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
          <DialogContent className="bg-card border-border text-foreground max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-foreground">Schedule New Message</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set up an automated SMS notification
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Campaign Title</label>
                <Input
                  placeholder="e.g., Exam Reminder"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={newCampaign.name}
                  onChange={(e) => setNewCampaign({ ...newCampaign, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Message Content</label>
                <Textarea
                  placeholder="Type your message..."
                  className="bg-secondary border-border text-foreground mt-1 min-h-20"
                  value={newCampaign.messageContent}
                  onChange={(e) => setNewCampaign({ ...newCampaign, messageContent: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Send To</label>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      value="contacts"
                      checked={targetType === 'contacts'}
                      onChange={(e) => {
                        setTargetType('contacts')
                        setSelectedTargets([])
                        setSearchTerm('')
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">Individual Contacts</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="targetType"
                      value="groups"
                      checked={targetType === 'groups'}
                      onChange={(e) => {
                        setTargetType('groups')
                        setSelectedTargets([])
                        setSearchTerm('')
                      }}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-foreground">Contact Groups</span>
                  </label>
                </div>
              </div>

              {/* Recipients Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-foreground">
                    Select {targetType === 'contacts' ? 'Contacts' : 'Groups'} ({selectedTargets.length})
                  </label>
                </div>
                <Input
                  placeholder="Search..."
                  className="bg-secondary border-border text-foreground mb-2"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <div className="border border-border rounded-lg bg-secondary/50 max-h-48 overflow-y-auto p-2 space-y-2">
                  {filteredTargets.length > 0 ? (
                    filteredTargets.map(target => (
                      <div key={target.id} className="flex items-center gap-2 p-2 hover:bg-secondary rounded cursor-pointer">
                        <Checkbox
                          checked={selectedTargets.includes(target.id)}
                          onCheckedChange={() => toggleTarget(target.id)}
                          className="w-4 h-4"
                        />
                        <label className="flex-1 cursor-pointer text-sm text-foreground">
                          {('name' in target) ? target.name : target.name}
                          {targetType === 'contacts' && 'phoneNumber' in target && (
                            <span className="ml-2 text-xs text-muted-foreground">{target.phoneNumber}</span>
                          )}
                        </label>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-muted-foreground text-sm">
                      No {targetType === 'contacts' ? 'contacts' : 'groups'} found
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground">Schedule Date & Time</label>
                <Input
                  type="datetime-local"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={newCampaign.scheduledAt}
                  onChange={(e) => setNewCampaign({ ...newCampaign, scheduledAt: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleSchedule}
                disabled={isCreating}
              >
                {isCreating ? 'Scheduling...' : 'Schedule Message'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: data?.campaigns?.length || 0, icon: Clock, color: 'bg-blue-500' },
          { label: 'Pending', value: stats.scheduled, icon: Clock, color: 'bg-yellow-500' },
          { label: 'Sent', value: stats.sent, icon: CheckCircle, color: 'bg-green-500' },
          { label: 'Cancelled', value: stats.failed, icon: AlertCircle, color: 'bg-red-500' },
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
          <CardDescription className="text-muted-foreground">Manage your scheduled SMS campaigns</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : data?.campaigns && data.campaigns.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Title</TableHead>
                    <TableHead className="text-muted-foreground">Recipients</TableHead>
                    <TableHead className="text-muted-foreground">Sent/Failed</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.campaigns.map((campaign) => (
                    <TableRow key={campaign.id} className="border-border hover:bg-secondary/50">
                      <TableCell>
                        <div>
                          <p className="font-medium text-foreground">{campaign.name}</p>
                          <p className="text-xs text-muted-foreground line-clamp-1">{campaign.messageContent}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-foreground">{campaign.totalRecipients.toLocaleString()}</TableCell>
                      <TableCell className="text-foreground">
                        <span className="text-green-400">{campaign.sentCount}</span>
                        <span className="text-muted-foreground"> / </span>
                        <span className="text-red-400">{campaign.failedCount}</span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            campaign.status === 'scheduled'
                              ? 'border-blue-500 text-blue-400'
                              : campaign.status === 'sent'
                              ? 'border-green-500 text-green-400'
                              : campaign.status === 'draft'
                              ? 'border-yellow-500 text-yellow-400'
                              : 'border-red-500 text-red-400'
                          }
                        >
                          {campaign.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground text-sm">
                        {new Date(campaign.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No scheduled campaigns yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card className="bg-secondary border-border">
        <CardHeader>
          <CardTitle className="text-sm font-semibold text-foreground">Pro Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• Schedule important reminders in advance to ensure timely delivery</p>
          <p>• Scheduled messages will be sent at the specified time</p>
          <p>• Track delivery status in real-time through the dashboard</p>
        </CardContent>
      </Card>
    </div>
  )
}
