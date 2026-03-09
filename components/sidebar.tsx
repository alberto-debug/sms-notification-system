'use client'

import Image from 'next/image'
import { Users, Send, Clock, FileText, BarChart3, Settings, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/auth'

interface SidebarProps {
  currentPage: string
  onNavigate: (page: string) => void
}

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  const { user, logout } = useAuth()

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'contacts', label: 'Contacts', icon: Users },
    { id: 'composer', label: 'Compose', icon: Send },
    { id: 'templates', label: 'Templates', icon: FileText },
    { id: 'scheduler', label: 'Scheduler', icon: Clock },
    { id: 'reporting', label: 'Reports', icon: BarChart3 },
  ]

  return (
    <div className="w-64 bg-gradient-to-b from-sidebar via-sidebar to-sidebar/95 border-r border-sidebar-border flex flex-col shadow-2xl relative z-50">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Image 
            src="/anu-logo.png" 
            alt="ANU Logo" 
            width={40} 
            height={40}
            className="rounded"
            loading="eager"
          />
          <div className="flex flex-col">
            <h1 className="text-sm font-semibold text-sidebar-foreground">SMS Alert</h1>
            <p className="text-xs text-sidebar-accent-foreground">ANU System</p>
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
              type="button"
              onClick={() => {
                console.log('Navigating to:', item.id)
                onNavigate(item.id)
              }}
              className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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

      {/* User Info & Bottom Section */}
      <div className="p-4 border-t border-sidebar-border space-y-3 bg-gradient-to-t from-sidebar/50 to-transparent">
        {user && (
          <div className="px-3 py-2 bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-lg border border-primary/20">
            <p className="text-xs text-sidebar-accent-foreground font-semibold">Logged in as</p>
            <p className="text-sm font-bold text-sidebar-foreground truncate bg-gradient-to-r from-sidebar-foreground to-primary bg-clip-text text-transparent">{user.email}</p>
          </div>
        )}
        <Button
          variant="outline"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-sidebar-accent/50 hover:border-primary/50"
          size="sm"
        >
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button
          onClick={logout}
          variant="outline"
          className="w-full justify-start gap-2 text-sidebar-foreground hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/50"
          size="sm"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </div>
  )
}
