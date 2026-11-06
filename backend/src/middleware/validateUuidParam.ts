import { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { validationError } from "../lib/errors.js";

const uuid = z.string().uuid();

// A malformed identifier is rejected with 422 before any query (SDS 10.4).
export function validateUuidParam(name: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!uuid.safeParse(req.params[name]).success) {
      return next(validationError([{ field: name, message: "Must be a valid UUID." }]));
    }
    next();
  };
}