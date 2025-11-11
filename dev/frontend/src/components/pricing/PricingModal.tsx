'use client';

import { useEffect, useRef, useState } from 'react';
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
import { useCurrencyStore } from '@/store/currency-store';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type Currency = {
  code: string;
  symbol: string;
  rate: number;
  name?: string;
};

type PlanType = 'personal' | 'business';

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const currencyStore = useCurrencyStore();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>({
    code: currencyStore.code,
    symbol: currencyStore.symbol,
    rate: currencyStore.rate,
  });
  const [currencyList, setCurrencyList] = useState<Currency[]>([]);

  useEffect(() => {
    // Build dynamic currency list (120-150+) from runtime; fallback to a curated set
    const buildList = () => {
      let codes: string[] = [];
      try {
        const maybeSupported = (Intl as any).supportedValuesOf?.('currency');
        if (Array.isArray(maybeSupported) && maybeSupported.length > 0) {
          codes = maybeSupported;
        }
      } catch {}
      if (codes.length === 0) {
        codes = [
          'USD','EUR','GBP','JPY','AUD','CAD','CHF','CNY','HKD','SGD','SEK','NOK','DKK','PLN','CZK','HUF','TRY','ILS','AED','SAR','QAR','KWD','BHD','INR','IDR','MYR','THB','VND','PHP','KRW','TWD','NZD','BRL','MXN','ARS','CLP','COP','PEN','UYU','ZAR','EGP','NGN','KES','GHS','MAD','TND','RUB','UAH','RON','BGN','HRK','ISK','PKR','BDT','LKR','NPR','ETB','TZS','UGX','DOP','JMD','XOF','XAF','XPF','MUR','MZN','AOA','BWP','ZMW','GEL','AZN','KZT','UZS','TJS','KGS','LAK','MMK','BND','FJD','PGK','WST','TOP','SBD','VUV','JOD','LBP','DZD','BBD','BSD','BZD','GYD','SRD','TTD','XCD','BMD','BAM','MKD','MDL','ALL','AMD','MNT','NAD','BAM','RSD','BYN','BOB','CRC','GTQ','HNL','NIO','PAB','CRC','KYD','BZD','ANG','AWG','HTG','CDF','RWF','BIF','SOS','SDG','LYD','MRU','XOF','XAF'
        ];
      }
      const displayNames = (() => {
        try { return new (Intl as any).DisplayNames([navigator.language || 'en'], { type: 'currency' }); } catch { return null; }
      })();
      const list = codes.map((code) => {
        let symbol = '$';
        try { symbol = (0).toLocaleString(undefined, { style: 'currency', currency: code }).replace(/[\d.,\s]/g, '').trim() || '$'; } catch {}
        const name = displayNames?.of?.(code) || code;
        return { code, symbol, rate: 1, name } as Currency;
      });
      // Ensure USD first
      list.sort((a, b) => (a.code === 'USD' ? -1 : b.code === 'USD' ? 1 : a.code.localeCompare(b.code)));
      setCurrencyList(list);
      // If current store currency is present, keep it, else default to first
      const found = list.find(c => c.code === currencyStore.code) || list[0];
      if (found && found.code !== selectedCurrency.code) {
        setSelectedCurrency(found);
      }
    };
    buildList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    // sync with global currency picker
    setSelectedCurrency({
      code: currencyStore.code,
      symbol: currencyStore.symbol,
      rate: currencyStore.rate,
    });
  }, [currencyStore.code, currencyStore.symbol, currencyStore.rate]);
  const [planType, setPlanType] = useState<PlanType>('personal');
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [currencyQuery, setCurrencyQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const { isAuthenticated } = useAuthStore();
  const [serverPrices, setServerPrices] = useState<Record<string, number> | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Smooth scroll highlighted item into view on arrow navigation
  useEffect(() => {
    try {
      const container = listRef.current;
      if (!container) return;
      const child = container.querySelectorAll('button')[highlightIndex] as HTMLElement | undefined;
      if (child) {
        child.scrollIntoView({ block: 'nearest' });
      }
    } catch {}
  }, [highlightIndex, currencyQuery, currencyList]);

  // Fetch server pricing for selected currency to avoid client drift
  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.get(`/subscriptions/pricing/${selectedCurrency.code}`);
        const map: Record<string, number> = {};
        (res.data?.tiers || []).forEach((t: any) => { map[t.id] = t.price; });
        setServerPrices(map);
      } catch {
        setServerPrices(null);
      }
    };
    load();
  }, [selectedCurrency.code]);

  const formatAmount = (amount: number): string => {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency: selectedCurrency.code }).format(amount);
    } catch {
      return `${selectedCurrency.symbol}${amount.toFixed(2)}`;
    }
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

      // derive best-effort country from locale (e.g., en-US -> US)
      const lang = typeof window !== 'undefined' ? navigator.language : 'en-US';
      const parts = lang.split('-');
      const country = parts.length > 1 ? parts[1].toUpperCase() : undefined;

      const response = await apiClient.post('/subscriptions/checkout', {
        tier: tierMap[tier],
        successUrl: `${window.location.origin}/subscription/success`,
        cancelUrl: `${window.location.origin}/subscription/cancel`,
        currency: selectedCurrency.code,
        country,
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
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold">
                      {formatAmount(
                        plan.id === 'starter'
                          ? 0
                          : (serverPrices?.[plan.id === 'growth' ? 'GROW' : 'SCALE'] ?? plan.price * selectedCurrency.rate)
                      )}
                    </span>
                    <span className="text-gray-400 text-sm">/ {plan.period}</span>
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
                onClick={() => { setCurrencyQuery(''); setShowCurrencyPicker(!showCurrencyPicker); setTimeout(() => searchInputRef.current?.focus(), 0); }}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-lg text-sm text-gray-300 hover:text-white transition-colors"
                aria-haspopup="listbox"
                aria-expanded={showCurrencyPicker}
                aria-controls="currency-dropdown"
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
                    role="button"
                    tabIndex={0}
                    aria-label="Close currency selector"
                    onClick={() => setShowCurrencyPicker(false)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setShowCurrencyPicker(false);
                      }
                    }}
                  />
                  
                  {/* Currency Dropdown */}
                  <div id="currency-dropdown" className="absolute bottom-full left-0 mb-2 w-80 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-30">
                    {/* Search */}
                    <div className="p-2 border-b border-gray-800">
                      <input
                        ref={searchInputRef}
                        type="text"
                        value={currencyQuery}
                        onChange={(e) => { setCurrencyQuery(e.target.value); setHighlightIndex(0); }}
                        onKeyDown={(e) => {
                          const filtered = currencyList.filter(c => (c.code + ' ' + (c.name || '')).toLowerCase().includes(currencyQuery.toLowerCase()));
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setHighlightIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setHighlightIndex((i) => Math.max(i - 1, 0));
                          } else if (e.key === 'Enter') {
                            e.preventDefault();
                            const target = filtered[highlightIndex];
                            if (target) {
                              setSelectedCurrency(target);
                              currencyStore.setCurrency({ code: target.code, symbol: target.symbol, rate: 1 } as any);
                              try { localStorage.setItem('preferred_currency_code', target.code); } catch {}
                              setShowCurrencyPicker(false);
                            }
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setShowCurrencyPicker(false);
                          }
                        }}
                        placeholder="Search currency code or name..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm placeholder:text-gray-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div ref={listRef} className="max-h-80 overflow-y-auto" role="listbox" aria-label="Select currency">
                      {currencyList
                        .filter(c => (c.code + ' ' + (c.name || '')).toLowerCase().includes(currencyQuery.toLowerCase()))
                        .map((currency, idx) => (
                      <button
                        key={currency.code}
                        role="option"
                        aria-selected={selectedCurrency.code === currency.code}
                        onClick={() => {
                          setSelectedCurrency(currency);
                          // propagate to global store for consistency and persist
                          currencyStore.setCurrency({
                            code: currency.code,
                            symbol: currency.symbol,
                            rate: 1,
                          } as any);
                          try { localStorage.setItem('preferred_currency_code', currency.code); } catch {}
                          setShowCurrencyPicker(false);
                        }}
                        className={cn(
                          'w-full px-4 py-2 text-left text-sm hover:bg-gray-800 transition-colors flex items-center gap-2',
                          selectedCurrency.code === currency.code || idx === highlightIndex
                            ? 'bg-gray-800 text-white'
                            : 'text-gray-300'
                        )}
                        title={currency.name || currency.code}
                        onMouseEnter={() => setHighlightIndex(idx)}
                      >
                        <span className="w-6 text-center">{currency.symbol}</span>
                        <span className="font-mono w-14">{currency.code}</span>
                        <span className="flex-1 truncate text-gray-400">{currency.name || ''}</span>
                      </button>
                      ))}
                      {currencyList.filter(c => (c.code + ' ' + (c.name || '')).toLowerCase().includes(currencyQuery.toLowerCase())).length === 0 && (
                        <div className="px-4 py-6 text-center text-gray-500 text-sm">No currencies found</div>
                      )}
                    </div>
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
