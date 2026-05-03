import type { Metadata } from 'next'
import { AppProviders } from '@/components/providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'HackMD Conference Assistant',
  description: 'AI-powered collaborative note generator for conferences using HackMD API',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans text-foreground bg-background">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  )
}
