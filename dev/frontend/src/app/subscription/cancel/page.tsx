'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function SubscriptionCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8">
        <div className="text-center space-y-6">
          {/* Cancel Icon */}
          <div className="flex justify-center">
            <div className="rounded-full bg-orange-500/10 p-4">
              <XCircle className="h-16 w-16 text-orange-500" />
            </div>
          </div>

          {/* Cancel Message */}
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Checkout Canceled
            </h1>
            <p className="text-muted-foreground">
              Your subscription was not activated. No charges were made to your account.
            </p>
          </div>

          {/* Message */}
          <div className="bg-accent rounded-lg p-4 text-left">
            <p className="text-sm">
              <strong>Changed your mind?</strong> You can try again anytime. Your progress and data are safe.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            <Button
              onClick={() => router.push('/')}
              className="w-full"
            >
              Back to Home
            </Button>
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="w-full"
            >
              Continue with Free Plan
            </Button>
          </div>

          {/* Help Text */}
          <p className="text-xs text-muted-foreground">
            Need help? Contact our support team at support@answly.com
          </p>
        </div>
      </Card>
    </div>
  );
}
