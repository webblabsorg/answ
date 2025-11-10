'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Target } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface WeakTopic {
  topic: string;
  subtopic?: string;
  correctRate: number;
  questionsAttempted: number;
  averageDifficulty: number;
  recommendedPractice: number;
}

interface WeakTopicsProps {
  weakTopics: WeakTopic[];
  examId: string | null;
}

export function WeakTopics({ weakTopics, examId }: WeakTopicsProps) {
  const router = useRouter();

  if (!weakTopics || weakTopics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Areas for Improvement</CardTitle>
          <CardDescription>Topics that need more practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Target className="h-12 w-12 text-green-500 mb-4" />
            <p className="text-lg font-medium">Great job!</p>
            <p className="text-muted-foreground mt-2">
              You're performing well across all topics. Keep practicing to maintain your level.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          Areas for Improvement
        </CardTitle>
        <CardDescription>
          Focus on these topics to boost your overall performance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {weakTopics.slice(0, 5).map((topic, index) => (
            <div key={index} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{topic.topic}</h4>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{topic.questionsAttempted} questions attempted</span>
                    <span>•</span>
                    <span>{(topic.correctRate * 100).toFixed(0)}% correct</span>
                    <span>•</span>
                    <span>Avg difficulty: {topic.averageDifficulty.toFixed(1)}/5</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-500">
                    {(topic.correctRate * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Target: 70%</div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress to target</span>
                  <span className="font-medium">
                    {Math.min(100, ((topic.correctRate / 0.7) * 100)).toFixed(0)}%
                  </span>
                </div>
                <Progress 
                  value={Math.min(100, (topic.correctRate / 0.7) * 100)} 
                  className="h-2"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {topic.recommendedPractice} more questions
                  </span>{' '}
                  recommended
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => router.push(`/dashboard?examId=${examId}&topic=${encodeURIComponent(topic.topic)}`)}
                >
                  Practice Now
                </Button>
              </div>
            </div>
          ))}
        </div>

        {weakTopics.length > 5 && (
          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/study-plan?examId=${examId}`)}
            >
              View All {weakTopics.length} Topics →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
