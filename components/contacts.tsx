'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Download, Search, Trash2, AlertCircle, Loader, Edit, X, Check } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuth } from '@/context/auth'
import { useFetch, useDelete, usePost, usePut } from '@/hooks/use-api'
import { toast } from 'sonner'

interface Contact {
  id: number
  name: string
  email?: string
  phoneNumber: string
  groupId?: number
  createdAt: string
}

interface ContactGroup {
  id: number
  name: string
  description?: string
  createdAt: string
}

export default function Contacts() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [searchGroupTerm, setSearchGroupTerm] = useState('')
  const [newContact, setNewContact] = useState({ name: '', phoneNumber: '', email: '' })
  const [newGroup, setNewGroup] = useState({ name: '', description: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<ContactGroup | null>(null)
  const [showGroupManager, setShowGroupManager] = useState(false)
  const [selectedContactsForGroup, setSelectedContactsForGroup] = useState<number[]>([])
  const [groupForAddingContacts, setGroupForAddingContacts] = useState<ContactGroup | null>(null)
  const [showAddContactsModal, setShowAddContactsModal] = useState(false)
  const [searchAddContactsTerm, setSearchAddContactsTerm] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  
  const { data, isLoading, error, refetch } = useFetch<{ contacts: Contact[] }>(
    '/api/contacts',
    { userId: user?.id }
  )
  
  const { data: groupsData, isLoading: groupsLoading, refetch: refetchGroups } = useFetch<{ groups: ContactGroup[] }>(
    '/api/contact-groups',
    { userId: user?.id }
  )
  
  const { deleteItem, isLoading: isDeleting } = useDelete('/api/contacts')
  const { deleteItem: deleteGroup, isLoading: isDeletingGroup } = useDelete('/api/contact-groups')
  const { post: createContact } = usePost('/api/contacts')
  const { post: createGroup } = usePost('/api/contact-groups')
  const { put: updateContact } = usePut('/api/contacts')

  const filteredContacts = useMemo(() => {
    if (!data?.contacts) return []
    if (!searchTerm) return data.contacts
    return data.contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phoneNumber.includes(searchTerm)
    )
  }, [data?.contacts, searchTerm])

  const filteredGroups = useMemo(() => {
    if (!groupsData?.groups) return []
    if (!searchGroupTerm) return groupsData.groups
    return groupsData.groups.filter(group =>
      group.name.toLowerCase().includes(searchGroupTerm.toLowerCase())
    )
  }, [groupsData?.groups, searchGroupTerm])

  const getGroupContacts = (groupId: number) => {
    return (data?.contacts || []).filter(c => c.groupId === groupId)
  }

  const handleCreateContact = async () => {
    if (!newContact.name.trim() || !newContact.phoneNumber.trim()) {
      toast.error('Missing Fields', {
        description: 'Please fill in name and phone number',
      })
      return
    }

    try {
      setIsCreating(true)
      let phoneNumber = newContact.phoneNumber.trim()
      phoneNumber = phoneNumber.replace(/\+|\s/g, '')
      if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber
      }
      phoneNumber = '+' + phoneNumber
      
      await createContact({
        userId: user?.id,
        name: newContact.name,
        phoneNumber: phoneNumber,
        email: newContact.email || null,
      })
      setNewContact({ name: '', phoneNumber: '', email: '' })
      toast.success('Contact Added', {
        description: `${newContact.name} has been added successfully`,
      })
      refetch()
    } catch (err: any) {
      console.error('Failed to create contact:', err)
      toast.error('Error', {
        description: err?.message || 'Failed to create contact',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Missing Fields', {
        description: 'Please enter a group name',
      })
      return
    }

    try {
      setIsCreatingGroup(true)
      await createGroup({
        userId: user?.id,
        name: newGroup.name,
        description: newGroup.description || null,
      })
      setNewGroup({ name: '', description: '' })
      toast.success('Group Created', {
        description: `${newGroup.name} has been created successfully`,
      })
      refetchGroups()
    } catch (err: any) {
      console.error('Failed to create group:', err)
      toast.error('Error', {
        description: err?.message || 'Failed to create group',
      })
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleDeleteContact = async (id: number) => {
    try {
      await deleteItem(id)
      toast.success('Contact Deleted', {
        description: 'Contact has been removed successfully',
      })
      refetch()
    } catch (err) {
      console.error('Failed to delete contact:', err)
      toast.error('Deletion Failed', {
        description: 'Could not delete the contact. Please try again.',
      })
    }
  }

  const handleDeleteGroup = async (id: number) => {
    try {
      await deleteGroup(id)
      toast.success('Group Deleted', {
        description: 'Group has been removed successfully',
      })
      setSelectedGroup(null)
      setShowGroupManager(false)
      refetchGroups()
      refetch()
    } catch (err) {
      console.error('Failed to delete group:', err)
      toast.error('Deletion Failed', {
        description: 'Could not delete the group. Please try again.',
      })
    }
  }

  const handleAddContactToGroup = async (contactId: number) => {
    try {
      await updateContact(contactId, {
        groupId: selectedGroup?.id,
      })
      toast.success('Contact Added', {
        description: 'Contact has been added to the group',
      })
      refetch()
    } catch (err) {
      console.error('Failed to add contact to group:', err)
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to add contact to group',
      })
    }
  }

  const handleRemoveContactFromGroup = async (contactId: number) => {
    try {
      await updateContact(contactId, {
        groupId: null,
      })
      toast.success('Contact Removed', {
        description: 'Contact has been removed from the group',
      })
      refetch()
    } catch (err) {
      console.error('Failed to remove contact from group:', err)
      toast.error('Error', {
        description: err instanceof Error ? err.message : 'Failed to remove contact from group',
      })
    }
  }

  const handleAddSelectedContactsToGroup = async (contactIds: number[]) => {
    try {
      let addedCount = 0
      let skippedCount = 0

      for (const contactId of contactIds) {
        const contact = (data?.contacts || []).find(c => c.id === contactId)
        
        // Check if contact already in this specific group
        if (contact?.groupId === groupForAddingContacts?.id) {
          skippedCount++
          continue
        }

        try {
          await updateContact(contactId, {
            groupId: groupForAddingContacts?.id,
          })
          addedCount++
        } catch (err) {
          skippedCount++
        }
      }

      setSelectedContactsForGroup([])
      setShowAddContactsModal(false)
      setGroupForAddingContacts(null)

      if (addedCount > 0) {
        toast.success('Contacts Added', {
          description: `${addedCount} contact${addedCount !== 1 ? 's' : ''} added to ${groupForAddingContacts?.name}${skippedCount > 0 ? ` (${skippedCount} already in this group)` : ''}`,
        })
      } else {
        toast.info('No Changes', {
          description: `${skippedCount} contact${skippedCount !== 1 ? 's' : ''} already in this group`,
        })
      }

      refetch()
    } catch (err) {
      console.error('Failed to add contacts to group:', err)
      toast.error('Error', {
        description: 'Failed to add contacts to group',
      })
    }
  }

  const handleToggleContactSelectionForGroup = (contactId: number) => {
    setSelectedContactsForGroup(prev => {
      if (prev.includes(contactId)) {
        return prev.filter(id => id !== contactId)
      } else {
        return [...prev, contactId]
      }
    })
  }

  const handleExportCSV = () => {
    if (!data?.contacts || data.contacts.length === 0) {
      toast.error('No Contacts', {
        description: 'There are no contacts to export',
      })
      return
    }

    try {
      const headers = ['Name', 'Phone Number', 'Email', 'Group']
      const rows = data.contacts.map(contact => {
        const group = (groupsData?.groups || []).find(g => g.id === contact.groupId)
        return [
          `"${contact.name.replace(/"/g, '""')}"`,
          contact.phoneNumber,
          contact.email ? `"${contact.email.replace(/"/g, '""')}"` : '',
          group?.name || ''
        ]
      })

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `contacts_${new Date().getTime()}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success('Export Successful', {
        description: `${data.contacts.length} contact(s) exported successfully`,
      })
    } catch (err) {
      console.error('Failed to export contacts:', err)
      toast.error('Export Failed', {
        description: 'Could not export contacts. Please try again.',
      })
    }
  }

  const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsImporting(true)
      const text = await file.text()
      const lines = text.trim().split('\n')
      
      if (lines.length < 2) {
        toast.error('Invalid File', {
          description: 'CSV file must contain headers and at least one contact',
        })
        return
      }

      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        const matches = line.match(/(?:"([^"]*(?:""[^"]*)*)"|([^,]*))[,]?/g)
        if (!matches || matches.length < 2) {
          errors.push(`Row ${i + 1}: Invalid format`)
          errorCount++
          continue
        }

        let name = (matches[0] || '').replace(/^"|"$/g, '').replace(/""/g, '"')
        let phoneNumber = (matches[1] || '').replace(/^"|"$/g, '').trim()
        let email = matches[2] ? (matches[2] || '').replace(/^"|"$/g, '').trim() : ''

        if (!name || !phoneNumber) {
          errors.push(`Row ${i + 1}: Missing name or phone`)
          errorCount++
          continue
        }

        // Normalize phone
        phoneNumber = phoneNumber.replace(/\+|\s/g, '')
        if (!phoneNumber.startsWith('254')) {
          phoneNumber = '254' + phoneNumber
        }
        phoneNumber = '+' + phoneNumber

        try {
          await createContact({
            userId: user?.id,
            name,
            phoneNumber,
            email: email || null,
          })
          successCount++
        } catch (err: any) {
          errorCount++
          errors.push(`Row ${i + 1}: ${err?.message || 'Failed to create'}`)
        }
      }

      refetch()
      
      if (successCount > 0) {
        toast.success('Import Completed', {
          description: `${successCount} contact(s) imported successfully${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        })
      } else {
        toast.error('Import Failed', {
          description: 'No contacts were imported',
        })
      }

      if (errors.length > 0 && errors.length <= 5) {
        toast.error('Import Errors', {
          description: errors.join('; '),
        })
      }
    } catch (err) {
      console.error('Failed to import contacts:', err)
      toast.error('Import Failed', {
        description: err instanceof Error ? err.message : 'Could not import contacts',
      })
    } finally {
      setIsImporting(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contact Management</h1>
        <p className="text-muted-foreground mt-1">Manage your contacts and groups</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Failed to load contacts</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Add Contact Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary hover:bg-primary/90 gap-2">
              <Plus className="w-4 h-4" />
              Add Contact
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Add New Contact</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a new contact to send SMS messages
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Name</label>
                <Input
                  placeholder="e.g., John Doe"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={newContact.name}
                  onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Phone Number</label>
                <div className="flex items-center gap-0 mt-1 bg-secondary border border-border rounded-md">
                  <span className="px-3 py-2 text-foreground font-medium">+254</span>
                  <Input
                    placeholder="e.g., 719833166"
                    className="flex-1 border-0 bg-transparent text-foreground focus:ring-0"
                    value={newContact.phoneNumber}
                    onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Email (Optional)</label>
                <Input
                  placeholder="e.g., john@example.com"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={newContact.email}
                  onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleCreateContact}
                disabled={isCreating}
              >
                {isCreating ? 'Adding...' : 'Add Contact'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Group Dialog */}
        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-green-600 hover:bg-green-700 gap-2">
              <Plus className="w-4 h-4" />
              Add Group
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground">Create New Group</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Create a new contact group for sending bulk SMS
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Group Name</label>
                <Input
                  placeholder="e.g., Sales Team"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                <Textarea
                  placeholder="e.g., All sales representatives"
                  className="bg-secondary border-border text-foreground mt-1 min-h-20"
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-green-600 hover:bg-green-700"
                onClick={handleCreateGroup}
                disabled={isCreatingGroup}
              >
                {isCreatingGroup ? 'Creating...' : 'Create Group'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Button variant="outline" className="gap-2 border-border text-foreground" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
          <Upload className="w-4 h-4" />
          {isImporting ? 'Importing...' : 'Import CSV'}
        </Button>
        <Button variant="outline" className="gap-2 border-border text-foreground" onClick={handleExportCSV}>
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          style={{ display: 'none' }}
        />
      </div>

      {/* Dual Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Contacts Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">All Contacts</CardTitle>
            <CardDescription className="text-muted-foreground">
              {isLoading ? 'Loading...' : `${filteredContacts.length} contact${filteredContacts.length !== 1 ? 's' : ''}`}
            </CardDescription>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  className="pl-10 bg-secondary border-border text-foreground"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredContacts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No contacts found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Name</TableHead>
                      <TableHead className="text-muted-foreground">Phone</TableHead>
                      <TableHead className="text-right text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContacts.map((contact) => (
                      <TableRow key={contact.id} className="border-border hover:bg-secondary/50">
                        <TableCell className="font-medium text-foreground text-xs">{contact.name}</TableCell>
                        <TableCell className="text-foreground text-xs">{contact.phoneNumber}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteContact(contact.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Groups Table */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-card-foreground">All Groups</CardTitle>
            <CardDescription className="text-muted-foreground">
              {groupsLoading ? 'Loading...' : `${filteredGroups.length} group${filteredGroups.length !== 1 ? 's' : ''}`}
            </CardDescription>
            <div className="mt-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search groups..."
                  className="pl-10 bg-secondary border-border text-foreground"
                  value={searchGroupTerm}
                  onChange={(e) => setSearchGroupTerm(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {groupsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No groups found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-sm">
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Group Name</TableHead>
                      <TableHead className="text-muted-foreground">Members</TableHead>
                      <TableHead className="text-right text-muted-foreground">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredGroups.map((group) => {
                      const members = getGroupContacts(group.id)
                      return (
                        <TableRow key={group.id} className="border-border hover:bg-secondary/50 cursor-pointer" onClick={() => {
                          setSelectedGroup(group)
                          setShowGroupManager(true)
                        }}>
                          <TableCell className="font-medium text-foreground text-xs">{group.name}</TableCell>
                          <TableCell className="text-foreground text-xs">
                            <Badge variant="outline" className="border-primary text-primary">{members.length}</Badge>
                          </TableCell>
                          <TableCell className="text-right space-x-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-primary hover:text-primary hover:bg-primary/10"
                              onClick={(e) => {
                                e.stopPropagation()
                                setGroupForAddingContacts(group)
                                setShowAddContactsModal(true)
                                setSelectedContactsForGroup([])
                              }}
                              title="Add contacts to this group"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleDeleteGroup(group.id)
                              }}
                              disabled={isDeletingGroup}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Group Manager Modal */}
      <Dialog open={showGroupManager} onOpenChange={setShowGroupManager}>
        <DialogContent className="max-w-3xl bg-card border-border text-foreground max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Manage Group: {selectedGroup?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedGroup?.description || 'Add or remove contacts from this group'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-6">
            {/* Group Members */}
            <div>
              <h3 className="font-semibold text-foreground mb-3">Group Members ({getGroupContacts(selectedGroup?.id || 0).length})</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto border border-border rounded-lg p-3 bg-secondary/20">
                {getGroupContacts(selectedGroup?.id || 0).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No contacts in this group yet</p>
                ) : (
                  getGroupContacts(selectedGroup?.id || 0).map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-2 bg-card border border-border rounded hover:bg-secondary/50">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground">{contact.name}</p>
                        <p className="text-xs text-muted-foreground">{contact.phoneNumber}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemoveContactFromGroup(contact.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setShowGroupManager(false)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Contacts to Group Modal */}
      <Dialog open={showAddContactsModal} onOpenChange={setShowAddContactsModal}>
        <DialogContent className="max-w-2xl bg-card border-border text-foreground max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-foreground">Add Contacts to {groupForAddingContacts?.name}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Select contacts to add to this group. Contacts already in this group are disabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search contacts..."
                className="pl-10 bg-secondary border-border text-foreground"
                value={searchAddContactsTerm}
                onChange={(e) => setSearchAddContactsTerm(e.target.value)}
              />
            </div>

            {/* Contacts Checklist */}
            <div className="border border-border rounded-lg p-3 bg-secondary/20 space-y-2 max-h-96 overflow-y-auto">
              {(() => {
                const groupContactIds = getGroupContacts(groupForAddingContacts?.id || 0).map(c => c.id)
                const filteredContactsForAdd = (data?.contacts || []).filter(c =>
                  (c.name.toLowerCase().includes(searchAddContactsTerm.toLowerCase()) ||
                    c.phoneNumber.includes(searchAddContactsTerm))
                )

                return filteredContactsForAdd.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No contacts found</p>
                ) : (
                  filteredContactsForAdd.map(contact => {
                    const isInGroup = groupContactIds.includes(contact.id)
                    return (
                      <label
                        key={contact.id}
                        className="flex items-center gap-3 p-2 rounded bg-card border border-border hover:bg-secondary/50 cursor-pointer"
                      >
                        <Checkbox
                          checked={selectedContactsForGroup.includes(contact.id)}
                          onCheckedChange={() => !isInGroup && handleToggleContactSelectionForGroup(contact.id)}
                          disabled={isInGroup}
                        />
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isInGroup ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                            {contact.name}
                          </p>
                          <p className={`text-xs ${isInGroup ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                            {contact.phoneNumber}
                          </p>
                        </div>
                        {isInGroup && <Badge variant="outline" className="text-xs">Already added</Badge>}
                      </label>
                    )
                  })
                )
              })()}
            </div>

            {selectedContactsForGroup.length > 0 && (
              <div className="bg-primary/10 border border-primary rounded-lg p-3">
                <p className="text-sm font-medium text-primary">{selectedContactsForGroup.length} contact{selectedContactsForGroup.length !== 1 ? 's' : ''} selected</p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddContactsModal(false)
                setSelectedContactsForGroup([])
                setGroupForAddingContacts(null)
                setSearchAddContactsTerm('')
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={() => handleAddSelectedContactsToGroup(selectedContactsForGroup)}
              disabled={selectedContactsForGroup.length === 0}
            >
              Add Selected Contacts
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
