'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Award,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

export default function AnalyticsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch user's test sessions
  const { data: sessionsData, isLoading } = useQuery({
    queryKey: ['user-test-sessions'],
    queryFn: async () => {
      const response = await apiClient.get('/test-sessions/my-sessions');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const sessions = sessionsData || [];
  const completedSessions = sessions.filter((s: any) => s.status === 'COMPLETED' || s.status === 'GRADED');

  // Calculate statistics
  const totalTests = completedSessions.length;
  const avgScore = totalTests > 0
    ? completedSessions.reduce((sum: number, s: any) => sum + (s.raw_score || 0), 0) / totalTests
    : 0;

  const totalQuestions = completedSessions.reduce((sum: number, s: any) => sum + (s.total_questions || 0), 0);
  const totalCorrect = completedSessions.reduce((sum: number, s: any) => sum + (s.total_correct || 0), 0);
  const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

  const totalTime = completedSessions.reduce((sum: number, s: any) => sum + (s.duration_seconds || 0), 0);
  const avgTimePerTest = totalTests > 0 ? totalTime / totalTests : 0;

  // Score trend data (last 10 tests)
  const scoreTrend = completedSessions
    .slice(-10)
    .map((s: any, index: number) => ({
      test: index + 1,
      score: s.raw_score || 0,
      percentile: s.percentile || 0,
    }));

  // Performance by exam
  const examPerformance: Record<string, any> = {};
  completedSessions.forEach((s: any) => {
    const examName = s.exam?.name || 'Unknown';
    if (!examPerformance[examName]) {
      examPerformance[examName] = {
        exam: examName,
        tests: 0,
        totalScore: 0,
        totalQuestions: 0,
        totalCorrect: 0,
      };
    }
    examPerformance[examName].tests += 1;
    examPerformance[examName].totalScore += s.raw_score || 0;
    examPerformance[examName].totalQuestions += s.total_questions || 0;
    examPerformance[examName].totalCorrect += s.total_correct || 0;
  });

  const examStats = Object.values(examPerformance).map((e: any) => ({
    exam: e.exam,
    avgScore: e.tests > 0 ? Math.round(e.totalScore / e.tests) : 0,
    accuracy: e.totalQuestions > 0 ? Math.round((e.totalCorrect / e.totalQuestions) * 100) : 0,
    tests: e.tests,
  }));

  // Recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentSessions = sessions.filter(
    (s: any) => new Date(s.created_at) >= sevenDaysAgo
  );

  // Daily activity for the last week
  const dailyActivity: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    dailyActivity[dateStr] = 0;
  }
  recentSessions.forEach((s: any) => {
    const dateStr = new Date(s.created_at).toISOString().split('T')[0];
    if (dailyActivity[dateStr] !== undefined) {
      dailyActivity[dateStr]++;
    }
  });

  const activityData = Object.entries(dailyActivity).map(([date, count]) => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    tests: count,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Dashboard
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Your Performance</h1>
                <p className="text-sm text-muted-foreground">Track your progress and achievements</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => router.push('/insights')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              IRT Insights
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : totalTests === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Award className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-2xl font-bold mb-2">No Tests Yet</h2>
              <p className="text-muted-foreground mb-6">
                Start taking practice tests to see your performance analytics
              </p>
              <Button onClick={() => router.push('/dashboard')}>Start a Test</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Tests Completed</CardTitle>
                  <Award className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalTests}</div>
                  <p className="text-xs text-muted-foreground">
                    {recentSessions.length} in last 7 days
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Score</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(avgScore)}%</div>
                  <Progress value={avgScore} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{Math.round(accuracy)}%</div>
                  <p className="text-xs text-muted-foreground">
                    {totalCorrect} / {totalQuestions} correct
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(avgTimePerTest / 60)}m
                  </div>
                  <p className="text-xs text-muted-foreground">Per test</p>
                </CardContent>
              </Card>
            </div>

            {/* Score Trend */}
            {scoreTrend.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Score Progression</CardTitle>
                  <CardDescription>Your last {scoreTrend.length} test scores</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={scoreTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="test" label={{ value: 'Test #', position: 'insideBottom', offset: -5 }} />
                      <YAxis label={{ value: 'Score (%)', angle: -90, position: 'insideLeft' }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="score" stroke="#3b82f6" name="Score" strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* Two column layout */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Performance by Exam */}
              {examStats.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Performance by Exam</CardTitle>
                    <CardDescription>Average scores across different exams</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={examStats}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="exam" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgScore" fill="#3b82f6" name="Avg Score %" />
                        <Bar dataKey="accuracy" fill="#10b981" name="Accuracy %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Tests completed in the last 7 days</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={activityData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="tests" fill="#8b5cf6" name="Tests" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Test History</CardTitle>
                <CardDescription>Your recent test sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {completedSessions.slice(0, 10).map((session: any) => (
                    <div
                      key={session.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent transition-colors cursor-pointer"
                      onClick={() => router.push(`/results/${session.id}`)}
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{session.exam?.name || 'Unknown Exam'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {new Date(session.completed_at || session.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="font-semibold">{Math.round(session.raw_score || 0)}%</div>
                          <div className="text-xs text-muted-foreground">
                            {session.total_correct || 0}/{session.total_questions || 0}
                          </div>
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Call to Action */}
            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0">
              <CardContent className="py-8 text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4" />
                <h3 className="text-2xl font-bold mb-2">Keep Improving!</h3>
                <p className="mb-6 opacity-90">
                  Practice makes perfect. Continue taking tests to track your progress
                </p>
                <Button onClick={() => router.push('/dashboard')} className="bg-white text-blue-600 hover:bg-gray-100">
                  Start Another Test
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
