import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Flag } from 'lucide-react'

interface Question {
  id: string
  question_text: string
  question_type: string
  options?: any
  topic: string
  difficulty_level: number
}

interface QuestionRendererProps {
  question: Question
  answer?: any
  onAnswerChange: (answer: any) => void
  isFlagged: boolean
  onFlagToggle: () => void
}

export function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  isFlagged,
  onFlagToggle,
}: QuestionRendererProps) {
  const renderQuestionContent = () => {
    switch (question.question_type) {
      case 'MULTIPLE_CHOICE':
        return (
          <RadioGroup
            value={answer?.answer || ''}
            onValueChange={(value) => onAnswerChange({ answer: value })}
          >
            <div className="space-y-3">
              {question.options?.map((option: any) => (
                <div key={option.id} className="flex items-center space-x-2">
                  <RadioGroupItem value={option.id} id={`option-${option.id}`} />
                  <Label
                    htmlFor={`option-${option.id}`}
                    className="flex-1 cursor-pointer p-3 border rounded-md hover:bg-accent"
                  >
                    <span className="font-semibold mr-2">{option.id}.</span>
                    {option.text}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )

      case 'MULTIPLE_SELECT':
        const selectedAnswers = answer?.answers || []
        return (
          <div className="space-y-3">
            {question.options?.map((option: any) => (
              <div key={option.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`option-${option.id}`}
                  checked={selectedAnswers.includes(option.id)}
                  onCheckedChange={(checked) => {
                    const newAnswers = checked
                      ? [...selectedAnswers, option.id]
                      : selectedAnswers.filter((id: string) => id !== option.id)
                    onAnswerChange({ answers: newAnswers })
                  }}
                />
                <Label
                  htmlFor={`option-${option.id}`}
                  className="flex-1 cursor-pointer p-3 border rounded-md hover:bg-accent"
                >
                  <span className="font-semibold mr-2">{option.id}.</span>
                  {option.text}
                </Label>
              </div>
            ))}
            <p className="text-sm text-muted-foreground mt-2">
              Select all that apply
            </p>
          </div>
        )

      case 'NUMERIC_INPUT':
        return (
          <div className="max-w-md">
            <Label htmlFor="numeric-answer">Your Answer</Label>
            <Input
              id="numeric-answer"
              type="number"
              placeholder="Enter a number"
              value={answer?.answer || ''}
              onChange={(e) => onAnswerChange({ answer: parseFloat(e.target.value) || '' })}
              className="text-lg"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Enter your answer as a number
            </p>
          </div>
        )

      case 'TEXT_INPUT':
        return (
          <div>
            <Label htmlFor="text-answer">Your Answer</Label>
            <Input
              id="text-answer"
              type="text"
              placeholder="Type your answer"
              value={answer?.answer || ''}
              onChange={(e) => onAnswerChange({ answer: e.target.value })}
              className="text-lg"
            />
          </div>
        )

      case 'ESSAY':
        return (
          <div>
            <Label htmlFor="essay-answer">Your Essay</Label>
            <Textarea
              id="essay-answer"
              placeholder="Write your essay here..."
              value={answer?.answer || ''}
              onChange={(e) => onAnswerChange({ answer: e.target.value })}
              rows={15}
              className="font-mono"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Word count: {(answer?.answer || '').split(/\s+/).filter(Boolean).length}
            </p>
          </div>
        )

      case 'TRUE_FALSE':
        return (
          <RadioGroup
            value={answer?.answer || ''}
            onValueChange={(value) => onAnswerChange({ answer: value })}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="true" id="option-true" />
                <Label
                  htmlFor="option-true"
                  className="flex-1 cursor-pointer p-3 border rounded-md hover:bg-accent"
                >
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="false" id="option-false" />
                <Label
                  htmlFor="option-false"
                  className="flex-1 cursor-pointer p-3 border rounded-md hover:bg-accent"
                >
                  False
                </Label>
              </div>
            </div>
          </RadioGroup>
        )

      default:
        return <p className="text-muted-foreground">Unsupported question type</p>
    }
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Question Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-medium text-muted-foreground">{question.topic}</span>
            <span className="text-xs px-2 py-1 bg-secondary rounded">
              Difficulty: {question.difficulty_level}/5
            </span>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onFlagToggle}
          className={isFlagged ? 'text-destructive' : ''}
        >
          <Flag className={`h-4 w-4 ${isFlagged ? 'fill-current' : ''}`} />
          <span className="ml-2">{isFlagged ? 'Flagged' : 'Flag'}</span>
        </Button>
      </div>

      {/* Question Text */}
      <div className="mb-8">
        <div className="text-lg leading-relaxed whitespace-pre-wrap">
          {question.question_text}
        </div>
      </div>

      {/* Answer Options */}
      <div>{renderQuestionContent()}</div>
    </div>
  )
}
