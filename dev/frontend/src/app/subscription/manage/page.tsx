'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth-store';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, CheckCircle2, XCircle, Calendar, CreditCard, Loader2Icon } from 'lucide-react';

export default function ManageSubscriptionPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Fetch current subscription
  const { data: subscriptionData, isLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: async () => {
      const response = await apiClient.get('/subscriptions/current');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiClient.delete('/subscriptions', {
        data: { cancelAtPeriodEnd: true },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      alert('Subscription will be canceled at the end of the billing period');
    },
  });

  // Resume subscription mutation
  const resumeMutation = useMutation({
    mutationFn: async () => {
      await apiClient.post('/subscriptions/resume');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      alert('Subscription resumed successfully');
    },
  });

  // Open billing portal
  const handleBillingPortal = async () => {
    try {
      const response = await apiClient.post('/subscriptions/portal', {
        returnUrl: window.location.href,
      });
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
      alert('Failed to open billing portal. Please try again.');
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2Icon className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const subscription = subscriptionData?.subscription;
  const tier = subscriptionData?.tier || 'STARTER';
  const limits = subscriptionData?.limits;

  const tierNames: Record<string, string> = {
    STARTER: 'Free',
    GROW: 'Grow',
    SCALE: 'Scale',
    ENTERPRISE: 'Enterprise',
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-500',
    TRIALING: 'bg-blue-500',
    PAST_DUE: 'bg-orange-500',
    CANCELED: 'bg-red-500',
    UNPAID: 'bg-red-500',
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/dashboard')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Current Plan */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Current Plan</CardTitle>
                  <CardDescription>Manage your subscription and billing</CardDescription>
                </div>
                {subscription && (
                  <Badge className={statusColors[subscription.status] || 'bg-gray-500'}>
                    {subscription.status}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Plan Info */}
              <div className="flex items-center justify-between p-4 bg-accent rounded-lg">
                <div>
                  <h3 className="text-2xl font-bold">{tierNames[tier]}</h3>
                  {subscription && (
                    <p className="text-sm text-muted-foreground">
                      {subscription.cancel_at_period_end
                        ? 'Cancels on '
                        : 'Renews on '}
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  )}
                  {!subscription && <p className="text-sm text-muted-foreground">Free forever</p>}
                </div>
                {tier !== 'STARTER' && (
                  <Button onClick={handleBillingPortal}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Billing
                  </Button>
                )}
              </div>

              {/* Usage Limits */}
              {limits && (
                <div>
                  <h4 className="font-semibold mb-3">Plan Features</h4>
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between p-3 bg-accent rounded">
                      <span className="text-sm">Tests per month</span>
                      <span className="font-semibold">
                        {limits.tests_per_month === -1 ? 'Unlimited' : limits.tests_per_month}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent rounded">
                      <span className="text-sm">AI Tutor messages</span>
                      <span className="font-semibold">
                        {limits.ai_tutor_messages === -1 ? 'Unlimited' : limits.ai_tutor_messages}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent rounded">
                      <span className="text-sm">Question generations</span>
                      <span className="font-semibold">
                        {limits.question_generations === -1
                          ? 'Unlimited'
                          : limits.question_generations === 0
                          ? 'Not available'
                          : limits.question_generations}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent rounded">
                      <span className="text-sm">Exams access</span>
                      <span className="font-semibold">
                        {limits.exams_access === -1 ? 'All exams' : `${limits.exams_access} exam`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent rounded">
                      <span className="text-sm">Voice input/output</span>
                      {limits.voice_input ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <div className="flex items-center justify-between p-3 bg-accent rounded">
                      <span className="text-sm">API access</span>
                      {limits.api_access ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-4 border-t space-y-3">
                {tier === 'STARTER' ? (
                  <Button onClick={() => router.push('/')} className="w-full">
                    Upgrade Plan
                  </Button>
                ) : (
                  <>
                    {subscription?.cancel_at_period_end ? (
                      <Button
                        onClick={() => resumeMutation.mutate()}
                        disabled={resumeMutation.isPending}
                        className="w-full"
                      >
                        Resume Subscription
                      </Button>
                    ) : (
                      <Button
                        onClick={() => {
                          if (
                            confirm(
                              'Are you sure you want to cancel? Your subscription will remain active until the end of your billing period.',
                            )
                          ) {
                            cancelMutation.mutate();
                          }
                        }}
                        disabled={cancelMutation.isPending}
                        variant="destructive"
                        className="w-full"
                      >
                        {cancelMutation.isPending ? 'Canceling...' : 'Cancel Subscription'}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing History */}
          {subscription && (
            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
                <CardDescription>View your past invoices and payments</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleBillingPortal} variant="outline" className="w-full">
                  <Calendar className="mr-2 h-4 w-4" />
                  View Full Billing History
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Support */}
          <Card>
            <CardHeader>
              <CardTitle>Need Help?</CardTitle>
              <CardDescription>We're here to assist you</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                If you have any questions about your subscription or billing, our support team is ready to help.
              </p>
              <Button variant="outline" className="w-full">
                Contact Support
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
