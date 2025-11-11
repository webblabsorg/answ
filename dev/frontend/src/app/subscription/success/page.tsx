'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';

export default function SubscriptionSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    // Optionally refresh user data or subscription status
    // queryClient.invalidateQueries(['subscriptions']);
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center space-y-6">
          {/* Success Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-green-500/10 p-4">
              <CheckCircle2 className="h-16 w-16 text-green-500" />
            </div>
          </div>

          {/* Success Message */}
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome to Premium!
            </h1>
            <p className="text-muted-foreground">
              Your subscription has been successfully activated. You now have access to all premium features.
            </p>
          </div>

          {/* Features Unlocked */}
          <div className="bg-accent rounded-lg p-4 text-left space-y-2">
            <p className="font-semibold text-sm">Features Unlocked:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✨ Unlimited practice tests</li>
              <li>🤖 Unlimited AI tutor conversations</li>
              <li>🎯 Personalized study plans</li>
              <li>🗣️ Voice input and output</li>
              <li>📊 Advanced analytics and insights</li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Start Practicing
            </Button>
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground">
            You can manage your subscription anytime in your account settings.
          </p>
        </div>
      </Card>
    </div>
  );
}
