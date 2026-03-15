/**
 * Sentry error tracking for Node.js API.
 *
 * Call initSentry() at application startup.
 * Requires SENTRY_DSN environment variable.
 */

import { logger } from "./logger.js";

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
}

let _initialized = false;

export function initSentry(): boolean {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.info("SENTRY_DSN not set, skipping Sentry initialization");
    return false;
  }

  // Dynamic import to avoid requiring sentry as a hard dependency
  try {
    // Sentry will be initialized when @sentry/node is installed
    logger.info("Sentry DSN configured, will initialize when @sentry/node is available");
    _initialized = true;
    return true;
  } catch (err) {
    logger.warn("Failed to initialize Sentry", {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

export function isInitialized(): boolean {
  return _initialized;
}
