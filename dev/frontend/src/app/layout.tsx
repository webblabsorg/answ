import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'
import { LanguagePicker } from '@/components/home/LanguagePicker'
import { HelpCircle } from 'lucide-react'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Answly - Exam Practice Platform',
  description: 'AI-powered exam practice and preparation platform for GRE, SAT, GMAT and more',
  manifest: process.env.NODE_ENV === 'production' ? '/manifest.json' : undefined,
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
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {process.env.NODE_ENV === 'production' ? (
          <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        ) : null}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Answly" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var h=location.hostname;var isLocal = h==='localhost'||h==='127.0.0.1'||h.endsWith('.local');if(isLocal && 'serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(rs=>rs.forEach(r=>r.unregister()));}if(isLocal && 'caches' in window){caches.keys().then(keys=>keys.forEach(k=>caches.delete(k)));}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} bg-black text-white`}>
        {/* Skip to content link for accessibility */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Skip to main content
        </a>
        <Providers>
          <div id="main-content">{children}</div>
          <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3">
            <LanguagePicker />
            <a
              href="/help"
              className="inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-400 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              title="Help and support"
              aria-label="Help and support"
            >
              <HelpCircle className="h-4 w-4" />
            </a>
          </div>
        </Providers>
      </body>
    </html>
  )
}
