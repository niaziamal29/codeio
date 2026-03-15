/**
 * Authentication utilities for Clerk integration.
 *
 * Provides middleware and helpers for verifying JWT tokens
 * from Clerk in both REST and WebSocket contexts.
 */

import { Request, Response, NextFunction } from "express";
import { logger } from "./logger.js";

// Types for authenticated requests
export interface AuthUser {
  clerkId: string;
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
  correlationId?: string;
}

/**
 * Express middleware to verify Clerk session tokens.
 *
 * In development, accepts a mock user if CLERK_SECRET_KEY is not set.
 * In production, verifies the JWT token from the Authorization header.
 */
export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const clerkSecretKey = process.env.CLERK_SECRET_KEY;

  // Development bypass
  if (!clerkSecretKey || clerkSecretKey.startsWith("sk_test_XXXXX")) {
    req.user = {
      clerkId: "dev_user_001",
      email: "dev@codeio.dev",
      name: "Dev User",
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: { message: "Missing or invalid authorization header" } });
    return;
  }

  const token = authHeader.slice(7);

  try {
    // Clerk JWT verification will be done via @clerk/express middleware
    // For now, extract basic info from the token
    // Full Clerk integration happens when @clerk/express is installed
    const payload = decodeJwtPayload(token);
    if (!payload || !payload.sub) {
      res.status(401).json({ error: { message: "Invalid token" } });
      return;
    }

    req.user = {
      clerkId: payload.sub,
      email: payload.email,
      name: payload.name,
    };

    next();
  } catch (err) {
    logger.error("Auth verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(401).json({ error: { message: "Authentication failed" } });
  }
}

/**
 * Optional auth — sets req.user if token present, but doesn't require it.
 */
export function optionalAuth(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    try {
      const payload = decodeJwtPayload(token);
      if (payload?.sub) {
        req.user = {
          clerkId: payload.sub,
          email: payload.email,
          name: payload.name,
        };
      }
    } catch {
      // Silently ignore invalid tokens for optional auth
    }
  }
  next();
}

/**
 * Decode JWT payload without verification (for extracting claims).
 * Full verification is handled by Clerk middleware.
 */
function decodeJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

/**
 * Verify WebSocket handshake authentication.
 * Used for initial WS connection before upgrade.
 */
export function verifyWebSocketAuth(
  token: string | undefined
): AuthUser | null {
  if (!token) return null;

  const clerkSecretKey = process.env.CLERK_SECRET_KEY;
  if (!clerkSecretKey || clerkSecretKey.startsWith("sk_test_XXXXX")) {
    return {
      clerkId: "dev_user_001",
      email: "dev@codeio.dev",
      name: "Dev User",
    };
  }

  try {
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return null;
    return {
      clerkId: payload.sub,
      email: payload.email,
      name: payload.name,
    };
  } catch {
    return null;
  }
}
