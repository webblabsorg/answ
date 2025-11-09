import { Button } from '@/components/ui/button'
import { Check, Flag, Circle } from 'lucide-react'

interface Question {
  id: string
  user_answer?: any
  is_flagged?: boolean
  order: number
}

interface NavigationPanelProps {
  questions: Question[]
  currentIndex: number
  onNavigate: (index: number) => void
}

export function NavigationPanel({
  questions,
  currentIndex,
  onNavigate,
}: NavigationPanelProps) {
  const getQuestionStatus = (question: Question) => {
    if (question.user_answer !== undefined && question.user_answer !== null) {
      return 'answered'
    }
    return 'unanswered'
  }

  const getStatusIcon = (question: Question, index: number) => {
    const status = getQuestionStatus(question)
    const isCurrent = index === currentIndex

    if (status === 'answered') {
      return <Check className="h-4 w-4" />
    }
    return <Circle className="h-4 w-4" />
  }

  const getButtonVariant = (index: number) => {
    if (index === currentIndex) return 'default'
    const question = questions[index]
    if (question.user_answer !== undefined && question.user_answer !== null) {
      return 'secondary'
    }
    return 'outline'
  }

  return (
    <div className="w-80 border-l bg-card p-4 overflow-y-auto">
      <div className="mb-4">
        <h3 className="font-semibold mb-2">Question Navigator</h3>
        <p className="text-sm text-muted-foreground">
          Click any question to jump to it
        </p>
      </div>

      {/* Legend */}
      <div className="mb-4 p-3 bg-secondary/20 rounded-md space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border-2 border-primary bg-primary rounded flex items-center justify-center">
            <span className="text-xs text-primary-foreground">1</span>
          </div>
          <span className="text-muted-foreground">Current</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border bg-secondary rounded flex items-center justify-center">
            <Check className="h-4 w-4" />
          </div>
          <span className="text-muted-foreground">Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 border rounded flex items-center justify-center">
            <Circle className="h-4 w-4" />
          </div>
          <span className="text-muted-foreground">Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <Flag className="h-4 w-4 text-destructive fill-current" />
          <span className="text-muted-foreground">Flagged</span>
        </div>
      </div>

      {/* Summary */}
      <div className="mb-4 p-3 bg-secondary/20 rounded-md text-sm">
        <div className="flex justify-between mb-1">
          <span className="text-muted-foreground">Answered:</span>
          <span className="font-semibold">
            {questions.filter(q => q.user_answer !== undefined && q.user_answer !== null).length} / {questions.length}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Flagged:</span>
          <span className="font-semibold">
            {questions.filter(q => q.is_flagged).length}
          </span>
        </div>
      </div>

      {/* Question Grid */}
      <div className="grid grid-cols-5 gap-2">
        {questions.map((question, index) => (
          <Button
            key={question.id}
            variant={getButtonVariant(index)}
            size="sm"
            onClick={() => onNavigate(index)}
            className="relative h-10 w-full"
          >
            {question.is_flagged && (
              <Flag className="absolute top-0 right-0 h-3 w-3 text-destructive fill-current" />
            )}
            {getStatusIcon(question, index)}
            <span className="ml-1">{index + 1}</span>
          </Button>
        ))}
      </div>

      {/* Flagged Questions */}
      {questions.some(q => q.is_flagged) && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Flagged Questions</h4>
          <div className="space-y-1">
            {questions
              .filter(q => q.is_flagged)
              .map((question, idx) => {
                const index = questions.indexOf(question)
                return (
                  <Button
                    key={question.id}
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigate(index)}
                    className="w-full justify-start"
                  >
                    <Flag className="h-3 w-3 mr-2 text-destructive fill-current" />
                    Question {index + 1}
                  </Button>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
