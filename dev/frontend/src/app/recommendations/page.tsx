'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  Lightbulb,
  Zap,
  Target,
  TrendingUp,
  CheckCircle2,
} from 'lucide-react';

export default function RecommendationsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['user-recommendations'],
    queryFn: async () => {
      const response = await apiClient.get('/predictions/recommendations');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return null;
  }

  const learningPath = recommendations?.learningPath || [];
  const features = recommendations?.features || [];
  const upgrade = recommendations?.upgrade;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-orange-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Personalized Recommendations</h1>
              <p className="text-sm text-muted-foreground">
                Suggestions to improve your learning experience
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Upgrade Recommendation */}
            {upgrade && (
              <Card className="border-2 border-blue-500 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                <CardHeader>
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-6 w-6 text-blue-500" />
                    <CardTitle>Recommended Upgrade</CardTitle>
                  </div>
                  <CardDescription>
                    Based on your usage patterns, we think you'd benefit from upgrading
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {upgrade.tier}
                    </Badge>
                    <Badge className="bg-blue-500 text-lg px-4 py-2">
                      {upgrade.confidence}% Match
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold">Why upgrade?</p>
                    <ul className="space-y-1">
                      {upgrade.reasons.map((reason: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-blue-500 mt-0.5" />
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <p className="font-semibold">You'll get:</p>
                    <ul className="space-y-1">
                      {upgrade.benefits.map((benefit: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Button size="lg" className="w-full" onClick={() => router.push('/')}>
                    <Zap className="mr-2 h-4 w-4" />
                    View Plans
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Learning Path */}
            {learningPath.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-orange-500" />
                    <CardTitle>Your Learning Path</CardTitle>
                  </div>
                  <CardDescription>
                    Next steps to improve your test preparation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {learningPath.map((item: any, idx: number) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-accent transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold">{item.title}</h4>
                              {item.priority && (
                                <Badge className={getPriorityColor(item.priority)}>
                                  {item.priority.toUpperCase()}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="outline">
                          {item.action}
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Feature Recommendations */}
            {features.length > 0 && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    <CardTitle>Discover Features</CardTitle>
                  </div>
                  <CardDescription>
                    Features you haven't tried yet
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {features.map((feature: any, idx: number) => (
                      <div
                        key={idx}
                        className="border rounded-lg p-4 hover:bg-accent transition-colors cursor-pointer"
                        onClick={() => {
                          if (feature.action === 'View Insights') router.push('/insights');
                          else if (feature.action === 'Start a Test') router.push('/dashboard');
                          else if (feature.action === 'Try AI Tutor') router.push('/tutor');
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                            {feature.icon === 'chart' && <TrendingUp className="h-5 w-5 text-blue-500" />}
                            {feature.icon === 'lightbulb' && <Lightbulb className="h-5 w-5 text-yellow-500" />}
                            {!feature.icon && <Zap className="h-5 w-5 text-blue-500" />}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-semibold mb-1">{feature.title}</h4>
                            <p className="text-sm text-muted-foreground">{feature.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!upgrade && learningPath.length === 0 && features.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
                  <h2 className="text-2xl font-bold mb-2">You're All Set!</h2>
                  <p className="text-muted-foreground mb-6">
                    You're making great progress. Keep up the excellent work!
                  </p>
                  <Button onClick={() => router.push('/dashboard')}>
                    Continue Studying
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
