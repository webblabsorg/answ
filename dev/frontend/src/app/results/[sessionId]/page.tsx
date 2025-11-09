'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { apiClient } from '@/lib/api-client'
import { Check, X, Flag, TrendingUp } from 'lucide-react'

interface Results {
  session: {
    id: string
    total_questions: number
    total_correct: number
    raw_score: number
    scaled_score: number
    percentile: number
    completed_at: string
  }
  exam: {
    id: string
    name: string
    code: string
  }
  section_breakdown: Array<{
    section_name: string
    correct: number
    total: number
    percentage: number
  }>
  topic_performance: Array<{
    topic: string
    correct: number
    total: number
    percentage: number
  }>
  questions: Array<{
    id: string
    question_text: string
    question_type: string
    options?: any
    correct_answer: any
    user_answer: any
    is_correct: boolean
    explanation?: string
    topic: string
    difficulty_level: number
  }>
}

export default function ResultsPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string
  const [loading, setLoading] = useState(true)
  const [results, setResults] = useState<Results | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadResults()
  }, [sessionId])

  const loadResults = async () => {
    try {
      const response = await apiClient.get(`/test-sessions/${sessionId}/results`)
      setResults(response.data)
    } catch (err: any) {
      console.error('Failed to load results:', err)
      setError(err.response?.data?.message || 'Failed to load results')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading results...</p>
      </div>
    )
  }

  if (error || !results) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>Error Loading Results</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error || 'Results not found'}</p>
            <Link href="/dashboard">
              <Button>Back to Dashboard</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const scorePercentage = (results.session.total_correct / results.session.total_questions) * 100

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/">
            <div className="text-2xl font-bold text-primary cursor-pointer">Answly</div>
          </Link>
          <div className="flex gap-2">
            <Link href="/dashboard">
              <Button variant="ghost">Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Score Summary */}
        <Card className="mb-8">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl mb-2">Test Results</CardTitle>
            <CardDescription>{results.exam.name} ({results.exam.code})</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-4 gap-6 mb-6">
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-4xl font-bold text-primary mb-2">
                  {results.session.scaled_score}
                </div>
                <div className="text-sm text-muted-foreground">Scaled Score</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {results.session.total_correct}/{results.session.total_questions}
                </div>
                <div className="text-sm text-muted-foreground">Correct Answers</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {scorePercentage.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Accuracy</div>
              </div>
              
              <div className="text-center p-4 bg-secondary/20 rounded-lg">
                <div className="text-4xl font-bold mb-2">
                  {results.session.percentile}th
                </div>
                <div className="text-sm text-muted-foreground">Percentile</div>
              </div>
            </div>

            <div className="text-center">
              {scorePercentage >= 80 ? (
                <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">Excellent Performance!</Badge>
              ) : scorePercentage >= 60 ? (
                <Badge className="bg-blue-100 text-blue-800 text-lg px-4 py-2">Good Job!</Badge>
              ) : (
                <Badge className="bg-orange-100 text-orange-800 text-lg px-4 py-2">Keep Practicing!</Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detailed Analysis */}
        <Tabs defaultValue="sections" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sections">Section Breakdown</TabsTrigger>
            <TabsTrigger value="topics">Topic Performance</TabsTrigger>
            <TabsTrigger value="questions">Question Review</TabsTrigger>
          </TabsList>

          {/* Section Breakdown */}
          <TabsContent value="sections" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Section Breakdown</CardTitle>
                <CardDescription>Your performance by section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.section_breakdown.map((section, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{section.section_name}</h3>
                        <Badge>
                          {section.correct}/{section.total} ({section.percentage.toFixed(0)}%)
                        </Badge>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${section.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Topic Performance */}
          <TabsContent value="topics" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Topic Performance</CardTitle>
                <CardDescription>Identify your strengths and areas for improvement</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {results.topic_performance.map((topic, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold">{topic.topic}</h3>
                        <div className="flex items-center gap-2">
                          {topic.percentage >= 70 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : null}
                          <Badge variant={topic.percentage >= 70 ? 'default' : 'secondary'}>
                            {topic.correct}/{topic.total} ({topic.percentage.toFixed(0)}%)
                          </Badge>
                        </div>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${topic.percentage >= 70 ? 'bg-green-600' : 'bg-orange-500'}`}
                          style={{ width: `${topic.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Question Review */}
          <TabsContent value="questions" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Question-by-Question Review</CardTitle>
                <CardDescription>Review all questions with correct answers and explanations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {results.questions.map((q, idx) => (
                    <div key={q.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Question {idx + 1}</span>
                          <Badge variant="outline">{q.topic}</Badge>
                          {q.is_correct ? (
                            <Check className="h-5 w-5 text-green-600" />
                          ) : (
                            <X className="h-5 w-5 text-destructive" />
                          )}
                        </div>
                        <Badge className={q.is_correct ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {q.is_correct ? 'Correct' : 'Incorrect'}
                        </Badge>
                      </div>

                      <p className="mb-4 whitespace-pre-wrap">{q.question_text}</p>

                      {/* Show options for MCQ */}
                      {q.question_type === 'MULTIPLE_CHOICE' && q.options && (
                        <div className="space-y-2 mb-4">
                          {q.options.map((opt: any) => (
                            <div
                              key={opt.id}
                              className={`p-3 rounded border ${
                                opt.id === q.correct_answer?.answer
                                  ? 'bg-green-50 border-green-500'
                                  : opt.id === q.user_answer?.answer && !q.is_correct
                                  ? 'bg-red-50 border-red-500'
                                  : 'bg-secondary/20'
                              }`}
                            >
                              <span className="font-semibold mr-2">{opt.id}.</span>
                              {opt.text}
                              {opt.id === q.correct_answer?.answer && (
                                <Check className="inline ml-2 h-4 w-4 text-green-600" />
                              )}
                              {opt.id === q.user_answer?.answer && !q.is_correct && (
                                <X className="inline ml-2 h-4 w-4 text-destructive" />
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Show user's answer and correct answer */}
                      <div className="grid md:grid-cols-2 gap-4 mb-4 text-sm">
                        <div className="p-3 bg-secondary/20 rounded">
                          <div className="font-semibold mb-1">Your Answer:</div>
                          <div>{JSON.stringify(q.user_answer?.answer || 'No answer')}</div>
                        </div>
                        <div className="p-3 bg-green-50 rounded">
                          <div className="font-semibold mb-1">Correct Answer:</div>
                          <div>{JSON.stringify(q.correct_answer?.answer)}</div>
                        </div>
                      </div>

                      {/* Explanation */}
                      {q.explanation && (
                        <div className="p-4 bg-blue-50 rounded-lg">
                          <div className="font-semibold mb-2">Explanation:</div>
                          <p className="text-sm">{q.explanation}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Actions */}
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/dashboard">
            <Button size="lg">Back to Dashboard</Button>
          </Link>
          <Link href={`/exams/${results.exam.id}`}>
            <Button size="lg" variant="outline">Practice Again</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
