import { onCLS, onINP, onFCP, onLCP, onTTFB, Metric } from 'web-vitals';

function sendToAnalytics(metric: Metric) {
  // Send to your analytics endpoint
  const body = JSON.stringify({
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    id: metric.id,
  });

  // Use navigator.sendBeacon if available (more reliable)
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/analytics', body);
  } else {
    // Fallback to fetch
    fetch('/api/analytics', {
      body,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
    });
  }

  // Also log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Web Vitals] ${metric.name}:`, {
      value: metric.value,
      rating: metric.rating,
    });
  }
}

export function initWebVitals() {
  try {
    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch (error) {
    console.error('Failed to initialize web vitals:', error);
  }
}

// Performance thresholds (in milliseconds)
export const PERFORMANCE_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  INP: { good: 200, needsImprovement: 500 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 800, needsImprovement: 1800 },
};
