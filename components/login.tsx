'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useAuth } from '@/context/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, Lock, AlertCircle } from 'lucide-react'

export default function Login() {
  const { login, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login')
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-center">
          <div className="text-sm text-muted-foreground">
            Centralized SMS Notification Platform
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="flex-1 bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border shadow-2xl bg-gradient-to-br from-card via-card to-muted">
          <CardHeader className="space-y-4 text-center">
            <div className="flex justify-center mb-6">
              <Image 
                src="/anu-logo.png" 
                alt="ANU Logo" 
                width={140} 
                height={140}
                className="rounded-lg"
                loading="eager"
              />
            </div>
            <CardTitle className="text-3xl font-bold text-black">Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your SMS notification system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 bg-background border-input text-foreground placeholder-muted-foreground"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 bg-background border-input text-foreground placeholder-muted-foreground"
                    minLength={6}
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Password must be at least 6 characters
                </p>
              </div>

              <Button
                type="submit"
                disabled={isLoading || !email || password.length < 6}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-4">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 SMS Alert System. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Africa Nazarene University
          </p>
        </div>
      </footer>
    </div>
  )
}
