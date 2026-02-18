'use client'

import { MessageSquare, Users, Send, Clock, FileText, BarChart3, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'composer', label: 'Compose', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'scheduler', label: 'Scheduler', icon: Clock },
    { id: 'reporting', label: 'Reports', icon: MessageSquare },
  ]

  return (
    <div className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-sidebar-primary flex items-center justify-center">
            <MessageSquare className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-sidebar-foreground">SMS Alert</h1>
            <p className="text-xs text-sidebar-accent-foreground">ANU</p>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-auto">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.id

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-2">
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          size="sm"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent"
          size="sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
