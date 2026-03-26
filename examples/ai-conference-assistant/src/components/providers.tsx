'use client'

import { ThemeProvider } from 'next-themes'
import type { ReactNode } from 'react'
import { I18nProvider } from '@/i18n/context'

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <I18nProvider>{children}</I18nProvider>
    </ThemeProvider>
  )
}
