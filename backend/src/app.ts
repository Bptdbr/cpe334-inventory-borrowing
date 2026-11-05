import express, { Request, Response } from "express";
import cors from "cors";
import { config } from "./config.js";

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

