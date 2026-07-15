import type { Metadata } from 'next'

import './globals.css'



export const metadata: Metadata = {
  title: 'SAVAN Certificate Portal',
  description: 'Save Accident Victims Association of Nigeria — BLS/AED Certificate Verification & Management',
  icons: { icon: '/images/savan-logo.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body >{children}</body>
    </html>
  )
}
