'use client'

import { useState } from 'react'
import Sidebar from '@/components/sidebar'
import Dashboard from '@/components/dashboard'
import Contacts from '@/components/contacts'
import Composer from '@/components/composer'
import Scheduler from '@/components/scheduler'
import Templates from '@/components/templates'
import Reporting from '@/components/reporting'

export default function Home() {
  const [currentPage, setCurrentPage] = useState('dashboard')

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
