// src/app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'react-hot-toast'
import { AmbientBackdrop } from '@/components/layout/AmbientBackdrop'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title: { default: 'AIU CS Hub', template: '%s | AIU CS Hub' },
  description: 'The ultimate study platform for Alamein International University — Computer Science',
  keywords: ['AIU', 'Alamein', 'CS', 'Computer Science', 'Study', 'Database Systems', 'Differential Equations'],
  authors: [{ name: 'Yousef Elserafy' }],
  robots: 'index, follow',
  openGraph: {
    type: 'website',
    title: 'AIU CS Hub',
    description: 'Complete study platform for AIU CS students',
    siteName: 'AIU CS Hub',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#0d0d11',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700;800&family=Instrument+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Noto+Kufi+Arabic:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AmbientBackdrop />
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#17171e',
              color: '#f4f3f6',
              border: '1px solid rgba(244,243,246,0.1)',
              borderRadius: '12px',
              fontFamily: "'Instrument Sans', 'Noto Kufi Arabic', sans-serif",
              fontSize: '14px',
            },
          }}
        />
      </body>
    </html>
  )
}
