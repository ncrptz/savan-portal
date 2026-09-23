import type { Metadata } from 'next'
import './globals.css'
import { getSettings } from '@/lib/settings'

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings()
  return {
    title: `${s.site_name} Certificate Portal`,
    description: 'Save Accident Victims Association of Nigeria — BLS/AED Certificate Verification & Management',
    icons: { icon: s.favicon_url || s.logo_url || '/images/savan-logo.png' },
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
