import { Router, Request, Response, NextFunction } from "express";
import { Role } from "@prisma/client";
import { authenticate } from "../../middleware/authenticate.js";
import { requireRole } from "../../middleware/requireRole.js";
import { validateUuidParam } from "../../middleware/validateUuidParam.js";
import * as loansService from "./loans.service.js";

// Mounted on /api/requests
export const checkoutRouter = Router();

// GET /api/requests - custodian only, managed items (FR-08, BR-03)
checkoutRouter.get(
  "/",
  authenticate,
  requireRole(Role.CUSTODIAN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await loansService.listManagedRequests(req.user!.id));
    } catch (err) {
      next(err);
    }
  },
);

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

// Mounted on /api/loans
export const loansRouter = Router();

// GET /api/loans/mine - borrower only (FR-07, BR-04)
loansRouter.get(
  "/mine",
  authenticate,
  requireRole(Role.BORROWER),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await loansService.listMyLoans(req.user!.id));
    } catch (err) {
      next(err);
    }
  },
);

// GET /api/loans - custodian only, managed items (FR-17, BR-03)
loansRouter.get(
  "/",
  authenticate,
  requireRole(Role.CUSTODIAN),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      res.status(200).json(await loansService.listManagedLoans(req.user!.id));
    } catch (err) {
      next(err);
    }
  },
);