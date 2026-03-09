'use client'

import { useState, useMemo, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Download, Search, Filter, Trash2, AlertCircle, Loader } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useAuth } from '@/context/auth'
import { useFetch, useDelete, usePost } from '@/hooks/use-api'
import { toast } from 'sonner'

interface Contact {
  id: number
  name: string
  email?: string
  phoneNumber: string
  groupId?: number
  createdAt: string
}

export default function Contacts() {
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState('')
  const [newContact, setNewContact] = useState({ name: '', phoneNumber: '', email: '' })
  const [isCreating, setIsCreating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isImporting, setIsImporting] = useState(false)
  const { data, isLoading, error, refetch } = useFetch<{ contacts: Contact[] }>(
    '/api/contacts',
    { userId: user?.id }
  )
  const { deleteItem, isLoading: isDeleting } = useDelete('/api/contacts')
  const { post: createContact } = usePost('/api/contacts')

  const filteredContacts = useMemo(() => {
    if (!data?.contacts) return []
    if (!searchTerm) return data.contacts

    return data.contacts.filter(contact =>
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phoneNumber.includes(searchTerm)
    )
  }, [data?.contacts, searchTerm])

  const handleCreateContact = async () => {
    if (!newContact.name.trim() || !newContact.phoneNumber.trim()) {
      toast.error('Missing Fields', {
        description: 'Please fill in name and phone number',
      })
      return
    }

    try {
      setIsCreating(true)
      
      // Normalize phone number to +254XXXXXXX format (API format)
      let phoneNumber = newContact.phoneNumber.trim()
      
      // Remove any existing + or spaces
      phoneNumber = phoneNumber.replace(/\+|\s/g, '')
      
      // If it starts with 254, keep it; otherwise prepend 254
      if (!phoneNumber.startsWith('254')) {
        phoneNumber = '254' + phoneNumber
      }
      
      // Add + prefix for Africa's Talking API format
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
      const errorMessage = err?.message || 'Failed to create contact'
      if (errorMessage.includes('already in your contacts')) {
        toast.error('Duplicate Contact', {
          description: 'This phone number is already in your contacts',
        })
      } else {
        toast.error('Error', {
          description: errorMessage,
        })
      }
    } finally {
      setIsCreating(false)
    }
  }

  const handleDelete = async (id: number) => {
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

  const handleExportCSV = () => {
    if (!data?.contacts || data.contacts.length === 0) {
      toast.error('No Contacts', {
        description: 'There are no contacts to export',
      })
      return
    }

    try {
      // Create CSV header
      const headers = ['Name', 'Phone Number', 'Email']
      const rows = data.contacts.map(contact => [
        `"${contact.name.replace(/"/g, '""')}"`, // Escape quotes in names
        contact.phoneNumber,
        contact.email ? `"${contact.email.replace(/"/g, '""')}"` : ''
      ])

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n')

      // Create blob and download
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

      // Skip header row
      let successCount = 0
      let errorCount = 0
      const errors: string[] = []

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim()
        if (!line) continue

        // Simple CSV parsing
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
          errors.push(`Row ${i + 1}: Missing name or phone number`)
          errorCount++
          continue
        }

        try {
          // Normalize phone number
          phoneNumber = phoneNumber.replace(/[\+\s]/g, '')
          if (!phoneNumber.startsWith('254')) {
            phoneNumber = '254' + phoneNumber
          }
          phoneNumber = '+' + phoneNumber

          await createContact({
            userId: user?.id,
            name,
            phoneNumber,
            email: email || null,
          })
          successCount++
        } catch (err: any) {
          if (err?.message?.includes('already')) {
            errors.push(`Row ${i + 1}: ${name} already exists`)
          } else {
            errors.push(`Row ${i + 1}: ${err?.message || 'Failed to create'}`)
          }
          errorCount++
        }
      }

      refetch()
      
      if (successCount > 0) {
        toast.success('Import Complete', {
          description: `${successCount} contact(s) imported successfully`,
        })
      }
      
      if (errorCount > 0) {
        toast.error('Import Errors', {
          description: `${errorCount} contact(s) failed to import${errors.length > 0 ? `. ${errors.slice(0, 3).join('; ')}${errors.length > 3 ? '...' : ''}` : ''}`,
        })
      }
    } catch (err) {
      console.error('Failed to import contacts:', err)
      toast.error('Import Failed', {
        description: 'Could not read the CSV file. Please check the format.',
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
        <p className="text-muted-foreground mt-1">Manage your contacts</p>
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
      <div className="flex flex-col sm:flex-row gap-3">
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
                <div className="flex items-center gap-0 mt-1 bg-secondary border border-border rounded-md has-[:focus]:ring-2 has-[:focus]:ring-ring">
                  <span className="px-3 py-2 text-foreground font-medium">+254</span>
                  <Input
                    placeholder="e.g., 719833166"
                    className="flex-1 border-0 bg-transparent text-foreground focus:ring-0"
                    value={newContact.phoneNumber}
                    onChange={(e) => setNewContact({ ...newContact, phoneNumber: e.target.value })}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">Enter the 9-digit phone number (system will format as +254719833166)</p>
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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone..."
            className="pl-10 bg-card border-border text-foreground"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">All Contacts</CardTitle>
          <CardDescription className="text-muted-foreground">
            {isLoading ? 'Loading...' : `${filteredContacts.length} contact${filteredContacts.length !== 1 ? 's' : ''}`}
          </CardDescription>
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
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Name</TableHead>
                    <TableHead className="text-muted-foreground">Phone</TableHead>
                    <TableHead className="text-muted-foreground">Email</TableHead>
                    <TableHead className="text-muted-foreground">Created</TableHead>
                    <TableHead className="text-right text-muted-foreground">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContacts.map((contact) => (
                    <TableRow key={contact.id} className="border-border hover:bg-secondary/50">
                      <TableCell className="font-medium text-foreground">{contact.name}</TableCell>
                      <TableCell className="text-foreground">{contact.phoneNumber}</TableCell>
                      <TableCell className="text-foreground">{contact.email || '-'}</TableCell>
                      <TableCell className="text-foreground text-sm">
                        {new Date(contact.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(contact.id)}
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
    </div>
  )
}
