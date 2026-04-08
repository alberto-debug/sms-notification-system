'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Edit, Trash2, AlertCircle, Loader } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/context/auth'
import { useFetch, usePost } from '@/hooks/use-api'
import { toast } from 'sonner'

interface Template {
  id: number
  name: string
  content: string
  variables?: string
  createdAt: string
}

export default function Templates() {
  const { user } = useAuth()
  const [newTemplate, setNewTemplate] = useState({ name: '', content: '' })
  const [isCreating, setIsCreating] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  
  const { data, isLoading, error, refetch } = useFetch<{ templates: Template[] }>(
    '/api/templates',
    { userId: user?.id }
  )
  const { post: createTemplate } = usePost('/api/templates')

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim() || !newTemplate.content.trim()) {
      toast.error('Missing Fields', {
        description: 'Please fill in both template name and content',
      })
      return
    }

    try {
      setIsCreating(true)
      await createTemplate({
        userId: user?.id,
        name: newTemplate.name,
        content: newTemplate.content,
      })
      setNewTemplate({ name: '', content: '' })
      refetch()
      toast.success('Template Created', {
        description: `Template "${newTemplate.name}" created successfully`,
      })
    } catch (err) {
      console.error('Failed to create template:', err)
      toast.error('Failed to Create', {
        description: err instanceof Error ? err.message : 'An error occurred',
      })
    } finally {
      setIsCreating(false)
    }
  }

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return
    
    if (!editingTemplate.name.trim() || !editingTemplate.content.trim()) {
      toast.error('Missing Fields', {
        description: 'Please fill in both template name and content',
      })
      return
    }

    try {
      setIsUpdating(true)
      const response = await fetch(`/api/templates/${editingTemplate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.id,
          name: editingTemplate.name,
          content: editingTemplate.content,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update template')
      }

      setEditingTemplate(null)
      setIsEditDialogOpen(false)
      refetch()
      toast.success('Template Updated', {
        description: `Template "${editingTemplate.name}" updated successfully`,
      })
    } catch (err) {
      console.error('Failed to update template:', err)
      toast.error('Failed to Update', {
        description: err instanceof Error ? err.message : 'An error occurred',
      })
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        const response = await fetch(`/api/templates/${id}?userId=${user?.id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete template')
        }

        refetch()
        toast.success('Template Deleted', {
          description: 'Template has been deleted',
        })
      } catch (err) {
        console.error('Failed to delete template:', err)
        toast.error('Failed to Delete', {
          description: err instanceof Error ? err.message : 'An error occurred',
        })
      }
    }
  }

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template)
    setIsEditDialogOpen(true)
  }

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
                <Input
                  placeholder="e.g., Exam Reminder"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Message Content</label>
                <Textarea
                  placeholder="Type your template. Use {variable} for dynamic content."
                  className="bg-secondary border-border text-foreground mt-1 min-h-24"
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                />
              </div>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={handleCreateTemplate}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/50 rounded-lg p-4 flex gap-2">
          <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
          <div>
            <p className="font-medium text-destructive">Failed to load templates</p>
            <p className="text-sm text-destructive/80">{error}</p>
          </div>
        </div>
      )}

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : data?.templates && data.templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data.templates.map(template => (
            <Card key={template.id} className="bg-card border-border hover:border-accent/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="text-card-foreground">{template.name}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground line-clamp-3 bg-secondary p-3 rounded-md">
                  {template.content}
                </p>

                <p className="text-xs text-muted-foreground">
                  Created {new Date(template.createdAt).toLocaleDateString()}
                </p>

                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-border text-foreground gap-2 hover:bg-blue-500/10"
                    onClick={() => openEditDialog(template)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-border text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No templates yet. Create one to get started!</p>
        </div>
      )}

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="text-foreground">Edit Template</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Update your SMS template
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Template Name</label>
                <Input
                  placeholder="e.g., Exam Reminder"
                  className="bg-secondary border-border text-foreground mt-1"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Message Content</label>
                <Textarea
                  placeholder="Type your template. Use {variable} for dynamic content."
                  className="bg-secondary border-border text-foreground mt-1 min-h-24"
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                />
              </div>
              <div className="flex gap-2 pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-border"
                  onClick={() => setIsEditDialogOpen(false)}
                  disabled={isUpdating}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-primary hover:bg-primary/90"
                  onClick={handleUpdateTemplate}
                  disabled={isUpdating}
                >
                  {isUpdating ? 'Updating...' : 'Update Template'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
