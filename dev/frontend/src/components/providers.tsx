'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { initWebVitals } from '@/lib/web-vitals';
import { DevServiceWorkerReset } from '@/components/dev/DevServiceWorkerReset';
import { useCurrencyStore } from '@/store/currency-store';
import { useLocaleStore } from '@/store/locale-store';

// Create queryClient outside component to ensure single instance
let queryClientInstance: QueryClient | null = null;

function getQueryClient() {
  if (!queryClientInstance) {
    queryClientInstance = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          retry: 1,
        },
      },
    });
  }
  return queryClientInstance;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => getQueryClient());

  useEffect(() => {
    // Initialize web vitals tracking
    if (typeof window !== 'undefined') {
      initWebVitals();
    }
  }, []);

  // Geo + language detection on first load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const currencyStore = useCurrencyStore.getState();
    const localeStore = useLocaleStore.getState();

    // Locale detection (browser)
    try {
      const savedLocale = localStorage.getItem('preferred_locale');
      const browserLang = navigator.language?.split('-')[0] || 'en';
      const chosen = savedLocale || browserLang || 'en';
      useLocaleStore.setState({ locale: chosen });
      localStorage.setItem('preferred_locale', chosen);
    } catch {}

    // Currency detection via IP
    (async () => {
      try {
        const saved = localStorage.getItem('preferred_currency_code');
        if (saved) {
          let savedSymbol = '$';
          try { savedSymbol = (0).toLocaleString(undefined, { style: 'currency', currency: saved }).replace(/[\d.,\s]/g, '').trim() || '$'; } catch {}
          useCurrencyStore.setState({ code: saved as any, symbol: savedSymbol, rate: 1 });
          return;
        }
        const geo = await fetch('https://ipapi.co/json/').then(r => r.json());
        const code = (geo?.currency || 'USD').toUpperCase();
        let symbol = '$';
        try { symbol = (0).toLocaleString(undefined, { style: 'currency', currency: code }).replace(/[\d.,\s]/g, '').trim() || '$'; } catch {}
        useCurrencyStore.setState({ code: code as any, symbol, rate: 1 });
        localStorage.setItem('preferred_currency_code', code);
      } catch {}
    })();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === 'development' && <DevServiceWorkerReset />}
      {children}
    </QueryClientProvider>
  );
}
