import { Button } from '@/components/ui/button'

interface TestHeaderProps {
  examName: string
  questionNumber: number
  totalQuestions: number
  timeRemaining: number
  onSubmit: () => void
}

export function TestHeader({
  examName,
  questionNumber,
  totalQuestions,
  timeRemaining,
  onSubmit,
}: TestHeaderProps) {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const isLowTime = timeRemaining > 0 && timeRemaining < 300 // Less than 5 minutes

  return (
    <header className="border-b bg-card sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Exam Name */}
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-primary">Answly</div>
          <div className="border-l pl-4">
            <div className="text-sm text-muted-foreground">Practice Test</div>
            <div className="font-semibold">{examName}</div>
          </div>
        </div>

        {/* Center: Progress */}
        <div className="text-sm text-muted-foreground">
          Question {questionNumber} of {totalQuestions}
        </div>

        {/* Right: Timer & Submit */}
        <div className="flex items-center gap-4">
          <div className={`text-lg font-mono font-semibold ${isLowTime ? 'text-destructive' : ''}`}>
            {formatTime(timeRemaining)}
          </div>
          <Button onClick={onSubmit} variant="outline" size="sm">
            Submit Test
          </Button>
        </div>
      </div>
    </header>
  )
}
