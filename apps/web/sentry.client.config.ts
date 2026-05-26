import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

// Only initialize when DSN is present — safe to deploy without it
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Don't track performance for every user — 10% sampling in production
    replaysSessionSampleRate: 0,      // Disable session replays (privacy)
    replaysOnErrorSampleRate: 0,      // Disable error replays (privacy)
    beforeSend(event) {
      // Strip PII from error events
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}
