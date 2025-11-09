import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">Answly</div>
          <nav className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost">Login</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">
            Master Your Exam with
            <span className="text-primary"> AI-Powered Practice</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            High-fidelity practice tests for GRE, SAT, GMAT, and more. 
            Experience real exam conditions with instant feedback and personalized learning.
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8">
                Start Free Trial
              </Button>
            </Link>
            <Link href="/exams">
              <Button size="lg" variant="outline" className="text-lg px-8">
                Browse Exams
              </Button>
            </Link>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mt-16 max-w-4xl mx-auto">
            <div className="p-6 border rounded-lg bg-card">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-semibold mb-2">Realistic Exams</h3>
              <p className="text-muted-foreground">
                Pixel-perfect replicas of actual exam interfaces
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <div className="text-4xl mb-4">🤖</div>
              <h3 className="text-lg font-semibold mb-2">AI Tutor</h3>
              <p className="text-muted-foreground">
                Get instant explanations and personalized study plans
              </p>
            </div>
            <div className="p-6 border rounded-lg bg-card">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-semibold mb-2">Advanced Analytics</h3>
              <p className="text-muted-foreground">
                Track progress with IRT scoring and percentile rankings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>&copy; 2024 Answly. All rights reserved.</p>
        </div>
      </footer>
    </main>
  )
}
