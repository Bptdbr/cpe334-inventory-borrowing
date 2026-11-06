import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validationError } from "../../lib/errors.js";
import { createRequestSchema } from "./requests.schema.js";
import * as requestsService from "./requests.service.js";

export const requestsRouter = Router();

// GET /api/requests/mine - borrower only (BR-04, FR-07)
requestsRouter.get(
  "/mine",
  authenticate,
  requireRole(Role.BORROWER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const requests = await requestsService.listMyRequests(req.user!.id);
      res.status(200).json(requests);
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/requests - borrower only (BR-02, BR-06, FR-06)
requestsRouter.post(
  "/",
  authenticate,
  requireRole(Role.BORROWER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parsed = createRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        throw validationError(parsed.error.errors);
      }

      const request = await requestsService.createRequest(parsed.data.itemId, req.user!.id);
      res.status(201).json(request);
    } catch (err) {
      next(err);
    }
  }
);
