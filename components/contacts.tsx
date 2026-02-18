'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload, Download, Search, Filter, Trash2 } from 'lucide-react'

export default function Contacts() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDept, setFilterDept] = useState('all')

  const contacts = [
    { id: 1, name: 'John Doe', phone: '+254712345678', department: 'Engineering', year: '3rd Year', type: 'Student' },
    { id: 2, name: 'Jane Smith', phone: '+254723456789', department: 'Business', year: '4th Year', type: 'Student' },
    { id: 3, name: 'Dr. Peter Ochieng', phone: '+254734567890', department: 'Engineering', year: 'N/A', type: 'Lecturer' },
    { id: 4, name: 'Prof. Mary Kipchoge', phone: '+254745678901', department: 'Science', year: 'N/A', type: 'Lecturer' },
    { id: 5, name: 'Robert Kiplagat', phone: '+254756789012', department: 'Business', year: '1st Year', type: 'Student' },
    { id: 6, name: 'Alice Muriuki', phone: '+254767890123', department: 'Engineering', year: '2nd Year', type: 'Student' },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Contact Management</h1>
        <p className="text-muted-foreground mt-1">Manage students and staff contacts</p>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button className="bg-primary hover:bg-primary/90 gap-2">
          <Plus className="w-4 h-4" />
          Add Contact
        </Button>
        <Button variant="outline" className="gap-2 border-border text-foreground">
          <Upload className="w-4 h-4" />
          Import CSV
        </Button>
        <Button variant="outline" className="gap-2 border-border text-foreground">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
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
        <Select value={filterDept} onValueChange={setFilterDept}>
          <SelectTrigger className="w-full sm:w-40 bg-card border-border text-foreground">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            <SelectItem value="all">All Departments</SelectItem>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="science">Science</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground">All Contacts</CardTitle>
          <CardDescription className="text-muted-foreground">{contacts.length} total contacts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Name</TableHead>
                  <TableHead className="text-muted-foreground">Phone</TableHead>
                  <TableHead className="text-muted-foreground">Department</TableHead>
                  <TableHead className="text-muted-foreground">Type</TableHead>
                  <TableHead className="text-muted-foreground">Year</TableHead>
                  <TableHead className="text-right text-muted-foreground">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => (
                  <TableRow key={contact.id} className="border-border hover:bg-secondary/50">
                    <TableCell className="font-medium text-foreground">{contact.name}</TableCell>
                    <TableCell className="text-foreground">{contact.phone}</TableCell>
                    <TableCell className="text-foreground">{contact.department}</TableCell>
                    <TableCell>
                      <Badge variant={contact.type === 'Student' ? 'default' : 'secondary'}>
                        {contact.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-foreground">{contact.year}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">4,234</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Lecturers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">156</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-foreground">4,390</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
