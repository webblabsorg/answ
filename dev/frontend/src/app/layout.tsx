import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Answly - Exam Practice Platform',
  description: 'AI-powered exam practice and preparation platform for GRE, SAT, GMAT and more',
  manifest: '/manifest.json',
  // themeColor and viewport moved to dedicated exports to avoid Next warnings
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Answly',
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#4f46e5',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Answly" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        {process.env.NODE_ENV === 'development' ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}if('caches' in window){caches.keys().then(keys=>keys.forEach(k=>caches.delete(k)));}}catch(e){}`,
            }}
          />
        ) : null}
      </head>
      <body className={`${inter.className} bg-black text-white`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
