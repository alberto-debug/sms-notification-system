'use client'

import { useTheme } from 'next-themes'
import { Toaster as Sonner, ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'dark' } = useTheme()

  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      gap={8}
      richColors
      style={
        {
          '--normal-bg': '#18181b',
          '--normal-text': '#fafafa',
          '--normal-border': '#27272a',
          '--success-bg': 'rgb(34, 197, 94)',
          '--success-text': '#ffffff',
          '--success-border': 'rgb(34, 197, 94)',
          '--error-bg': 'rgb(239, 68, 68)',
          '--error-text': '#ffffff',
          '--error-border': 'rgb(239, 68, 68)',
          '--warning-bg': 'rgb(249, 115, 22)',
          '--warning-text': '#ffffff',
          '--warning-border': 'rgb(249, 115, 22)',
          '--info-bg': 'rgb(59, 130, 246)',
          '--info-text': '#ffffff',
          '--info-border': 'rgb(59, 130, 246)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
