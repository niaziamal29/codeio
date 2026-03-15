/**
 * Codeio API Server
 *
 * Express-based API server with:
 * - Security headers and CORS
 * - Request logging with correlation IDs
 * - Clerk authentication
 * - REST API routes
 * - WebSocket support for real-time agent communication
 */

import express from "express";
import cors from "cors";
import { logger } from "./lib/logger.js";
import { initSentry } from "./lib/sentry.js";
import { securityHeaders, getCorsConfig, idempotencyMiddleware, requestSizeLimiter } from "./middleware/security.js";
import { requestLoggerMiddleware } from "./middleware/request-logger.js";
import { healthRouter } from "./routes/health.js";

// Initialize error tracking
initSentry();

const app: express.Express = express();
const PORT = parseInt(process.env.API_PORT || "4000", 10);

// === Middleware Stack ===

// Security headers (before CORS)
app.use(securityHeaders);

// CORS
app.use(cors(getCorsConfig()));

// Body parsing with size limit
app.use(requestSizeLimiter(10));
app.use(express.json({ limit: "10mb" }));

// Request logging
app.use(requestLoggerMiddleware);

// Idempotency for state-mutating requests
app.use(idempotencyMiddleware);

// === Routes ===

app.use("/api/health", healthRouter);

// Future route registrations:
// app.use("/api/projects", requireAuth, projectsRouter);
// app.use("/api/sessions", requireAuth, sessionsRouter);
// app.use("/api/checkpoints", requireAuth, checkpointsRouter);

// === 404 Handler ===
app.use((_req, res) => {
  res.status(404).json({ error: { message: "Not found" } });
});

// === Error Handler ===
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", {
    error: err.message,
    stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === "production"
        ? "Internal server error"
        : err.message,
    },
  });
});

// === Start Server ===
app.listen(PORT, "0.0.0.0", () => {
  logger.info(`Codeio API server running on http://0.0.0.0:${PORT}`);
});

export default app;
