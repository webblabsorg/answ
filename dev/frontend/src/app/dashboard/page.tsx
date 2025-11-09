'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/auth-store'
import { Button } from '@/components/ui/button'

export default function DashboardPage() {
  const router = useRouter()
  const { user, isAuthenticated, clearAuth } = useAuthStore()

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login')
    }
  }, [isAuthenticated, router])

  const handleLogout = () => {
    clearAuth()
    router.push('/')
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Answly</div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              {user?.name} ({user?.tier})
            </span>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name}!</h1>
        <p className="text-muted-foreground mb-8">
          Ready to practice? Choose an exam to get started.
        </p>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6">
          <Link href="/exams" className="block">
            <div className="p-6 border rounded-lg bg-card hover:border-primary transition-colors cursor-pointer h-full">
              <h3 className="text-lg font-semibold mb-2">📚 Browse Exams</h3>
              <p className="text-sm text-muted-foreground mb-4">
                View all available practice exams and start studying
              </p>
            </div>
          </Link>
          <div className="p-6 border rounded-lg bg-card opacity-60">
            <h3 className="text-lg font-semibold mb-2">📊 My Progress</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Track your performance and analytics
            </p>
            <p className="text-xs text-muted-foreground">Coming in Session 3</p>
          </div>
          <div className="p-6 border rounded-lg bg-card opacity-60">
            <h3 className="text-lg font-semibold mb-2">🎯 Study Plan</h3>
            <p className="text-sm text-muted-foreground mb-4">
              AI-powered personalized study recommendations
            </p>
            <p className="text-xs text-muted-foreground">Coming in Phase 2</p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-8 p-6 bg-primary/5 border border-primary/20 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">✅ Phase 1 - Session 2: Exam Catalog</h3>
          <p className="text-muted-foreground">
            Exam catalog is now live! Browse exams, view details, and explore questions. Test-taking interface coming in Session 3.
          </p>
        </div>
      </main>
    </div>
  )
}
