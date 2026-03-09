'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Send, Eye, FileText, Loader, Plus, Users, X, Search } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/context/auth'
import { useFetch, usePost } from '@/hooks/use-api'
import { toast } from 'sonner'

interface ContactGroup {
  id: number
  name: string
  description?: string
  createdAt: string
}

interface Contact {
  id: number
  name: string
  email?: string
  phoneNumber: string
  groupId?: number
  createdAt: string
}

export default function Composer() {
  const { user } = useAuth()
  const [message, setMessage] = useState('')
  const [characterCount, setCharacterCount] = useState(0)
  const [isSending, setIsSending] = useState(false)
  const [sendMode, setSendMode] = useState<'group' | 'contacts'>('contacts')
  const [selectedGroupsToSend, setSelectedGroupsToSend] = useState<number[]>([])
  const [selectedContacts, setSelectedContacts] = useState<number[]>([])
  const [showContactSelector, setShowContactSelector] = useState(false)
  const [searchContactTerm, setSearchContactTerm] = useState('')
  const [newGroupName, setNewGroupName] = useState('')
  const [newGroupDesc, setNewGroupDesc] = useState('')
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [showCreateGroupDialog, setShowCreateGroupDialog] = useState(false)

  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = useFetch<{ groups: ContactGroup[] }>(
    '/api/contact-groups',
    { userId: user?.id }
  )
  const { data: contactsData, isLoading: contactsLoading } = useFetch<{ contacts: Contact[] }>(
    '/api/contacts',
    { userId: user?.id }
  )
  const { post: sendMessage } = usePost('/api/messages')
  const { post: createGroup } = usePost('/api/contact-groups')

  const filteredContacts = useMemo(() => {
    if (!contactsData?.contacts) return []
    if (!searchContactTerm) return contactsData.contacts

    return contactsData.contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchContactTerm.toLowerCase()) ||
      contact.phoneNumber.includes(searchContactTerm)
    )
  }, [contactsData?.contacts, searchContactTerm])

  const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    setCharacterCount(e.target.value.length)
  }

  const toggleGroupSelection = (id: number) => {
    setSelectedGroupsToSend(prev =>
      prev.includes(id) ? prev.filter(g => g !== id) : [...prev, id]
    )
  }

  const toggleContactSelection = (id: number) => {
    setSelectedContacts(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      toast.error('Required Field', {
        description: 'Please enter a group name',
      })
      return
    }

    try {
      setIsCreatingGroup(true)
      await createGroup({
        userId: user?.id,
        name: newGroupName,
        description: newGroupDesc || null,
      })
      setNewGroupName('')
      setNewGroupDesc('')
      setShowCreateGroupDialog(false)
      refetchGroups()
      toast.success('Group Created', {
        description: `Contact group "${newGroupName}" has been created successfully`,
      })
    } catch (err) {
      console.error('Failed to create group:', err)
      toast.error('Failed to Create Group', {
        description: err instanceof Error ? err.message : 'An error occurred while creating the group',
      })
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const smsSegments = Math.ceil(characterCount / 160) || 0
  const totalRecipients = sendMode === 'contacts' ? selectedContacts.length : 0

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Empty Message', {
        description: 'Please write a message before sending',
      })
      return
    }

    if (sendMode === 'group' && selectedGroupsToSend.length === 0) {
      toast.error('No Groups Selected', {
        description: 'Please select at least one contact group',
      })
      return
    }

    if (sendMode === 'contacts' && selectedContacts.length === 0) {
      toast.error('No Contacts Selected', {
        description: 'Please select at least one contact',
      })
      return
    }

    try {
      setIsSending(true)
      let sentCount = 0
      let failedCount = 0

      if (sendMode === 'contacts') {
        // Send to selected individual contacts
        const contactsToSend = filteredContacts.filter(c => selectedContacts.includes(c.id))
        for (const contact of contactsToSend) {
          try {
            await sendMessage({
              userId: user?.id,
              recipientPhone: contact.phoneNumber,
              messageContent: message,
            })
            sentCount++
          } catch {
            failedCount++
          }
        }
      } else {
        // Send to contacts in selected groups
        const groupContacts = contactsData?.contacts?.filter(c => 
          selectedGroupsToSend.includes(c.groupId || -1)
        ) || []
        
        for (const contact of groupContacts) {
          try {
            await sendMessage({
              userId: user?.id,
              recipientPhone: contact.phoneNumber,
              messageContent: message,
            })
            sentCount++
          } catch {
            failedCount++
          }
        }
      }

      setMessage('')
      setCharacterCount(0)
      setSelectedContacts([])
      setSelectedGroupsToSend([])
      
      if (sentCount > 0 && failedCount === 0) {
        toast.success('Messages Sent Successfully', {
          description: `Your message has been delivered to ${sentCount} recipient${sentCount !== 1 ? 's' : ''}`,
        })
      } else if (sentCount > 0 && failedCount > 0) {
        toast.error('Partial Delivery', {
          description: `${sentCount} message${sentCount !== 1 ? 's' : ''} sent, ${failedCount} failed`,
        })
      } else {
        toast.error('Send Failed', {
          description: 'Failed to send messages. Please try again.',
        })
      }
    } catch (err) {
      console.error('Failed to send message:', err)
      toast.error('Error Sending Messages', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      })
    } finally {
      setIsSending(false)
    }
  }

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

          {/* Send Mode Selection */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-card-foreground">Send Mode</CardTitle>
              <CardDescription className="text-muted-foreground">Choose how to select recipients</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <button
                  onClick={() => setSendMode('contacts')}
                  className={`flex-1 px-4 py-2 rounded border-2 transition-colors ${
                    sendMode === 'contacts'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Individual Contacts
                </button>
                <button
                  onClick={() => setSendMode('group')}
                  className={`flex-1 px-4 py-2 rounded border-2 transition-colors ${
                    sendMode === 'group'
                      ? 'border-primary bg-primary/10 text-foreground'
                      : 'border-border bg-secondary text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-2" />
                  Contact Groups
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Recipients Selection */}
          {sendMode === 'contacts' ? (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-card-foreground">Select Contacts</CardTitle>
                    <CardDescription className="text-muted-foreground">Choose individual contacts to send to</CardDescription>
                  </div>
                  <Dialog open={showContactSelector} onOpenChange={setShowContactSelector}>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm" className="gap-2">
                        <Users className="w-4 h-4" />
                        Browse Contacts
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-96">
                      <DialogHeader>
                        <DialogTitle>Select Recipients</DialogTitle>
                        <DialogDescription>Search and select contacts to send the message to</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="relative">
                          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                          <Input
                            placeholder="Search by name or phone number..."
                            value={searchContactTerm}
                            onChange={(e) => setSearchContactTerm(e.target.value)}
                            className="border-border pl-9"
                          />
                        </div>
                        <div className="max-h-80 overflow-y-auto">
                          {contactsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
                            </div>
                          ) : filteredContacts.length > 0 ? (
                            <div className="space-y-2">
                              {filteredContacts.map(contact => (
                                <div key={contact.id} className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary/50">
                                  <Checkbox
                                    id={`contact-${contact.id}`}
                                    checked={selectedContacts.includes(contact.id)}
                                    onCheckedChange={() => toggleContactSelection(contact.id)}
                                    className="border-border"
                                  />
                                  <label
                                    htmlFor={`contact-${contact.id}`}
                                    className="flex-1 cursor-pointer"
                                  >
                                    <p className="font-medium text-foreground">{contact.name}</p>
                                    <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8">
                              <p className="text-muted-foreground">No contacts found</p>
                            </div>
                          )}
                        </div>
                        <Button
                          className="w-full"
                          onClick={() => setShowContactSelector(false)}
                        >
                          Done
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {selectedContacts.length > 0 ? (
                  <div className="space-y-3">
                    {filteredContacts
                      .filter(c => selectedContacts.includes(c.id))
                      .map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded border border-border bg-secondary/30"
                        >
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-sm text-muted-foreground">{contact.phoneNumber}</p>
                          </div>
                          <button
                            onClick={() => toggleContactSelection(contact.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground">No contacts selected. Click "Browse Contacts" to add recipients.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-card-foreground">Contact Groups</CardTitle>
                    <CardDescription className="text-muted-foreground">Select groups to send to</CardDescription>
                  </div>
                  <Dialog open={showCreateGroupDialog} onOpenChange={setShowCreateGroupDialog}>
                    <DialogTrigger asChild>
                      <Button variant="default" size="sm" className="gap-2">
                        <Plus className="w-4 h-4" />
                        New Group
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Contact Group</DialogTitle>
                        <DialogDescription>Add a new contact group for bulk messaging</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-foreground">Group Name</label>
                          <Input
                            placeholder="e.g., VIP Customers"
                            value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className="border-border mt-2"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                          <Input
                            placeholder="e.g., High-value customers requiring special attention"
                            value={newGroupDesc}
                            onChange={(e) => setNewGroupDesc(e.target.value)}
                            className="border-border mt-2"
                          />
                        </div>
                        <Button
                          onClick={handleCreateGroup}
                          disabled={isCreatingGroup || !newGroupName.trim()}
                          className="w-full"
                        >
                          {isCreatingGroup ? (
                            <>
                              <Loader className="w-4 h-4 animate-spin mr-2" />
                              Creating...
                            </>
                          ) : (
                            'Create Group'
                          )}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : groupsData?.groups && groupsData.groups.length > 0 ? (
                  <div className="space-y-3">
                    {groupsData.groups.map(group => (
                      <div key={group.id} className="flex items-center gap-3 p-3 rounded border border-border hover:bg-secondary/50 cursor-pointer">
                        <Checkbox
                          id={`group-${group.id}`}
                          checked={selectedGroupsToSend.includes(group.id)}
                          onCheckedChange={() => toggleGroupSelection(group.id)}
                          className="border-border"
                        />
                        <label
                          htmlFor={`group-${group.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <p className="font-medium text-foreground">{group.name}</p>
                          {group.description && <p className="text-sm text-muted-foreground">{group.description}</p>}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No contact groups yet. Click "New Group" to create one.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
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
            <Button
              className="w-full bg-primary hover:bg-primary/90 gap-2"
              size="lg"
              onClick={handleSend}
              disabled={isSending || !message.trim() || (sendMode === 'contacts' ? selectedContacts.length === 0 : selectedGroupsToSend.length === 0)}
            >
              {isSending ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Send Now
                </>
              )}
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
