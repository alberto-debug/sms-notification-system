'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/context/auth'
import Login from '@/components/login'
import Sidebar from '@/components/sidebar'
import Dashboard from '@/components/dashboard'
import Contacts from '@/components/contacts'
import Composer from '@/components/composer'
import Scheduler from '@/components/scheduler'
import Templates from '@/components/templates'
import Reporting from '@/components/reporting'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const [currentPage, setCurrentPage] = useState('dashboard')

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="inline-block">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />
      case 'contacts':
        return <Contacts />
      case 'composer':
        return <Composer />
      case 'scheduler':
        return <Scheduler />
      case 'templates':
        return <Templates />
      case 'reporting':
        return <Reporting />
      default:
        return <Dashboard />
    }
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} />
      <main className="flex-1 overflow-auto">
        {renderPage()}
      </main>
    </div>
  )
}
