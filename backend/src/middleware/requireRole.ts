import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { forbiddenRole, unauthenticated } from "../lib/errors.js";

// Declared per route, after `authenticate`. Role comes from the database (D-20).
export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(unauthenticated());
    if (!allowed.includes(req.user.role)) return next(forbiddenRole());
    next();
  };
}