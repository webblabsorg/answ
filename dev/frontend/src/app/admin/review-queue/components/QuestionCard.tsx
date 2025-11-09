'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';

interface QuestionCardProps {
  question: any;
  bulkMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRevise: (notes: string) => void;
}

export function QuestionCard({
  question,
  bulkMode,
  selected,
  onToggleSelect,
  onApprove,
  onReject,
  onRevise,
}: QuestionCardProps) {
  const [showDetails, setShowDetails] = useState(false);

  const handleReject = () => {
    const reason = window.prompt('Why are you rejecting this question?');
    if (reason) {
      onReject(reason);
    }
  };

  const handleRevise = () => {
    const notes = window.prompt('What needs to be revised?');
    if (notes) {
      onRevise(notes);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 0.9) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
    if (score >= 0.8) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
    if (score >= 0.7) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
  };

  return (
    <Card className={selected ? 'ring-2 ring-blue-500' : ''}>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex items-start gap-3">
            {bulkMode && (
              <Checkbox
                checked={selected}
                onCheckedChange={onToggleSelect}
                className="mt-1"
              />
            )}
            <div>
              <div className="flex gap-2 mb-2">
                <Badge variant="outline">{question.topic}</Badge>
                {question.subtopic && <Badge variant="outline">{question.subtopic}</Badge>}
                <Badge>Difficulty: {question.difficulty_level}/5</Badge>
                <Badge variant="secondary">{question.question_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {question.generation_job?.exam?.name} ({question.generation_job?.exam?.code})
                </span>
                <Badge className={getQualityColor(question.quality_score || 0)}>
                  Quality: {((question.quality_score || 0) * 100).toFixed(0)}%
                </Badge>
                <span className="text-sm text-muted-foreground">
                  ${question.generation_cost?.toFixed(4)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Question:</h3>
          <p className="whitespace-pre-wrap">{question.question_text}</p>
        </div>

        {question.question_type === 'MULTIPLE_CHOICE' && question.options && (
          <div>
            <h4 className="font-semibold mb-2">Options:</h4>
            <ul className="space-y-2">
              {question.options.map((opt: any) => (
                <li
                  key={opt.id}
                  className={`pl-4 ${opt.correct ? 'text-green-600 dark:text-green-400 font-bold' : ''}`}
                >
                  {opt.id}. {opt.text}
                  {opt.correct && <Badge className="ml-2" variant="default">Correct</Badge>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {question.explanation && (
          <div>
            <h4 className="font-semibold mb-2">Explanation:</h4>
            <p className="text-muted-foreground whitespace-pre-wrap">{question.explanation}</p>
          </div>
        )}

        {question.validation_warnings?.length > 0 && (
          <Alert className="bg-yellow-50 dark:bg-yellow-950">
            <AlertTitle>Validation Warnings</AlertTitle>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {question.validation_warnings.map((warning: string, idx: number) => (
                <li key={idx} className="text-sm">{warning}</li>
              ))}
            </ul>
          </Alert>
        )}

        {question.validation_errors?.length > 0 && (
          <Alert className="bg-red-50 dark:bg-red-950">
            <AlertTitle>Validation Errors</AlertTitle>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {question.validation_errors.map((error: string, idx: number) => (
                <li key={idx} className="text-sm">{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {showDetails && (
          <div className="border-t pt-4 space-y-2 text-sm text-muted-foreground">
            <p><strong>AI Provider:</strong> {question.ai_provider}</p>
            <p><strong>AI Model:</strong> {question.ai_model}</p>
            <p><strong>Generated:</strong> {new Date(question.created_at).toLocaleString()}</p>
            <p><strong>Question ID:</strong> {question.id}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Show'} Details
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={bulkMode}
          >
            Reject
          </Button>
          <Button
            variant="secondary"
            onClick={handleRevise}
            disabled={bulkMode}
          >
            Request Revision
          </Button>
          <Button
            onClick={onApprove}
            disabled={bulkMode}
          >
            Approve & Publish
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
