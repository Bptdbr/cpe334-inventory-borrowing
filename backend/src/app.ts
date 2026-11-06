import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "./config.js";
import { authRouter } from "./modules/auth/auth.routes.js";
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

app.use("/api/auth", authRouter);

// Must stay last: unknown routes, then the error handler (SDS 10.3).
// Other routers (items, requests, loans) are added BEFORE notFoundHandler.
app.use(notFoundHandler);
app.use(errorHandler);