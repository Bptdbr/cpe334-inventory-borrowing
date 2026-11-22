import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validationError } from "../../lib/errors.js";
import { createItemSchema } from "./catalog.schema.js";
import * as catalogService from "./catalog.service.js";

export const catalogRouter = Router();

// GET /api/items - open to all authenticated users (Borrowers and Custodians, D-08)
catalogRouter.get("/", authenticate, async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const items = await catalogService.listItems();
    res.status(200).json(items);
  } catch (err) {
    next(err);
  }
});

// POST /api/items - custodian only (BR-08)
catalogRouter.post(
  "/",
  authenticate,
  requireRole(Role.CUSTODIAN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createItemSchema.safeParse(req.body);
      if (!parsed.success) {
        throw validationError(parsed.error.errors);
      }

      // managedBy is always taken from authenticated user (AC-15, NFR-01)
      const item = await catalogService.createItem(parsed.data, req.user!.id);
      res.status(201).json(item);
    } catch (err) {
      next(err);
    }
  }
);
