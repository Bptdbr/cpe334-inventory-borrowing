import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { config } from "./config.js";
import { prisma } from "./lib/prisma.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { catalogRouter } from "./modules/catalog/catalog.routes.js";
import { requestsRouter } from "./modules/requests/requests.routes.js";
import { checkoutRouter, loansRouter } from "./modules/loans/loans.routes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json());

// Public health check endpoint (outside /api as defined in SDS 10.1)
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

// Public readiness check endpoint (verifies database connectivity)
app.get("/api/ready", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "unready" });
  }
});

app.use("/api/auth", authRouter);
app.use("/api/items", catalogRouter);
app.use("/api/requests", requestsRouter);
app.use("/api/requests", checkoutRouter);
app.use("/api/loans", loansRouter);

// In production, serve static frontend assets with SPA fallback for client routes
if (config.NODE_ENV === "production" || process.env.NODE_ENV === "production") {
  const candidatePaths = [
    process.env.CLIENT_DIST_PATH,
    config.CLIENT_DIST_PATH,
    path.resolve(process.cwd(), "frontend/dist"),
    path.resolve(process.cwd(), "../frontend/dist"),
    path.resolve(process.cwd(), "dist/frontend"),
    path.resolve(process.cwd(), "public"),
  ].filter(Boolean) as string[];

  const clientDist =
    candidatePaths.find((p) => fs.existsSync(p)) ||
    path.resolve(process.cwd(), "../frontend/dist");

  app.use(express.static(clientDist));

  app.get("*", (req: Request, res: Response, next) => {
    if (req.path.startsWith("/api") || req.path === "/health") {
      return next();
    }
    const indexPath = path.resolve(clientDist, "index.html");
    if (fs.existsSync(indexPath)) {
      return res.sendFile(indexPath);
    }
    next();
  });
}

// Must stay last: unknown routes, then the error handler (SDS 10.3).
// Other routers (loans) are added BEFORE notFoundHandler.
app.use(notFoundHandler);
app.use(errorHandler);
