'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { initWebVitals } from '@/lib/web-vitals';
import { DevServiceWorkerReset } from '@/components/dev/DevServiceWorkerReset';

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

  return (
    <QueryClientProvider client={queryClient}>
      {process.env.NODE_ENV === 'development' && <DevServiceWorkerReset />}
      {children}
    </QueryClientProvider>
  );
}
