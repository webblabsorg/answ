'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { AbilityChart } from '@/components/insights/AbilityChart';
import { WeakTopics } from '@/components/insights/WeakTopics';
import { PerformanceMetrics } from '@/components/insights/PerformanceMetrics';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

function InsightsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();
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

  // Fetch ability profile
  const { data: abilityData, isLoading: loadingAbility } = useQuery({
    queryKey: ['ability', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/ability/${selectedExamId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  // Fetch ability progression
  const { data: progressionData, isLoading: loadingProgression } = useQuery({
    queryKey: ['ability-progression', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/ability/${selectedExamId}/progression`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  // Fetch performance insights
  const { data: insightsData, isLoading: loadingInsights } = useQuery({
    queryKey: ['insights', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/insights/${selectedExamId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  // Fetch weak topics
  const { data: weakTopicsData, isLoading: loadingWeakTopics } = useQuery({
    queryKey: ['weak-topics', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/weak-topics/${selectedExamId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  // Fetch study time recommendations
  const { data: studyTimeData } = useQuery({
    queryKey: ['study-time', selectedExamId],
    queryFn: async () => {
      const response = await apiClient.get(`/irt/study-time/${selectedExamId}`);
      return response.data;
    },
    enabled: isAuthenticated && !!selectedExamId,
  });

  if (!isAuthenticated) {
    return null;
  }

  const isLoading = loadingAbility || loadingProgression || loadingInsights || loadingWeakTopics;

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
              <h1 className="text-2xl font-bold">Performance Insights</h1>
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
              <p className="mt-4 text-muted-foreground">Loading insights...</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Performance Metrics */}
            <PerformanceMetrics
              insights={insightsData?.insights}
              ability={abilityData}
              studyTime={studyTimeData?.recommendations}
            />

            {/* Ability Chart */}
            <AbilityChart
              progression={progressionData?.progression || []}
              currentAbility={abilityData?.abilityEstimate}
            />

            {/* Weak Topics */}
            <WeakTopics
              weakTopics={weakTopicsData?.weakTopics || []}
              examId={selectedExamId}
            />

            {/* Call to Action */}
            <div className="rounded-lg border bg-card p-6 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to Improve?</h3>
              <p className="text-muted-foreground mb-4">
                Get personalized study recommendations based on your performance
              </p>
              <div className="flex gap-3 justify-center">
                <Button onClick={() => router.push(`/study-plan?examId=${selectedExamId}`)}>
                  View Study Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => router.push(`/dashboard?examId=${selectedExamId}`)}
                >
                  Start Practicing
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function InsightsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent" />
          <p className="mt-4 text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    }>
      <InsightsContent />
    </Suspense>
  );
}
