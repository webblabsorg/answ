'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function StartTestButton({ examId, questionCount }: { examId: string; questionCount: number }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleStartTest = async () => {
    if (questionCount === 0) {
      alert('No questions available for this exam yet.')
      return
    }

    setLoading(true)
    try {
      const response = await apiClient.post('/test-sessions', {
        exam_id: examId,
        is_practice_mode: true,
      })
      
      const sessionId = response.data.session.id
      router.push(`/test/${sessionId}`)
    } catch (error: any) {
      console.error('Failed to start test:', error)
      alert(error.response?.data?.message || 'Failed to start test. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleStartTest} disabled={loading || questionCount === 0}>
      {loading ? 'Starting...' : questionCount === 0 ? 'No Questions Available' : 'Start Full Test'}
    </Button>
  )
}

interface ExamSection {
  id: string
  name: string
  section_order: number
  duration_minutes: number
  question_count: number
  description: string
  _count: {
    questions: number
  }
}

interface Exam {
  id: string
  name: string
  code: string
  category: string
  description: string
  duration_minutes: number
  total_sections: number
  total_questions: number
  passing_score: number
  sections: ExamSection[]
  _count: {
    questions: number
    test_sessions: number
  }
}

export default function ExamDetailPage() {
  const params = useParams()
  const examId = params.id as string
  const [exam, setExam] = useState<Exam | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchExam()
  }, [examId])

  const fetchExam = async () => {
    try {
      const response = await apiClient.get(`/exams/${examId}`)
      setExam(response.data)
    } catch (error) {
      console.error('Failed to fetch exam:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading exam details...</p>
      </div>
    )
  }

  if (!exam) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Exam not found</p>
          <Link href="/exams">
            <Button>Back to Exams</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="text-2xl font-bold text-primary cursor-pointer">answly</div>
          </Link>
          <nav className="flex gap-4">
            <Link href="/exams">
              <Button variant="ghost">← Back to Exams</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Exam Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold mb-2">{exam.code}</h1>
              <p className="text-xl text-muted-foreground">{exam.name}</p>
            </div>
            <Badge className="text-base px-4 py-2">
              {exam.category.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">{exam.description}</p>
        </div>

        {/* Quick Stats */}
        <div className="grid md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Duration</CardDescription>
              <CardTitle className="text-2xl">{exam.duration_minutes} min</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Sections</CardDescription>
              <CardTitle className="text-2xl">{exam.total_sections}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Questions Available</CardDescription>
              <CardTitle className="text-2xl">{exam._count.questions}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Passing Score</CardDescription>
              <CardTitle className="text-2xl">{exam.passing_score || 'N/A'}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="sections" className="w-full">
          <TabsList>
            <TabsTrigger value="sections">Sections</TabsTrigger>
            <TabsTrigger value="practice">Practice Options</TabsTrigger>
          </TabsList>

          <TabsContent value="sections" className="mt-6">
            <div className="space-y-4">
              {exam.sections.map((section) => (
                <Card key={section.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>
                          Section {section.section_order}: {section.name}
                        </CardTitle>
                        <CardDescription className="mt-2">
                          {section.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Duration</p>
                        <p className="text-lg font-medium">{section.duration_minutes} minutes</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Questions</p>
                        <p className="text-lg font-medium">{section.question_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Available Questions</p>
                        <p className="text-lg font-medium">{section._count.questions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="practice" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Start Practicing</CardTitle>
                <CardDescription>
                  Choose how you want to practice for this exam
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Full-Length Practice Test</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Take a complete {exam.duration_minutes}-minute exam simulation with all sections
                  </p>
                  <StartTestButton examId={exam.id} questionCount={exam._count.questions} />
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Practice by Section</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Focus on specific sections to improve targeted skills
                  </p>
                  <Button variant="outline" disabled>
                    Choose Section (Coming Soon)
                  </Button>
                </div>
                <div className="p-4 border rounded-lg">
                  <h3 className="font-semibold mb-2">Custom Practice Set</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create a custom set with specific topics and difficulty levels
                  </p>
                  <Button variant="outline" disabled>
                    Build Custom Set (Coming Soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
