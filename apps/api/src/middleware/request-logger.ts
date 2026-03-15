/**
 * Express middleware that:
 * 1. Assigns a correlation ID to each request
 * 2. Logs request start and completion
 * 3. Attaches the logger to req for downstream use
 */

import { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";
import { logger, setCorrelationId } from "../lib/logger.js";

export function requestLoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const correlationId =
    (req.headers["x-correlation-id"] as string) || randomUUID().slice(0, 8);

  setCorrelationId(correlationId);

  // Attach to request for downstream handlers
  (req as any).correlationId = correlationId;

  // Set correlation ID in response header
  res.setHeader("x-correlation-id", correlationId);

  const start = Date.now();

  logger.info("request_start", {
    method: req.method,
    url: req.url,
    userAgent: req.get("user-agent"),
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info("request_end", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      durationMs: duration,
    });
  });

  next();
}
