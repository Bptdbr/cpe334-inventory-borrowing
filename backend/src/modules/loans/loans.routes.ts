import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateUuidParam } from "../../middleware/validateUuidParam.js";
import * as loansService from "./loans.service.js";

export const checkoutRouter = Router();

// POST /api/requests/:id/checkout - custodian only (FR-09, BR-03)
checkoutRouter.post(
  "/:id/checkout",
  authenticate,
  requireRole(Role.CUSTODIAN),
  validateUuidParam("id"),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const loan = await loansService.checkoutRequest(req.params.id, req.user!.id);
      res.status(201).json(loan);
    } catch (err) {
      next(err);
    }
  },
);