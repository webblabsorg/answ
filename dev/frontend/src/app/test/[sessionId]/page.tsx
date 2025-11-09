'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { TestHeader } from '@/components/test/TestHeader'
import { QuestionRenderer } from '@/components/test/QuestionRenderer'
import { NavigationPanel } from '@/components/test/NavigationPanel'
import { useTestSession } from '@/hooks/useTestSession'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { Button } from '@/components/ui/button'

interface Question {
  id: string
  question_text: string
  question_type: string
  options?: any
  topic: string
  difficulty_level: number
  time_estimate_seconds: number
  user_answer?: any
  is_flagged?: boolean
  time_spent_seconds?: number
  order: number
}

interface TestSession {
  id: string
  exam: {
    id: string
    name: string
    code: string
    duration_minutes: number
  }
  status: string
  is_practice_mode: boolean
  total_questions: number
  total_attempted: number
  started_at?: string
  duration_minutes: number
}

export default function TestPage() {
  const params = useParams()
  const router = useRouter()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<TestSession | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [startTime, setStartTime] = useState<Date | null>(null)
  const [timeRemaining, setTimeRemaining] = useState<number>(0)

  // Keyboard shortcuts for test navigation
  useKeyboardShortcuts([
    {
      key: 'n',
      action: handleNext,
      description: 'Next question',
    },
    {
      key: 'p',
      action: handlePrevious,
      description: 'Previous question',
    },
    {
      key: 'f',
      action: handleFlagToggle,
      description: 'Flag question',
    },
    {
      key: 's',
      ctrlKey: true,
      action: () => {
        handleSubmitTest();
      },
      description: 'Submit test (Ctrl+S)',
    },
  ], session?.status === 'IN_PROGRESS')

  useEffect(() => {
    loadSession()
  }, [sessionId])

  // Timer effect
  useEffect(() => {
    if (!session || session.status !== 'IN_PROGRESS' || !startTime) return

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000)
      const totalTime = session.duration_minutes * 60
      const remaining = Math.max(0, totalTime - elapsed)
      
      setTimeRemaining(remaining)

      if (remaining === 0) {
        handleTimeUp()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [session, startTime])

  const loadSession = async () => {
    try {
      const response = await apiClient.get(`/test-sessions/${sessionId}`)
      setSession(response.data.session)
      setQuestions(response.data.questions)

      if (response.data.session.status === 'NOT_STARTED') {
        // Auto-start the session
        await startSession()
      } else if (response.data.session.started_at) {
        setStartTime(new Date(response.data.session.started_at))
      }
    } catch (error) {
      console.error('Failed to load session:', error)
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const startSession = async () => {
    try {
      const response = await apiClient.post(`/test-sessions/${sessionId}/start`)
      setStartTime(new Date())
      setSession(prev => prev ? { ...prev, status: 'IN_PROGRESS', started_at: new Date().toISOString() } : null)
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  const handleAnswerChange = async (answer: any) => {
    const currentQuestion = questions[currentQuestionIndex]
    
    // Update local state immediately
    const updatedQuestions = [...questions]
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      user_answer: answer,
    }
    setQuestions(updatedQuestions)

    // Submit to server
    try {
      await apiClient.post(`/test-sessions/${sessionId}/submit-answer`, {
        question_id: currentQuestion.id,
        user_answer: answer,
        time_spent_seconds: currentQuestion.time_spent_seconds || 0,
      })
    } catch (error) {
      console.error('Failed to submit answer:', error)
    }
  }

  async function handleFlagToggle() {
    const currentQuestion = questions[currentQuestionIndex]
    const newFlagState = !currentQuestion.is_flagged

    // Update local state
    const updatedQuestions = [...questions]
    updatedQuestions[currentQuestionIndex] = {
      ...currentQuestion,
      is_flagged: newFlagState,
    }
    setQuestions(updatedQuestions)

    // Submit to server
    try {
      await apiClient.post(`/test-sessions/${sessionId}/submit-answer`, {
        question_id: currentQuestion.id,
        user_answer: currentQuestion.user_answer,
        is_flagged: newFlagState,
      })
    } catch (error) {
      console.error('Failed to toggle flag:', error)
    }
  }

  const handleNavigate = (index: number) => {
    setCurrentQuestionIndex(index)
  }

  function handleNext() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
    }
  }

  function handlePrevious() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
    }
  }

  async function handleTimeUp() {
    await handleSubmitTest()
  }

  async function handleSubmitTest() {
    if (!confirm('Are you sure you want to submit your test? You cannot change your answers after submission.')) {
      return
    }

    try {
      await apiClient.post(`/test-sessions/${sessionId}/complete`)
      router.push(`/results/${sessionId}`)
    } catch (error) {
      console.error('Failed to submit test:', error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading test...</p>
      </div>
    )
  }

  if (!session || !questions.length) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Test session not found</p>
          <Button onClick={() => router.push('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  const currentQuestion = questions[currentQuestionIndex]

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <TestHeader
        examName={session.exam.name}
        questionNumber={currentQuestionIndex + 1}
        totalQuestions={questions.length}
        timeRemaining={timeRemaining}
        onSubmit={handleSubmitTest}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Main Question Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <QuestionRenderer
            question={currentQuestion}
            answer={currentQuestion.user_answer}
            onAnswerChange={handleAnswerChange}
            isFlagged={currentQuestion.is_flagged || false}
            onFlagToggle={handleFlagToggle}
          />

          {/* Navigation Buttons */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
            >
              ← Previous
            </Button>

            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>

            {currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNext}>
                Next →
              </Button>
            ) : (
              <Button onClick={handleSubmitTest} variant="default">
                Submit Test
              </Button>
            )}
          </div>
        </div>

        {/* Navigation Panel */}
        <NavigationPanel
          questions={questions}
          currentIndex={currentQuestionIndex}
          onNavigate={handleNavigate}
        />
      </div>
    </div>
  )
}
