'use client'

import { useAuth } from '@/context/auth'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import Login from '@/components/login'

export default function Home() {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard')
    }
  }, [isAuthenticated, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background" suppressHydrationWarning>
        <div className="text-center space-y-4" suppressHydrationWarning>
          <div className="inline-block" suppressHydrationWarning>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" suppressHydrationWarning></div>
          </div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Login />
  }

  return null
}
