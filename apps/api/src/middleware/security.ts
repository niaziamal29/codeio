/**
 * Security middleware for the API.
 *
 * Includes:
 * - Security headers (HSTS, X-Frame-Options, CSP, etc.)
 * - CORS configuration
 * - Rate limiting setup
 * - Input validation helpers
 */

import { Request, Response, NextFunction } from "express";

// === Security Headers ===

export function securityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");

  // XSS protection
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Content Security Policy
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' wss: https:; frame-ancestors 'none'"
  );

  // HSTS (only in production)
  if (process.env.NODE_ENV === "production") {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Remove powered-by header
  res.removeHeader("X-Powered-By");

  next();
}

// === CORS Configuration ===

export function getCorsConfig() {
  const allowedOrigins = process.env.CORS_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ];

  return {
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Correlation-Id",
      "X-Idempotency-Key",
    ],
    exposedHeaders: ["X-Correlation-Id"],
    maxAge: 86400, // 24 hours
  };
}

// === Idempotency Key Validation ===

const processedKeys = new Map<string, { result: unknown; expiry: number }>();
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Middleware to enforce idempotency on state-mutating endpoints.
 * Requires X-Idempotency-Key header.
 */
export function idempotencyMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Only apply to POST, PUT, PATCH, DELETE
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
    return next();
  }

  const key = req.headers["x-idempotency-key"] as string;
  if (!key) {
    // Idempotency is optional but recommended
    return next();
  }

  // Check if this key was already processed
  const existing = processedKeys.get(key);
  if (existing && existing.expiry > Date.now()) {
    res.status(200).json(existing.result);
    return;
  }

  // Store the original json method to capture the response
  const originalJson = res.json.bind(res);
  res.json = function (body: unknown) {
    processedKeys.set(key, {
      result: body,
      expiry: Date.now() + IDEMPOTENCY_TTL_MS,
    });
    return originalJson(body);
  };

  // Cleanup old keys periodically
  if (processedKeys.size > 10000) {
    const now = Date.now();
    for (const [k, v] of processedKeys) {
      if (v.expiry < now) processedKeys.delete(k);
    }
  }

  next();
}

// === Request Size Limiter ===

export function requestSizeLimiter(maxSizeMb: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers["content-length"] || "0", 10);
    const maxBytes = maxSizeMb * 1024 * 1024;

    if (contentLength > maxBytes) {
      res.status(413).json({
        error: {
          message: `Request body too large. Maximum size is ${maxSizeMb}MB.`,
        },
      });
      return;
    }

    next();
  };
}
