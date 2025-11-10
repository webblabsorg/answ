'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, Calendar, Clock, Target, TrendingUp, CheckCircle2, PlayCircle } from 'lucide-react';

export const dynamic = 'force-dynamic';

function StudyPlanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated } = useAuthStore();
  const [selectedExamId, setSelectedExamId] = useState<string | null>(
    searchParams.get('examId')
  );

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch exams
  const { data: exams = [] } = useQuery({
    queryKey: ['exams'],
    queryFn: async () => {
      const response = await apiClient.get('/exams?is_active=true');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Auto-select first exam if none selected
  useEffect(() => {
    if (!selectedExamId && exams.length > 0) {
      setSelectedExamId(exams[0].id);
    }
  }, [exams, selectedExamId]);

  // Fetch study plan
  const { data: studyPlanData, isLoading: loadingStudyPlan } = useQuery({
    queryKey: ['study-plan', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/study-plan/${selectedExamId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  // Fetch recommendations
  const { data: recommendationsData, isLoading: loadingRecommendations } = useQuery({
    queryKey: ['recommendations', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/recommendations/${selectedExamId}?limit=10`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  if (!isAuthenticated) {
    return null;
  }

  const isLoading = loadingStudyPlan || loadingRecommendations;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-500 bg-red-500/10 border-red-500/20';
      case 'medium':
        return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
      default:
        return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <h1 className="text-2xl font-bold">Personalized Study Plan</h1>
            </div>
            <Select value={selectedExamId || ''} onValueChange={setSelectedExamId}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Select exam" />
              </SelectTrigger>
              <SelectContent>
                {exams.map((exam: any) => (
                  <SelectItem key={exam.id} value={exam.id}>
                    {exam.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
              <p className="mt-4 text-muted-foreground">Generating your study plan...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Overview */}
            {studyPlanData && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-primary">
                      <Target className="h-4 w-4" />
                      <span className="text-sm font-medium">Current Ability</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {studyPlanData.currentAbility?.toFixed(2) || 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Target: {studyPlanData.targetScore?.toFixed(2) || 'N/A'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-blue-500">
                      <Clock className="h-4 w-4" />
                      <span className="text-sm font-medium">Study Hours</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {studyPlanData.estimatedHoursNeeded || 0}h
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Total estimated
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-purple-500">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm font-medium">Daily Practice</span>
                    </div>
                    <p className="text-2xl font-bold mt-2">
                      {studyPlanData.recommendedDailyMinutes || 0}m
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Recommended
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-2 text-green-500">
                      <Calendar className="h-4 w-4" />
                      <span className="text-sm font-medium">Completion</span>
                    </div>
                    <p className="text-sm font-bold mt-2">
                      {studyPlanData.projectedCompletionDate
                        ? new Date(studyPlanData.projectedCompletionDate).toLocaleDateString()
                        : 'N/A'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Projected date
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Weak Topics */}
            {studyPlanData?.weakTopics && studyPlanData.weakTopics.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Priority Topics</CardTitle>
                  <CardDescription>
                    Focus on these topics to improve your overall score
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studyPlanData.weakTopics.map((topic: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">{topic.topic}</h4>
                            <p className="text-sm text-muted-foreground">
                              {topic.questionsAttempted} attempted • {(topic.correctRate * 100).toFixed(0)}% correct
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() =>
                              router.push(`/dashboard?examId=${selectedExamId}&topic=${encodeURIComponent(topic.topic)}`)
                            }
                          >
                            <PlayCircle className="mr-2 h-4 w-4" />
                            Practice
                          </Button>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">
                              {topic.recommendedPractice} questions recommended
                            </span>
                            <span>{Math.min(100, (topic.correctRate / 0.7) * 100).toFixed(0)}%</span>
                          </div>
                          <Progress value={Math.min(100, (topic.correctRate / 0.7) * 100)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Milestones */}
            {studyPlanData?.milestones && studyPlanData.milestones.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Study Milestones</CardTitle>
                  <CardDescription>
                    Weekly goals to track your progress
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {studyPlanData.milestones.map((milestone: any, index: number) => (
                      <div key={index} className="flex items-start gap-4 pb-4 border-b last:border-0">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold">
                          {milestone.week}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium">Week {milestone.week}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Target ability: {milestone.targetAbility.toFixed(2)}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {milestone.topics.map((topic: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center rounded-full bg-secondary px-2 py-1 text-xs"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            📊 Complete {milestone.questionsToComplete} questions this week
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recommended Questions */}
            {recommendationsData?.recommendations && recommendationsData.recommendations.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Questions</CardTitle>
                  <CardDescription>
                    Personalized practice questions based on your performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recommendationsData.recommendations.map((rec: any, index: number) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded-full border ${getPriorityColor(
                                rec.priority
                              )}`}
                            >
                              {rec.priority.toUpperCase()}
                            </span>
                            <span className="text-sm font-medium">{rec.topic}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">{rec.reason}</p>
                          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                            <span>Difficulty: {rec.difficulty}/5</span>
                            <span>•</span>
                            <span>Expected improvement: +{(rec.expectedImprovement * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/test?questionId=${rec.questionId}`)}
                        >
                          Try it
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {(!studyPlanData?.weakTopics || studyPlanData.weakTopics.length === 0) && (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center space-y-4">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
                    <div>
                      <h3 className="text-xl font-semibold mb-2">
                        Great Job!
                      </h3>
                      <p className="text-muted-foreground max-w-md mx-auto">
                        You're performing well across all topics. Complete more questions to get personalized recommendations.
                      </p>
                    </div>
                    <Button onClick={() => router.push(`/dashboard?examId=${selectedExamId}`)}>
                      Start Practicing
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function StudyPlanPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading study plan...</p>
        </div>
      </div>
    }>
      <StudyPlanContent />
    </Suspense>
  );
}
