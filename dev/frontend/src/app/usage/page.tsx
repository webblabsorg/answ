'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  TrendingUp, 
  MessageSquare, 
  FileText, 
  Zap, 
  AlertTriangle,
  CheckCircle2,
  BarChart3,
} from 'lucide-react';

export default function UsagePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch usage stats
  const { data: usageStats, isLoading } = useQuery({
    queryKey: ['usage-stats'],
    queryFn: async () => {
      const response = await apiClient.get('/usage/stats');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Fetch usage history
  const { data: usageHistory } = useQuery({
    queryKey: ['usage-history'],
    queryFn: async () => {
      const response = await apiClient.get('/usage/history?months=3');
      return response.data.history;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const tier = usageStats?.tier || 'STARTER';
  const limits = usageStats?.limits || {};
  const current = usageStats?.current || {};
  const percentages = usageStats?.percentages || {};
  const warnings = usageStats?.warnings || [];

  const tierNames: Record<string, string> = {
    STARTER: 'Free',
    GROW: 'Grow',
    SCALE: 'Scale',
    ENTERPRISE: 'Enterprise',
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-500';
    if (percentage >= 75) return 'text-orange-500';
    return 'text-green-500';
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 75) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const formatLimit = (limit: number) => {
    return limit === -1 ? 'Unlimited' : limit.toLocaleString();
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
              <div>
                <h1 className="text-2xl font-bold">Usage & Limits</h1>
                <p className="text-sm text-muted-foreground">
                  Track your feature usage and plan limits
                </p>
              </div>
            </div>
            <Button onClick={() => router.push('/subscription/manage')}>
              <Zap className="mr-2 h-4 w-4" />
              Manage Subscription
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Plan Banner */}
            <Card className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
              <CardContent className="py-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm opacity-90">Current Plan</p>
                    <h2 className="text-3xl font-bold">{tierNames[tier]}</h2>
                  </div>
                  {tier === 'STARTER' && (
                    <Button
                      onClick={() => router.push('/')}
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Warnings */}
            {warnings.length > 0 && (
              <Alert className="border-orange-500 bg-orange-50 dark:bg-orange-950">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <AlertDescription className="ml-2">
                  <div className="space-y-1">
                    {warnings.map((warning: string, index: number) => (
                      <p key={index} className="text-sm">{warning}</p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Usage Cards */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Tests */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-500" />
                      <CardTitle className="text-lg">Practice Tests</CardTitle>
                    </div>
                    {percentages.tests < 90 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-3xl font-bold">{current.tests || 0}</span>
                      <span className="text-sm text-muted-foreground">
                        / {formatLimit(limits.tests_per_month)}
                      </span>
                    </div>
                    {limits.tests_per_month !== -1 && (
                      <>
                        <Progress 
                          value={percentages.tests} 
                          className="h-2"
                        />
                        <p className={`text-sm mt-1 ${getUsageColor(percentages.tests)}`}>
                          {percentages.tests}% used
                        </p>
                      </>
                    )}
                  </div>
                  {limits.tests_per_month === -1 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      Unlimited
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* AI Tutor Messages */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-5 w-5 text-purple-500" />
                      <CardTitle className="text-lg">AI Tutor</CardTitle>
                    </div>
                    {percentages.ai_tutor_messages < 90 && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between mb-2">
                      <span className="text-3xl font-bold">{current.ai_tutor_messages || 0}</span>
                      <span className="text-sm text-muted-foreground">
                        / {formatLimit(limits.ai_tutor_messages)}
                      </span>
                    </div>
                    {limits.ai_tutor_messages !== -1 && (
                      <>
                        <Progress 
                          value={percentages.ai_tutor_messages} 
                          className="h-2"
                        />
                        <p className={`text-sm mt-1 ${getUsageColor(percentages.ai_tutor_messages)}`}>
                          {percentages.ai_tutor_messages}% used
                        </p>
                      </>
                    )}
                  </div>
                  {limits.ai_tutor_messages === -1 && (
                    <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                      Unlimited
                    </Badge>
                  )}
                </CardContent>
              </Card>

              {/* Question Generations */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-orange-500" />
                      <CardTitle className="text-lg">Generations</CardTitle>
                    </div>
                    {limits.question_generations === 0 && (
                      <Badge variant="secondary" className="text-xs">Not available</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {limits.question_generations === 0 ? (
                    <div>
                      <p className="text-sm text-muted-foreground mb-3">
                        Question generation is not available in your current plan
                      </p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => router.push('/')}
                      >
                        Upgrade to Access
                      </Button>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-3xl font-bold">{current.question_generations || 0}</span>
                        <span className="text-sm text-muted-foreground">
                          / {formatLimit(limits.question_generations)}
                        </span>
                      </div>
                      {limits.question_generations !== -1 && (
                        <>
                          <Progress 
                            value={percentages.question_generations} 
                            className="h-2"
                          />
                          <p className={`text-sm mt-1 ${getUsageColor(percentages.question_generations)}`}>
                            {percentages.question_generations}% used
                          </p>
                        </>
                      )}
                      {limits.question_generations === -1 && (
                        <Badge variant="secondary" className="bg-green-500/10 text-green-500">
                          Unlimited
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Usage History Chart */}
            {usageHistory && usageHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    <CardTitle>Usage History</CardTitle>
                  </div>
                  <CardDescription>Your usage over the last 3 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {usageHistory.map((month: any, index: number) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{month.month}</span>
                          <div className="flex gap-4 text-sm">
                            <span className="text-muted-foreground">
                              Tests: <strong>{month.tests}</strong>
                            </span>
                            <span className="text-muted-foreground">
                              AI Tutor: <strong>{month.ai_tutor_messages}</strong>
                            </span>
                            {month.question_generations > 0 && (
                              <span className="text-muted-foreground">
                                Generations: <strong>{month.question_generations}</strong>
                              </span>
                            )}
                          </div>
                        </div>
                        {index < usageHistory.length - 1 && <div className="border-t" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Call to Action */}
            {tier === 'STARTER' && (
              <Card className="border-2 border-blue-500">
                <CardContent className="py-8 text-center">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 text-blue-500" />
                  <h3 className="text-2xl font-bold mb-2">Need More?</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Upgrade to a paid plan for unlimited tests, AI tutor messages, and access to all premium features.
                  </p>
                  <Button size="lg" onClick={() => router.push('/')}>
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
