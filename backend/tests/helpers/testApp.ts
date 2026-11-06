import express from "express";
import { Role } from "@prisma/client";
import { app as realApp } from "../../src/app.js";
import { authenticate } from "../../src/middleware/authenticate.js";
import { requireRole } from "../../src/middleware/requireRole.js";
import { validateUuidParam } from "../../src/middleware/validateUuidParam.js";
import { errorHandler, notFoundHandler } from "../../src/middleware/errorHandler.js";

// Test-only app: same middlewares as production, probe routes instead of domain routes.
export const probeApp = express();
probeApp.use(express.json());
probeApp.get("/probe/custodian-only", authenticate, requireRole(Role.CUSTODIAN), (_req, res) => {
  res.json({ ok: true });
});
probeApp.get("/probe/borrower-only", authenticate, requireRole(Role.BORROWER), (_req, res) => {
  res.json({ ok: true });
});
probeApp.get("/probe/record/:id", authenticate, validateUuidParam("id"), (_req, res) => {
  res.json({ ok: true });
});
probeApp.get("/probe/boom", authenticate, () => {
  throw new Error("SELECT * FROM users failed at C:\\secret\\path.ts");
});
probeApp.use(notFoundHandler);
probeApp.use(errorHandler);

export { realApp };