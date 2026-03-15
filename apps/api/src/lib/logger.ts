/**
 * Pino-based structured logging for Node.js services.
 *
 * Outputs JSON in production, pretty-printed in development.
 * Includes correlation ID support for distributed tracing.
 */

import { randomUUID } from "crypto";

// Lightweight logger that doesn't require pino dependency yet
// Will be upgraded to pino when apps/api gets its full deps

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";

interface LogEntry {
  level: LogLevel;
  msg: string;
  service: string;
  env: string;
  correlation_id: string;
  timestamp: string;
  [key: string]: unknown;
}

const SERVICE_NAME = process.env.SERVICE_NAME || "api";
const ENVIRONMENT = process.env.ENVIRONMENT || "development";
const IS_PRODUCTION = ENVIRONMENT === "production";

let _correlationId = "";

export function setCorrelationId(id: string): void {
  _correlationId = id;
}

export function getCorrelationId(): string {
  if (!_correlationId) {
    _correlationId = randomUUID().slice(0, 8);
  }
  return _correlationId;
}

function formatLog(
  level: LogLevel,
  msg: string,
  extra: Record<string, unknown> = {}
): string {
  const entry: LogEntry = {
    level,
    msg,
    service: SERVICE_NAME,
    env: ENVIRONMENT,
    correlation_id: getCorrelationId(),
    timestamp: new Date().toISOString(),
    ...extra,
  };

  if (IS_PRODUCTION) {
    return JSON.stringify(entry);
  }

  // Dev: human-readable format
  const extraStr = Object.keys(extra).length
    ? " " + JSON.stringify(extra)
    : "";
  return `[${entry.timestamp}] ${level.toUpperCase()} (${entry.correlation_id}) ${msg}${extraStr}`;
}

export const logger = {
  debug(msg: string, extra?: Record<string, unknown>) {
    if (!IS_PRODUCTION) console.debug(formatLog("debug", msg, extra));
  },
  info(msg: string, extra?: Record<string, unknown>) {
    console.info(formatLog("info", msg, extra));
  },
  warn(msg: string, extra?: Record<string, unknown>) {
    console.warn(formatLog("warn", msg, extra));
  },
  error(msg: string, extra?: Record<string, unknown>) {
    console.error(formatLog("error", msg, extra));
  },
  fatal(msg: string, extra?: Record<string, unknown>) {
    console.error(formatLog("fatal", msg, extra));
  },
};
