'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, Eye, FileText, Loader, Plus, Users, X, Search, AlertCircle, Copy } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/context/auth'
import { useFetch, usePost } from '@/hooks/use-api'
import { toast } from 'sonner'
import { substituteVariables, createVariablesFromContact, extractVariables, getVariableHint } from '@/lib/message-variables'

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
  groupIds?: number[]
  groupNames?: string[]
  createdAt: string
}

interface Template {
  id: number
  name: string
  content: string
  variables?: any
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
  const [sendErrors, setSendErrors] = useState<Array<{ phone: string; reason: string }>>([])
  const [showErrorDetails, setShowErrorDetails] = useState(false)
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)
  const [showTemplateSelector, setShowTemplateSelector] = useState(false)
  const [duplicateInfo, setDuplicateInfo] = useState<{
    type: 'contact-in-group' | 'contact-in-multiple-groups'
    duplicates: Array<{
      contactId: number
      contactName: string
      contactPhone: string
      locations: string[] // group names or "Individual Selection"
    }>
  } | null>(null)

  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = useFetch<{ groups: ContactGroup[] }>(
    '/api/contact-groups',
    { userId: user?.id }
  )
  const { data: contactsData, isLoading: contactsLoading } = useFetch<{ contacts: Contact[] }>(
    '/api/contacts',
    { userId: user?.id }
  )
  const { data: templatesData, isLoading: templatesLoading } = useFetch<{ templates: Template[] }>(
    '/api/templates',
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
  
  // Function to get count of contacts in a group
  const getGroupContactCount = (groupId: number): number => {
    return (contactsData?.contacts || []).filter(c => c.groupIds?.includes(groupId)).length
  }

  // Check for duplicate contacts across selections
  const checkForDuplicates = (): boolean => {
    if (sendMode === 'contacts') return false // No duplicates when only selecting contacts

    const selectedContactIds = new Set(selectedContacts)
    const groupContactIds = new Map<number, number[]>() // groupId -> contactIds
    const contactIdToNames = new Map<number, { name: string; phone: string }>()

    // Build map of contacts in each group
    for (const groupId of selectedGroupsToSend) {
      const groupContacts = contactsData?.contacts?.filter(c =>
        c.groupIds?.includes(groupId)
      ) || []
      groupContactIds.set(groupId, groupContacts.map(c => c.id))
      groupContacts.forEach(c => {
        contactIdToNames.set(c.id, { name: c.name, phone: c.phoneNumber })
      })
    }

    // Also map individually selected contacts
    filteredContacts.forEach(c => {
      if (selectedContactIds.has(c.id)) {
        contactIdToNames.set(c.id, { name: c.name, phone: c.phoneNumber })
      }
    })

    // Find duplicates
    const duplicates: Array<{
      contactId: number
      contactName: string
      contactPhone: string
      locations: string[]
    }> = []

    const contactLocations = new Map<number, Set<string>>() // contactId -> groupNames/Individual

    // Add individually selected contacts
    selectedContacts.forEach(contactId => {
      if (!contactLocations.has(contactId)) {
        contactLocations.set(contactId, new Set())
      }
      contactLocations.get(contactId)!.add('Individual Selection')
    })

    // Add contacts from groups
    for (const [groupId, contactIds] of groupContactIds) {
      const groupName = groupsData?.groups?.find(g => g.id === groupId)?.name || `Group ${groupId}`
      contactIds.forEach(contactId => {
        if (!contactLocations.has(contactId)) {
          contactLocations.set(contactId, new Set())
        }
        contactLocations.get(contactId)!.add(groupName)
      })
    }

    // Check if any contact appears in multiple locations
    for (const [contactId, locations] of contactLocations) {
      if (locations.size > 1) {
        const contactInfo = contactIdToNames.get(contactId)
        if (contactInfo) {
          duplicates.push({
            contactId,
            contactName: contactInfo.name,
            contactPhone: contactInfo.phone,
            locations: Array.from(locations),
          })
        }
      }
    }

    if (duplicates.length > 0) {
      // Determine duplicate type
      const hasIndividual = duplicates.some(d => d.locations.includes('Individual Selection'))
      const type = hasIndividual ? 'contact-in-group' : 'contact-in-multiple-groups'

      setDuplicateInfo({
        type,
        duplicates,
      })
      setShowDuplicateDialog(true)
      return true
    }

    return false
  }

  // Auto-resolve duplicates
  const resolveDuplicates = (removeIndividual: boolean) => {
    if (!duplicateInfo) return

    const duplicateContactIds = new Set(duplicateInfo.duplicates.map(d => d.contactId))

    if (duplicateInfo.type === 'contact-in-group' && removeIndividual) {
      // Remove individually selected duplicate contacts
      setSelectedContacts(prev =>
        prev.filter(id => !duplicateContactIds.has(id))
      )
      toast.success('Duplicates Resolved', {
        description: 'Duplicate individual contacts removed. Only group selections will be used.',
      })
    } else if (duplicateInfo.type === 'contact-in-multiple-groups') {
      // For multiple group duplicates, user needs to manually remove
      toast.info('Manual Removal Required', {
        description: 'Please remove the contact from one of the groups to avoid duplication.',
      })
      return
    }

    setShowDuplicateDialog(false)
    setDuplicateInfo(null)
  }

  // Calculate total recipients based on send mode
  const totalRecipients = useMemo(() => {
    if (sendMode === 'contacts') {
      return selectedContacts.length
    } else {
      // Sum up contacts in all selected groups
      return selectedGroupsToSend.reduce((sum, groupId) => {
        return sum + getGroupContactCount(groupId)
      }, 0)
    }
  }, [sendMode, selectedContacts, selectedGroupsToSend, contactsData?.contacts])

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

    // Check for duplicate contacts
    if (checkForDuplicates()) {
      return // Dialog will be shown by checkForDuplicates
    }

    try {
      setIsSending(true)
      setSendErrors([])

      // Get contacts to send to based on mode
      let contactsToSend: Contact[] = []
      
      if (sendMode === 'contacts') {
        contactsToSend = filteredContacts.filter(c => selectedContacts.includes(c.id))
      } else {
        contactsToSend = contactsData?.contacts?.filter(c => 
          c.groupIds?.some(gId => selectedGroupsToSend.includes(gId))
        ) || []
      }

      // Check if message contains variables
      const messageVariables = extractVariables(message)
      const hasVariables = messageVariables.length > 0

      console.log(`📤 Sending message to ${contactsToSend.length} recipients${hasVariables ? ' (with personalization)' : ''}`)

      let successCount = 0
      let failureCount = 0
      const failedMessages = []

      // Send messages (personalized if variables are detected)
      if (hasVariables) {
        // Send individual messages with variable substitution
        for (const contact of contactsToSend) {
          try {
            const personalizedMessage = substituteVariables(
              message,
              createVariablesFromContact(contact)
            )
            
            const response: any = await sendMessage({
              userId: user?.id,
              recipientPhones: [contact.phoneNumber],
              messageContent: personalizedMessage,
            })

            if (response?.messages && response.messages.length > 0) {
              const sent = response.messages.filter((m: any) => m.status === 'sent').length
              const failed = response.messages.filter((m: any) => m.status === 'failed').length
              successCount += sent
              failureCount += failed
              
              if (failed > 0) {
                failedMessages.push(...response.messages.filter((m: any) => m.status === 'failed'))
              }
            }
          } catch (err) {
            failureCount++
            failedMessages.push({
              recipientPhone: contact.phoneNumber,
              errorMessage: err instanceof Error ? err.message : 'Failed to send',
            })
          }
        }
      } else {
        // Send in bulk mode (all recipients with same message)
        const phoneNumbers = contactsToSend.map(c => c.phoneNumber)
        
        const response: any = await sendMessage({
          userId: user?.id,
          recipientPhones: phoneNumbers,
          messageContent: message,
        })

        const messages = response.messages || []
        successCount = messages.filter((m: any) => m.status === 'sent').length
        failureCount = messages.filter((m: any) => m.status === 'failed').length
        failedMessages.push(...messages.filter((m: any) => m.status === 'failed'))
      }

      const errors: Array<{ phone: string; reason: string }> = failedMessages.map((msg: any) => ({
        phone: msg.recipientPhone,
        reason: msg.errorMessage || msg.error || 'Unknown error',
      }))

      setSendErrors(errors)
      
      if (successCount > 0 && failureCount === 0) {
        toast.success('Messages Sent Successfully', {
          description: `Your message has been delivered to ${successCount} recipient${successCount !== 1 ? 's' : ''}`,
        })
      } else if (successCount > 0 && failureCount > 0) {
        setShowErrorDetails(true)
        toast.error('Partial Delivery', {
          description: `${successCount} sent successfully, ${failureCount} failed. Click to view details.`,
        })
      } else {
        setShowErrorDetails(true)
        toast.error('Send Failed', {
          description: `All ${contactsToSend.length} messages failed. Click to view details.`,
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
      {/* Duplicate Detection Dialog */}
      <Dialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              ⚠️ Duplicate Contacts Detected
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {duplicateInfo?.type === 'contact-in-group'
                ? 'The same contact appears in both your individual selection and in a selected group. This will cause duplicate messages.'
                : 'The same contact appears in multiple selected groups. This will cause duplicate messages.'}
            </DialogDescription>
          </DialogHeader>

          {duplicateInfo && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {duplicateInfo.duplicates.map((dup, idx) => (
                  <div key={idx} className="p-3 bg-secondary rounded-lg border border-border">
                    <p className="font-semibold text-foreground">{dup.contactName}</p>
                    <p className="text-sm text-muted-foreground">{dup.contactPhone}</p>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {dup.locations.map((loc, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {loc}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                {duplicateInfo.type === 'contact-in-group' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowDuplicateDialog(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => resolveDuplicates(true)}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      Auto-Remove Individual & Send
                    </Button>
                  </>
                )}
                {duplicateInfo.type === 'contact-in-multiple-groups' && (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => setShowDuplicateDialog(false)}
                      className="flex-1"
                    >
                      Cancel & Edit
                    </Button>
                    <Button disabled className="flex-1">
                      Manual Removal Required
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Compose Message</h1>
        <p className="text-muted-foreground mt-1">Write and send SMS notifications</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composer */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg text-card-foreground">Message Content</CardTitle>
              <CardDescription className="text-muted-foreground">Compose your SMS notification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    placeholder="Type your message here..."
                    className="min-h-32 bg-secondary/50 border border-border/50 text-foreground placeholder:text-muted-foreground resize-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                    value={message}
                    onChange={handleMessageChange}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Tip: Use $${'{name}'} to personalize messages. Each student will see their own name.
                  </p>
                </div>
                <Dialog open={showTemplateSelector} onOpenChange={setShowTemplateSelector}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="border-border gap-2">
                      <Copy className="w-4 h-4" />
                      Select Template
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-96">
                    <DialogHeader>
                      <DialogTitle>Select Template</DialogTitle>
                      <DialogDescription>Choose a template to use in your message</DialogDescription>
                    </DialogHeader>
                    <div className="max-h-80 overflow-y-auto space-y-2">
                      {templatesLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : templatesData?.templates && templatesData.templates.length > 0 ? (
                        templatesData.templates.map(template => (
                          <div
                            key={template.id}
                            onClick={() => {
                              setMessage(template.content)
                              setCharacterCount(template.content.length)
                              setShowTemplateSelector(false)
                              toast.success('Template Selected', {
                                description: `Template "${template.name}" loaded`,
                              })
                            }}
                            className="p-4 rounded-lg border border-border/30 bg-secondary/30 hover:bg-secondary/50 hover:border-primary/50 transition-colors cursor-pointer"
                          >
                            <p className="font-medium text-foreground">{template.name}</p>
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{template.content}</p>
                            <p className="text-xs text-muted-foreground mt-2">{template.content.length} characters</p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-8">
                          <p className="text-muted-foreground">No templates found. Create one in the Templates section.</p>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              
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
          <div className="bg-card/50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-foreground">Send Mode</h3>
            <div className="flex gap-3">
              <button
                onClick={() => setSendMode('contacts')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  sendMode === 'contacts'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground border border-border/30'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Individual Contacts
              </button>
              <button
                onClick={() => setSendMode('group')}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                  sendMode === 'group'
                    ? 'bg-green-600/15 text-green-600 border border-green-500/30'
                    : 'bg-secondary/40 text-muted-foreground hover:text-foreground border border-border/30'
                }`}
              >
                <Users className="w-4 h-4 inline mr-2" />
                Contact Groups
              </button>
            </div>
          </div>

          {/* Recipients Selection */}
          {sendMode === 'contacts' ? (
            <Card className="bg-card border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-card-foreground">Select Contacts</CardTitle>
                    <CardDescription className="text-muted-foreground">Choose individual contacts to send to</CardDescription>
                  </div>
                  <Dialog open={showContactSelector} onOpenChange={setShowContactSelector}>
                    <DialogTrigger asChild>
                      <Button size="sm" className="bg-primary hover:bg-primary/90 gap-2">
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
                                <div key={contact.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-secondary/30 hover:bg-secondary/50 transition-colors">
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
                                    <p className="font-medium text-foreground text-sm">{contact.name}</p>
                                    <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
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
                  <div className="space-y-2">
                    {filteredContacts
                      .filter(c => selectedContacts.includes(c.id))
                      .map(contact => (
                        <div
                          key={contact.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-primary/8 border border-primary/20"
                        >
                          <div>
                            <p className="font-medium text-foreground">{contact.name}</p>
                            <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
                          </div>
                          <button
                            onClick={() => toggleContactSelection(contact.id)}
                            className="text-muted-foreground hover:text-primary transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-muted-foreground text-sm">No contacts selected. Click "Browse Contacts" to add recipients.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card border-0 shadow-sm">
              <CardHeader>
                <div>
                  <CardTitle className="text-lg text-card-foreground">Contact Groups</CardTitle>
                  <CardDescription className="text-muted-foreground">Select groups to send to</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {groupsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : groupsData?.groups && groupsData.groups.length > 0 ? (
                  <div className="space-y-2">
                    {groupsData.groups.map(group => {
                      const memberCount = getGroupContactCount(group.id)
                      const isDisabled = memberCount === 0
                      return (
                        <div
                          key={group.id}
                          className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                            isDisabled
                              ? 'bg-secondary/30 border-border/20 cursor-not-allowed opacity-50'
                              : 'bg-green-600/8 hover:bg-green-600/12 border-green-500/20 cursor-pointer'
                          }`}
                        >
                          <Checkbox
                            id={`group-${group.id}`}
                            checked={selectedGroupsToSend.includes(group.id)}
                            onCheckedChange={() => !isDisabled && toggleGroupSelection(group.id)}
                            disabled={isDisabled}
                            className="border-border"
                          />
                          <label
                            htmlFor={`group-${group.id}`}
                            className={`flex-1 ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-foreground">{group.name}</p>
                                {group.description && <p className="text-xs text-muted-foreground">{group.description}</p>}
                              </div>
                              <Badge variant="outline" className={isDisabled ? 'opacity-50' : ''}>
                                {memberCount} member{memberCount !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </label>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground text-sm">No contact groups yet. Click "New Group" to create one.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Preview & Actions */}
        <div className="space-y-6">
          {/* Preview Card */}
          <Card className="bg-card border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm text-card-foreground flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Preview
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-secondary/50 p-4 rounded-lg border border-border/30">
                <p className="text-sm text-foreground leading-relaxed">{message || 'Your message preview will appear here...'}</p>
              </div>
              
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Total Recipients</p>
                <p className="text-3xl font-bold text-primary">{totalRecipients.toLocaleString()}</p>
              </div>

              {message.length > 160 && (
                <Alert className="bg-yellow-500/10 border border-yellow-500/30">
                  <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
                  <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-xs mt-1">
                    💬 Message will be sent as {smsSegments} part(s). Charges apply per segment.
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
          </div>

          {/* Send Error Details */}
          {sendErrors.length > 0 && (
            <Dialog open={showErrorDetails} onOpenChange={setShowErrorDetails}>
              <DialogContent className="max-w-2xl max-h-96">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    Message Send Failures ({sendErrors.length})
                  </DialogTitle>
                  <DialogDescription>
                    The following messages failed to send. Check the failure reasons below.
                  </DialogDescription>
                </DialogHeader>
                <div className="max-h-80 overflow-y-auto space-y-2">
                  {sendErrors.map((error, index) => (
                    <div key={index} className="p-3 rounded-lg border border-red-500/20 bg-red-500/10">
                      <p className="font-medium text-foreground text-sm">{error.phone}</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                        ❌ {error.reason}
                      </p>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </div>
  )
}
