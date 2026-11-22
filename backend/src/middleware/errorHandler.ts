import { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/errors.js";

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "This record was not found." } });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    const body: { code: string; message: string; details?: unknown } = {
      code: err.code,
      message: err.message,
    };
    if (err.details !== undefined) body.details = err.details;
    return res.status(err.status).json({ error: body });
  }
  // Unexpected failure: log server-side only, generic message to the client (NFR-05).
  console.error("Unexpected error:", err);
  return res
    .status(500)
    .json({ error: { code: "INTERNAL_ERROR", message: "Something went wrong, please try again." } });
}