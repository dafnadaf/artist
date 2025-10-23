import * as Sentry from "@sentry/react";

const dsn = import.meta.env.VITE_SENTRY_DSN;

if (dsn) {
  const tracesSampleRate = Number.parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? "0.1");
  const replaysSessionSampleRate = Number.parseFloat(
    import.meta.env.VITE_SENTRY_REPLAYS_SESSION_SAMPLE_RATE ?? "0.0",
  );
  const replaysOnErrorSampleRate = Number.parseFloat(
    import.meta.env.VITE_SENTRY_REPLAYS_ON_ERROR_SAMPLE_RATE ?? "1.0",
  );

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],
    tracesSampleRate: Number.isFinite(tracesSampleRate) ? tracesSampleRate : 0.1,
    replaysSessionSampleRate: Number.isFinite(replaysSessionSampleRate) ? replaysSessionSampleRate : 0.0,
    replaysOnErrorSampleRate: Number.isFinite(replaysOnErrorSampleRate)
      ? replaysOnErrorSampleRate
      : 1.0,
  });
}
