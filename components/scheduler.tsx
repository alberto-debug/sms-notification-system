'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Clock, Edit, Trash2, CheckCircle, AlertCircle, Loader, Search, X, Users } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { useAuth } from '@/context/auth'
import { useFetch, usePost } from '@/hooks/use-api'
import { toast } from 'sonner'

// Fix for native date/time inputs styling

interface Campaign {
  id: number
  name: string
  messageContent: string
  status: 'draft' | 'scheduled' | 'sent' | 'cancelled'
  totalRecipients: number
  sentCount: number
  failedCount: number
  scheduledAt: string | null
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
  const isSubmittingRef = useRef(false)
  
  // Initialize with current date and time PLUS 1 minute (to ensure it's always valid)
  const getCurrentDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 1) // Add 1 minute to ensure it's in the future
    
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    
    return `${year}-${month}-${day}T${hours}:${minutes}` // Format: YYYY-MM-DDTHH:mm using local timezone
  }

  const [newCampaign, setNewCampaign] = useState({
    name: '',
    messageContent: '',
    scheduledAt: getCurrentDateTime(),
  })
  const [targetType, setTargetType] = useState<'contacts' | 'groups'>('contacts')
  const [selectedTargets, setSelectedTargets] = useState<number[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [showContactsModal, setShowContactsModal] = useState(false)
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [validationErrors, setValidationErrors] = useState<{
    name?: boolean
    messageContent?: boolean
    scheduledAt?: boolean
    recipients?: boolean
  }>({
    scheduledAt: false // Initialize as false (valid)
  })
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

  const filteredContacts = useMemo(() => {
    if (!contactsData?.contacts) return []
    return contactsData.contacts.filter(c =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phoneNumber.includes(searchTerm)
    )
  }, [contactsData?.contacts, searchTerm])

  const filteredGroups = useMemo(() => {
    if (!groupsData?.groups) return []
    return groupsData.groups.filter(g =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [groupsData?.groups, searchTerm])

  const handleSchedule = async () => {
    // Prevent multiple submissions with ref lock
    if (isSubmittingRef.current || isCreating) {
      console.log('Submission already in progress')
      return
    }
    
    isSubmittingRef.current = true
    
    try {
      const errors: typeof validationErrors = {}
      
      // Only validate if fields are empty
      if (!newCampaign.name.trim()) errors.name = true
      if (!newCampaign.messageContent.trim()) errors.messageContent = true
      if (!newCampaign.scheduledAt) errors.scheduledAt = true
      if (selectedTargets.length === 0) errors.recipients = true
      
      // Validate time is not in the past
      if (newCampaign.scheduledAt && !errors.scheduledAt) {
        // Parse date and time correctly in local timezone
        const [dateStr, timeStr] = newCampaign.scheduledAt.split('T')
        const [year, month, day] = dateStr.split('-')
        const [hours, minutes] = timeStr.split(':')
        
        const scheduledDate = new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          parseInt(hours),
          parseInt(minutes),
          0
        )
        
        const now = new Date()
        
        if (scheduledDate <= now) {
          errors.scheduledAt = true
          toast.error('Invalid Schedule Time', {
            description: 'Cannot schedule for a past time. Please select a future time.',
          })
          setValidationErrors(errors)
          return
        }
      }
      
      setValidationErrors(errors)
      
      // If there are errors, show toast but button stays active
      if (Object.keys(errors).length > 0) {
        toast.error('Missing Fields', {
          description: 'Please fill in all required fields marked in red',
        })
        return
      }

      setIsCreating(true)
      await createCampaign({
        userId: user?.id,
        name: newCampaign.name,
        messageContent: newCampaign.messageContent,
        scheduledAt: newCampaign.scheduledAt,
        targetType,
        targets: selectedTargets,
      })
      setNewCampaign({ name: '', messageContent: '', scheduledAt: getCurrentDateTime() })
      setSelectedTargets([])
      setSearchTerm('')
      setValidationErrors({})
      setDialogOpen(false)
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
      isSubmittingRef.current = false
    }
  }

  const toggleTarget = (id: number) => {
    setSelectedTargets(prev => {
      const updated = prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
      setValidationErrors(prevErrors => ({ ...prevErrors, recipients: updated.length === 0 }))
      return updated
    })
  }

  const handleCancelCampaign = async (campaignId: number) => {
    try {
      setCancellingId(campaignId)
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          action: 'cancel',
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to cancel campaign')
      }

      toast.success('Campaign Cancelled', {
        description: 'The campaign has been cancelled successfully',
      })
      refetch()
    } catch (error) {
      console.error('Error cancelling campaign:', error)
      toast.error('Cannot Cancel', {
        description: error instanceof Error ? error.message : 'Failed to cancel campaign',
      })
    } finally {
      setCancellingId(null)
    }
  }

  const handleDeleteCampaign = async (campaignId: number) => {
    try {
      setDeletingId(campaignId)
      const response = await fetch(`/api/campaigns/${campaignId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete campaign')
      }

      toast.success('Campaign Deleted', {
        description: 'The campaign has been permanently deleted',
      })
      refetch()
    } catch (error) {
      console.error('Error deleting campaign:', error)
      toast.error('Cannot Delete', {
        description: error instanceof Error ? error.message : 'Failed to delete campaign',
      })
    } finally {
      setDeletingId(null)
    }
  }

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
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (open) {
            // Reset form with current date/time when opening
            setNewCampaign({
              name: '',
              messageContent: '',
              scheduledAt: getCurrentDateTime(),
            })
            setSelectedTargets([])
            setSearchTerm('')
            setValidationErrors({ scheduledAt: false, name: false, messageContent: false, recipients: false })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              Schedule Message
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground w-full max-w-5xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl text-foreground">Schedule New Message</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Set up an automated SMS notification for your contacts
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              {/* Campaign Title */}
              <div>
                <label className="text-sm font-medium text-foreground">Campaign Title *</label>
                <Input
                  placeholder="e.g., Exam Reminder, Important Notice"
                  className={`bg-secondary text-foreground mt-2 h-10 ${
                    validationErrors.name ? 'border-red-500 border-2' : 'border-border'
                  }`}
                  value={newCampaign.name}
                  onChange={(e) => {
                    setNewCampaign({ ...newCampaign, name: e.target.value })
                    setValidationErrors(prev => ({ ...prev, name: !e.target.value.trim() }))
                  }}
                />
              </div>

              {/* Message Content */}
              <div>
                <label className="text-sm font-medium text-foreground">Message Content *</label>
                <Textarea
                  placeholder="Type your message here. Keep it clear and concise..."
                  className={`bg-secondary text-foreground mt-2 min-h-24 resize-none ${
                    validationErrors.messageContent ? 'border-red-500 border-2' : 'border-border'
                  }`}
                  value={newCampaign.messageContent}
                  onChange={(e) => {
                    setNewCampaign({ ...newCampaign, messageContent: e.target.value })
                    setValidationErrors(prev => ({ ...prev, messageContent: !e.target.value.trim() }))
                  }}
                />
                <p className="text-xs text-muted-foreground mt-1">Character count: {newCampaign.messageContent.length}</p>
              </div>

              {/* Recipients Selection */}
              <div>
                <label className={`text-sm font-medium block mb-3 ${
                  validationErrors.recipients ? 'text-red-500' : 'text-foreground'
                }`}>
                  Select Recipients * {validationErrors.recipients && <span className="text-red-500 font-bold">Required</span>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <Dialog open={showContactsModal} onOpenChange={setShowContactsModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className={`h-24 flex flex-col items-center justify-center gap-2 font-semibold text-white ${
                          targetType === 'contacts' && selectedTargets.length > 0
                            ? 'bg-blue-600 hover:bg-blue-700'
                            : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                      >
                        <Users className="w-6 h-6" />
                        <span className="text-sm font-bold">Select Contacts</span>
                        {targetType === 'contacts' && selectedTargets.length > 0 && (
                          <span className="text-xs bg-white text-blue-600 px-2 py-1 rounded">{selectedTargets.length} selected</span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border text-foreground max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Select Contacts ({selectedTargets.length})</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input
                          placeholder="Search contacts by name or phone..."
                          className="bg-secondary border-border text-foreground"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="border border-border rounded-lg bg-secondary/50 max-h-96 overflow-y-auto p-3 space-y-2">
                          {contactsData?.contacts && contactsData.contacts.length > 0 ? (
                            filteredContacts.map(contact => (
                              <div key={contact.id} className="flex items-center gap-2 p-2 hover:bg-secondary rounded">
                                <Checkbox
                                  checked={selectedTargets.includes(contact.id)}
                                  onCheckedChange={() => toggleTarget(contact.id)}
                                  className="w-4 h-4"
                                />
                                <label className="flex-1 cursor-pointer text-sm">
                                  <p className="font-medium">{contact.name}</p>
                                  <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No contacts found
                            </div>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setTargetType('contacts')
                          setShowContactsModal(false)
                        }}
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={selectedTargets.length === 0}
                      >
                        Confirm ({selectedTargets.length} contacts)
                      </Button>
                    </DialogContent>
                  </Dialog>

                  <Dialog open={showGroupsModal} onOpenChange={setShowGroupsModal}>
                    <DialogTrigger asChild>
                      <Button 
                        className={`h-24 flex flex-col items-center justify-center gap-2 font-semibold text-white ${
                          targetType === 'groups' && selectedTargets.length > 0
                            ? 'bg-purple-600 hover:bg-purple-700'
                            : 'bg-purple-500 hover:bg-purple-600'
                        }`}
                      >
                        <Users className="w-6 h-6" />
                        <span className="text-sm font-bold">Select Groups</span>
                        {targetType === 'groups' && selectedTargets.length > 0 && (
                          <span className="text-xs bg-white text-purple-600 px-2 py-1 rounded">{selectedTargets.length} selected</span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bg-card border-border text-foreground max-w-lg">
                      <DialogHeader>
                        <DialogTitle>Select Groups ({selectedTargets.length})</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        <Input
                          placeholder="Search groups..."
                          className="bg-secondary border-border text-foreground"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <div className="border border-border rounded-lg bg-secondary/50 max-h-96 overflow-y-auto p-3 space-y-2">
                          {groupsData?.groups && groupsData.groups.length > 0 ? (
                            filteredGroups.map(group => (
                              <div key={group.id} className="flex items-center gap-2 p-2 hover:bg-secondary rounded">
                                <Checkbox
                                  checked={selectedTargets.includes(group.id)}
                                  onCheckedChange={() => toggleTarget(group.id)}
                                  className="w-4 h-4"
                                />
                                <label className="flex-1 cursor-pointer text-sm font-medium">
                                  {group.name}
                                </label>
                              </div>
                            ))
                          ) : (
                            <div className="text-center py-8 text-muted-foreground">
                              No groups found
                            </div>
                          )}
                        </div>
                      </div>
                      <Button 
                        onClick={() => {
                          setTargetType('groups')
                          setShowGroupsModal(false)
                        }}
                        className="w-full bg-primary hover:bg-primary/90"
                        disabled={selectedTargets.length === 0}
                      >
                        Confirm ({selectedTargets.length} groups)
                      </Button>
                    </DialogContent>
                  </Dialog>
                </div>
                {selectedTargets.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ✅ {selectedTargets.length} {targetType === 'contacts' ? 'contact(s)' : 'group(s)'} selected
                  </p>
                )}
              </div>

              {/* Schedule Date & Time - MODERN PICKER */}
              <div>
                <label className={`text-sm font-medium block mb-3 ${
                  validationErrors.scheduledAt ? 'text-red-500' : 'text-foreground'
                }`}>
                  Schedule Date & Time * {validationErrors.scheduledAt && <span className="text-red-500 font-bold text-xs">Required</span>}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <input
                      type="date"
                      className={`w-full px-3 py-2.5 bg-secondary text-foreground border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        validationErrors.scheduledAt ? 'border-red-500' : 'border-border'
                      }`}
                      min={(() => {
                        const today = new Date()
                        const year = today.getFullYear()
                        const month = String(today.getMonth() + 1).padStart(2, '0')
                        const day = String(today.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()}
                      value={newCampaign.scheduledAt ? newCampaign.scheduledAt.split('T')[0] : (() => {
                        const today = new Date()
                        const year = today.getFullYear()
                        const month = String(today.getMonth() + 1).padStart(2, '0')
                        const day = String(today.getDate()).padStart(2, '0')
                        return `${year}-${month}-${day}`
                      })()}
                      onChange={(e) => {
                        const date = e.target.value
                        const time = newCampaign.scheduledAt ? newCampaign.scheduledAt.split('T')[1] : new Date().toTimeString().slice(0, 5)
                        const newDateTime = `${date}T${time}`
                        setNewCampaign({ ...newCampaign, scheduledAt: newDateTime })
                        setValidationErrors(prev => ({ ...prev, scheduledAt: false }))
                      }}
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="time"
                      className={`w-full px-3 py-2.5 bg-secondary text-foreground border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all ${
                        validationErrors.scheduledAt ? 'border-red-500' : 'border-border'
                      }`}
                      min={
                        newCampaign.scheduledAt?.split('T')[0] === new Date().toISOString().split('T')[0]
                          ? (() => {
                              const now = new Date()
                              now.setMinutes(now.getMinutes() + 1)
                              const hours = String(now.getHours()).padStart(2, '0')
                              const minutes = String(now.getMinutes()).padStart(2, '0')
                              return `${hours}:${minutes}`
                            })()
                          : '00:00'
                      }
                      value={newCampaign.scheduledAt ? newCampaign.scheduledAt.split('T')[1] : new Date().toTimeString().slice(0, 5)}
                      onChange={(e) => {
                        const time = e.target.value
                        const date = newCampaign.scheduledAt ? newCampaign.scheduledAt.split('T')[0] : new Date().toISOString().split('T')[0]
                        const newDateTime = `${date}T${time}`
                        setNewCampaign({ ...newCampaign, scheduledAt: newDateTime })
                        setValidationErrors(prev => ({ ...prev, scheduledAt: false }))
                      }}
                    />
                  </div>
                </div>
                <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm font-medium flex items-center gap-2 text-foreground">
                    <span>✓</span>
                    {newCampaign.scheduledAt 
                      ? `${new Date(newCampaign.scheduledAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at ${new Date(newCampaign.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`
                      : 'Select date and time'
                    }
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-divider">
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={handleSchedule}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin mr-2" />
                    Scheduling...
                  </>
                ) : (
                  'Schedule Message'
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1 border-border"
                onClick={() => setDialogOpen(false)}
              >
                Cancel
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
                    <TableHead className="text-muted-foreground">Scheduled For</TableHead>
                    <TableHead className="text-muted-foreground">Status</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="text-muted-foreground">Actions</TableHead>
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
                      <TableCell className="text-foreground text-sm">
                        {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Not scheduled'}
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
                      <TableCell className="flex gap-2">
                        {campaign.status !== 'cancelled' && campaign.status !== 'sent' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-yellow-500 text-yellow-400 hover:bg-yellow-500/10"
                            onClick={() => handleCancelCampaign(campaign.id)}
                            disabled={cancellingId === campaign.id}
                          >
                            {cancellingId === campaign.id ? (
                              <Loader className="w-3 h-3 animate-spin" />
                            ) : (
                              <X className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">Cancel</span>
                          </Button>
                        )}
                        {campaign.status === 'cancelled' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-500 text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            disabled={deletingId === campaign.id}
                          >
                            {deletingId === campaign.id ? (
                              <Loader className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                            <span className="ml-1 text-xs">Delete</span>
                          </Button>
                        )}
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

     
    </div>
  )
}