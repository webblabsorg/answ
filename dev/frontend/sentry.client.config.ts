import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,

  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.browserTracingIntegration(),
  ],

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  beforeSend(event, hint) {
    // Filter out errors in development
    if (process.env.NODE_ENV === 'development') {
      return null;
    }
    return event;
  },

  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
