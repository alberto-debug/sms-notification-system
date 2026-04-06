'use client'

import { useAuth } from '@/context/auth'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect } from 'react'
import Sidebar from '@/components/sidebar'
import Login from '@/components/login'

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { isAuthenticated, isLoading, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  // Auto logout when server disconnects
  useEffect(() => {
    const checkServerConnection = async () => {
      try {
        await fetch('/api/auth/login')
      } catch (error) {
        logout()
        router.push('/')
      }
    }

    const interval = setInterval(checkServerConnection, 5000)
    return () => clearInterval(interval)
  }, [logout, router])

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

  const getPageFromPathname = (pathname: string) => {
    if (pathname.includes('/dashboard')) return 'dashboard'
    if (pathname.includes('/contacts')) return 'contacts'
    if (pathname.includes('/composer')) return 'composer'
    if (pathname.includes('/templates')) return 'templates'
    if (pathname.includes('/scheduler')) return 'scheduler'
    if (pathname.includes('/reports')) return 'reporting'
    return 'dashboard'
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        currentPage={getPageFromPathname(pathname)} 
        onNavigate={(page) => {
          const pathMap: Record<string, string> = {
            dashboard: '/dashboard',
            contacts: '/contacts',
            composer: '/composer',
            templates: '/templates',
            scheduler: '/scheduler',
            reporting: '/reports',
          }
          router.push(pathMap[page] || '/dashboard')
        }} 
      />
      <main className="flex-1 overflow-auto relative">
        {children}
      </main>
    </div>
  )
}
