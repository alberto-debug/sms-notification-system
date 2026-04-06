import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/context/auth'
import { ThemeProvider } from '@/components/theme-provider'
import { Toaster } from 'sonner'
import { initializeServer } from '@/lib/server-init'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'SMS Notification System',
  description: 'Centralized SMS notification platform for Africa Nazarene University',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/anu-logo.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/anu-logo.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/anu-logo.png',
  },
}

// Initialize server (database, etc.) on app startup
initializeServer().catch((error) => {
  console.error('Server initialization error:', error)
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
            {children}
          </ThemeProvider>
        </AuthProvider>
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
