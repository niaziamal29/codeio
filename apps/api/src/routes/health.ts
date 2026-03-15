import { Router, type IRouter } from "express";

export const healthRouter: IRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: "codeio-api",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.RELEASE_VERSION || "dev",
  });
});
