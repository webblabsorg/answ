'use client';

import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle2 } from 'lucide-react';

interface UpgradePromptProps {
  isOpen: boolean;
  onClose: () => void;
  reason?: string;
  featureType?: 'test' | 'ai_tutor' | 'question_generation' | 'voice_input' | 'api_request';
  usage?: {
    tests: number;
    ai_tutor_messages: number;
    question_generations: number;
    api_requests: number;
  };
  limits?: {
    tests_per_month: number;
    ai_tutor_messages: number;
    question_generations: number;
    exams_access: number;
    voice_input: boolean;
    api_access: boolean;
  };
}

export function UpgradePrompt({ isOpen, onClose, reason, featureType, usage, limits }: UpgradePromptProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onClose();
    router.push('/');
  };

  const handleViewUsage = () => {
    onClose();
    router.push('/usage');
  };

  const getFeatureName = (type?: string) => {
    switch (type) {
      case 'test':
        return 'Practice Tests';
      case 'ai_tutor':
        return 'AI Tutor';
      case 'question_generation':
        return 'Question Generation';
      case 'voice_input':
        return 'Voice Input';
      case 'api_request':
        return 'API Access';
      default:
        return 'This Feature';
    }
  };

  const getRecommendedTier = (type?: string) => {
    switch (type) {
      case 'test':
      case 'ai_tutor':
        return 'Grow';
      case 'question_generation':
        return 'Scale';
      case 'voice_input':
        return 'Grow';
      case 'api_request':
        return 'Scale';
      default:
        return 'Grow';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-full bg-blue-500/10 p-3">
              <Zap className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <DialogTitle className="text-center text-2xl">Upgrade to Continue</DialogTitle>
          <DialogDescription className="text-center">
            {reason || `You've reached your monthly limit for ${getFeatureName(featureType)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Usage */}
          {usage && limits && (
            <div className="rounded-lg border bg-accent p-4 space-y-2">
              <h4 className="font-semibold text-sm mb-3">Current Usage</h4>
              {featureType === 'test' && limits.tests_per_month !== -1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tests this month</span>
                  <span className="font-semibold">
                    {usage.tests} / {limits.tests_per_month}
                  </span>
                </div>
              )}
              {featureType === 'ai_tutor' && limits.ai_tutor_messages !== -1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">AI Tutor messages</span>
                  <span className="font-semibold">
                    {usage.ai_tutor_messages} / {limits.ai_tutor_messages}
                  </span>
                </div>
              )}
              {featureType === 'question_generation' && limits.question_generations !== -1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Question generations</span>
                  <span className="font-semibold">
                    {usage.question_generations} / {limits.question_generations}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Recommended Plan */}
          <div className="rounded-lg border border-blue-500 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold">{getRecommendedTier(featureType)} Plan</h4>
              <Badge className="bg-blue-500">Recommended</Badge>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Unlimited {getFeatureName(featureType).toLowerCase()}</span>
              </div>
              {featureType === 'test' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Unlimited AI tutor conversations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Access to all exams</span>
                  </div>
                </>
              )}
              {featureType === 'ai_tutor' && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Voice input and output</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>100 question generations</span>
                  </div>
                </>
              )}
              {(featureType === 'question_generation' || featureType === 'api_request') && (
                <>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Unlimited question generations</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>API access</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>Priority support</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <Button onClick={handleUpgrade} className="w-full" size="lg">
              <Zap className="mr-2 h-4 w-4" />
              View Plans & Upgrade
            </Button>
            <Button onClick={handleViewUsage} variant="outline" className="w-full">
              View Usage Details
            </Button>
          </div>

          {/* Footer */}
          <p className="text-xs text-center text-muted-foreground">
            Your usage resets at the start of each month
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
