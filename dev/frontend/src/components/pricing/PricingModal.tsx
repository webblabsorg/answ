'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CheckIcon,
  SparklesIcon,
  ZapIcon,
  XIcon,
  GlobeIcon,
  Loader2Icon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/store/auth-store';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Currency = {
  code: string;
  symbol: string;
  rate: number;
};

type PlanType = 'personal' | 'business';

const currencies: Currency[] = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'CAD', symbol: 'C$', rate: 1.35 },
  { code: 'AUD', symbol: 'A$', rate: 1.52 },
  { code: 'JPY', symbol: '¥', rate: 149 },
  { code: 'INR', symbol: '₹', rate: 83 },
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(currencies[0]); // local fallback
  const [planType, setPlanType] = useState<PlanType>('personal');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuthStore();

  const convertPrice = (usdPrice: number): string => {
    const converted = usdPrice * selectedCurrency.rate;
    if (selectedCurrency.code === 'JPY' || selectedCurrency.code === 'INR') {
      return Math.round(converted).toString();
    }
    return converted.toFixed(2);
  };

  const handleUpgrade = async (tier: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to upgrade your plan');
      return;
    }

    if (tier === 'starter') {
      return; // Can't upgrade to free
    }

    setLoading(true);
    try {
      const tierMap: Record<string, string> = {
        growth: 'GROW',
        scale: 'SCALE',
      };

      const response = await apiClient.post('/subscriptions/checkout', {
        tier: tierMap[tier],
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancel`,
      });

      // Redirect to Stripe checkout
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error: any) {
      console.error('Failed to create checkout session:', error);
      alert(error.response?.data?.message || 'Failed to start checkout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const plans = [
    {
      id: 'starter',
      name: 'Starter',
      price: 0,
      period: 'month',
      description: 'Get started with core features',
      buttonText: 'Your current plan',
      buttonVariant: 'outline' as const,
      icon: null,
      current: true,
      features: [
        '10 tests per month',
        '20 AI tutor messages',
        'Basic AI tutor',
        '1 exam type',
      ],
    },
    {
      id: 'growth',
      name: 'Growth',
      price: 29,
      period: 'month',
      description: 'Unlock more usage and exams',
      buttonText: 'Upgrade to Growth',
      buttonVariant: 'default' as const,
      badge: 'POPULAR',
      icon: <SparklesIcon className="h-4 w-4" />,
      highlight: true,
      features: [
        'Unlimited tests',
        'Unlimited AI tutor',
        'All exams',
        'Voice input/output',
        '100 question generations',
      ],
    },
    {
      id: 'scale',
      name: 'Scale',
      price: 99,
      period: 'month',
      description: 'Advanced features and limits',
      buttonText: 'Upgrade to Scale',
      buttonVariant: 'default' as const,
      icon: <ZapIcon className="h-4 w-4" />,
      features: [
        'Everything in Growth',
        'Unlimited question generations',
        'Personalized study plans',
        'Priority support',
        'API access',
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl bg-black text-white border-gray-800 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-black/95 backdrop-blur-sm z-10 border-b border-gray-800">
          <div className="px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-3xl font-semibold">Upgrade your plan</h2>
              <DialogClose asChild>
                <button className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800">
                  <XIcon className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            {/* Plan Type Tabs */}
            <div className="flex gap-2 bg-gray-900 p-1 rounded-lg w-fit">
              <button
                onClick={() => setPlanType('personal')}
                className={cn(
                  'px-6 py-2 rounded-md text-sm font-medium transition-colors',
                  planType === 'personal'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Personal
              </button>
              <button
                onClick={() => setPlanType('business')}
                className={cn(
                  'px-6 py-2 rounded-md text-sm font-medium transition-colors',
                  planType === 'business'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white'
                )}
              >
                Business
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={cn(
                  'rounded-xl border p-6 flex flex-col transition-all duration-200',
                  plan.highlight
                    ? 'bg-blue-900/20 border-blue-700 shadow-lg shadow-blue-900/20'
                    : 'bg-gray-900/50 border-gray-800 hover:border-gray-700'
                )}
              >
                {/* Plan Header */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-semibold flex items-center gap-2">
                      {plan.icon}
                      {plan.name}
                    </h3>
                    {plan.badge && (
                      <Badge className="bg-blue-600 text-white text-xs">
                        {plan.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-400">{plan.description}</p>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm">{selectedCurrency.symbol}</span>
                    <span className="text-4xl font-bold">
                      {convertPrice(plan.price)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      {selectedCurrency.code} / {plan.period}
                    </span>
                  </div>
                </div>

                {/* Button */}
                <Button
                  variant={plan.buttonVariant}
                  onClick={() => handleUpgrade(plan.id)}
                  className={cn(
                    'w-full mb-6',
                    plan.highlight
                      ? 'bg-white text-black hover:bg-gray-200'
                      : plan.current
                      ? 'border-gray-700 text-gray-400'
                      : 'bg-gray-800 hover:bg-gray-700 text-white'
                  )}
                  disabled={plan.current || loading}
                >
                  {loading ? (
                    <>
                      <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.buttonText
                  )}
                </Button>

                {/* Features */}
                <div className="space-y-3 flex-1">
                  {plan.features.map((feature, index) => (
                    <div key={index} className="flex items-start gap-2">
                      <CheckIcon className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-300">{feature}</span>
                    </div>
                  ))}
                </div>

                {/* Footer Links */}
                {plan.id === 'growth' && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <button className="text-sm text-gray-400 hover:text-white transition-colors underline">
                      Limits apply
                    </button>
                  </div>
                )}

                {plan.id === 'scale' && (
                  <div className="mt-4 pt-4 border-t border-gray-800">
                    <button className="text-sm text-gray-400 hover:text-white transition-colors underline">
                      Limits apply
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-black/95 backdrop-blur-sm border-t border-gray-800 px-8 py-6">
          <div className="flex items-center justify-between">
            {/* Currency Picker */}
            <div className="relative">
              <button
                onClick={() => setShowCurrencyPicker(!showCurrencyPicker)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
              >
                <GlobeIcon className="h-4 w-4" />
                <span>
                  {selectedCurrency.symbol} {selectedCurrency.code}
                </span>
              </button>

              {showCurrencyPicker && (
                <>
                  {/* Backdrop */}
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowCurrencyPicker(false)}
                  />
                  
                  {/* Currency Dropdown */}
                  <div className="absolute bottom-full left-0 mb-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-30 overflow-hidden">
                    {currencies.map((currency) => (
                      <button
                        key={currency.code}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          setShowCurrencyPicker(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors',
                          selectedCurrency.code === currency.code
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300'
                        )}
                      >
                        {currency.symbol} {currency.code}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Enterprise Link */}
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400">
                Need more capabilities for your business?
              </span>
              <button className="text-white hover:underline font-medium">
                See ChatGPT Enterprise
              </button>
            </div>
          </div>

          {/* Country Selector */}
          <div className="mt-4 flex justify-end">
            <button className="text-xs text-gray-500 hover:text-gray-400 transition-colors flex items-center gap-1">
              <GlobeIcon className="h-3 w-3" />
              <span>Ghana</span>
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
