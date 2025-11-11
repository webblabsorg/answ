'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  AlertTriangle,
  TrendingUp,
  Users,
  DollarSign,
  Mail,
  RefreshCw,
} from 'lucide-react';

export default function AdminPredictionsPage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isAuthenticated, user, router]);

  // Fetch prediction insights
  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['prediction-insights'],
    queryFn: async () => {
      const response = await apiClient.get('/predictions/insights');
      return response.data;
    },
    enabled: isAuthenticated && user?.role === 'ADMIN',
  });

  if (!isAuthenticated || user?.role !== 'ADMIN') {
    return null;
  }

  const churnPredictions = insights?.churnPredictions || [];
  const usageForecasts = insights?.usageForecasts || [];
  const upsellRecommendations = insights?.upsellRecommendations || [];
  const summary = insights?.summary || {};

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-orange-500';
      case 'low':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getConfidenceBadgeColor = (confidence: number) => {
    if (confidence >= 80) return 'bg-green-500';
    if (confidence >= 60) return 'bg-orange-500';
    return 'bg-gray-500';
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => router.push('/admin/analytics')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Analytics
              </Button>
              <div>
                <h1 className="text-2xl font-bold">Predictive Insights</h1>
                <p className="text-sm text-muted-foreground">Churn prediction, forecasts, and recommendations</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">High Risk Users</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-500">{summary.totalAtRisk || 0}</div>
                  <p className="text-xs text-muted-foreground">
                    Potential loss: ${summary.potentialRevenueLoss || 0}/mo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upsell Opportunities</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-500">
                    {summary.totalUpsellOpportunities || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Potential gain: ${summary.potentialRevenueGain || 0}/mo
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">At-Risk Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${summary.potentialRevenueLoss || 0}</div>
                  <p className="text-xs text-muted-foreground">Monthly recurring</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Growth Potential</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${summary.potentialRevenueGain || 0}</div>
                  <p className="text-xs text-muted-foreground">Monthly recurring</p>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="churn" className="space-y-4">
              <TabsList>
                <TabsTrigger value="churn">
                  Churn Risk ({churnPredictions.length})
                </TabsTrigger>
                <TabsTrigger value="forecast">
                  Usage Forecast ({usageForecasts.length})
                </TabsTrigger>
                <TabsTrigger value="upsell">
                  Upsell ({upsellRecommendations.length})
                </TabsTrigger>
              </TabsList>

              {/* Churn Predictions */}
              <TabsContent value="churn" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Churn Risk Predictions</CardTitle>
                    <CardDescription>
                      Users at risk of canceling their subscription
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {churnPredictions.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No high-risk users identified
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {churnPredictions.map((prediction: any) => (
                          <div
                            key={prediction.userId}
                            className="border rounded-lg p-4 hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{prediction.userName}</h4>
                                  <Badge className={getRiskBadgeColor(prediction.churnRisk)}>
                                    {prediction.churnRisk.toUpperCase()}
                                  </Badge>
                                  <Badge variant="outline">{prediction.tier}</Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{prediction.email}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-red-500">
                                  {prediction.churnProbability}%
                                </div>
                                <p className="text-xs text-muted-foreground">Risk Score</p>
                              </div>
                            </div>

                            <div className="space-y-2 mb-3">
                              <p className="text-sm font-medium">Risk Factors:</p>
                              <ul className="text-sm space-y-1">
                                {prediction.factors.map((factor: string, idx: number) => (
                                  <li key={idx} className="text-muted-foreground flex items-start gap-2">
                                    <span className="text-red-500">•</span>
                                    {factor}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="space-y-2 mb-3">
                              <p className="text-sm font-medium">Recommendations:</p>
                              <ul className="text-sm space-y-1">
                                {prediction.recommendations.map((rec: string, idx: number) => (
                                  <li key={idx} className="text-muted-foreground flex items-start gap-2">
                                    <span className="text-green-500">✓</span>
                                    {rec}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" variant="outline">
                                <Mail className="mr-2 h-4 w-4" />
                                Send Email
                              </Button>
                              <Button size="sm" variant="outline">
                                View Profile
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Usage Forecasts */}
              <TabsContent value="forecast" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Forecasts</CardTitle>
                    <CardDescription>
                      Users likely to exceed their limits next month
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {usageForecasts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No users approaching limits
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {usageForecasts.map((forecast: any) => (
                          <div
                            key={forecast.userId}
                            className="border rounded-lg p-4 hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h4 className="font-semibold">{forecast.userName}</h4>
                                <Badge variant="outline" className="mt-1">STARTER</Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-3">
                              <div>
                                <p className="text-sm font-medium mb-1">Current Usage</p>
                                <p className="text-sm text-muted-foreground">
                                  Tests: {forecast.currentUsage.tests}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  AI Messages: {forecast.currentUsage.aiMessages}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-1">Forecast (Next Month)</p>
                                <p className="text-sm text-orange-500">
                                  Tests: {forecast.forecast.testsNextMonth}
                                </p>
                                <p className="text-sm text-orange-500">
                                  AI Messages: {forecast.forecast.aiMessagesNextMonth}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-1 mb-3">
                              {forecast.limitWarnings.map((warning: string, idx: number) => (
                                <div key={idx} className="flex items-start gap-2 text-sm text-orange-500">
                                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                                  {warning}
                                </div>
                              ))}
                            </div>

                            <Button size="sm" variant="outline">
                              <Mail className="mr-2 h-4 w-4" />
                              Suggest Upgrade
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Upsell Recommendations */}
              <TabsContent value="upsell" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Upsell Recommendations</CardTitle>
                    <CardDescription>
                      Users likely to upgrade to a higher tier
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {upsellRecommendations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        No upsell opportunities identified
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {upsellRecommendations.map((rec: any) => (
                          <div
                            key={rec.userId}
                            className="border rounded-lg p-4 hover:bg-accent transition-colors"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold">{rec.userName}</h4>
                                  <Badge className={getConfidenceBadgeColor(rec.confidence)}>
                                    {rec.confidence}% Confidence
                                  </Badge>
                                </div>
                                <p className="text-sm text-muted-foreground">{rec.email}</p>
                              </div>
                              <div className="text-right">
                                <div className="text-xl font-bold text-green-500">
                                  +${rec.potentialRevenue}
                                </div>
                                <p className="text-xs text-muted-foreground">per month</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 mb-3">
                              <Badge variant="outline">{rec.currentTier}</Badge>
                              <span className="text-muted-foreground">→</span>
                              <Badge className="bg-blue-500">{rec.recommendedTier}</Badge>
                            </div>

                            <div className="space-y-2 mb-3">
                              <p className="text-sm font-medium">Reasons:</p>
                              <ul className="text-sm space-y-1">
                                {rec.reasons.map((reason: string, idx: number) => (
                                  <li key={idx} className="text-muted-foreground flex items-start gap-2">
                                    <span className="text-blue-500">•</span>
                                    {reason}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <span>Engagement Score: {rec.engagementScore}/100</span>
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm">
                                <Mail className="mr-2 h-4 w-4" />
                                Send Upgrade Offer
                              </Button>
                              <Button size="sm" variant="outline">
                                View Profile
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}
