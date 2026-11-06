import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { invalidCredentials, validationError } from "../../lib/errors.js";
import { authenticate } from "../../middleware/authenticate.js";
import { verifyPassword } from "./password.js";
import { signToken } from "./token.js";

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(128),
});

// Fixed hash so an unknown username costs the same time as a wrong password (SDS 9.4).
const DUMMY_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHRzb21lc2FsdA$Zy3bJH6y1wF0m8m7Yk7q0lU0m8cZ9m0m8cZ9m0m8cZ0";

export const authRouter = Router();

authRouter.post("/login", async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      throw validationError(parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })));
    }
    const { username, password } = parsed.data;

    const user = await prisma.user.findUnique({ where: { username } });
    const ok = await verifyPassword(user ? user.passwordHash : DUMMY_HASH, password);
    if (!user || !ok) throw invalidCredentials();

    const { token, expiresAt } = signToken(user.id);
    res.status(200).json({
      token,
      expiresAt,
      user: { id: user.id, username: user.username, displayName: user.displayName, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

authRouter.get("/me", authenticate, (req, res) => {
  res.status(200).json(req.user);
});

authRouter.post("/logout", authenticate, async (req, res, next) => {
  try {
    const { jti, exp } = req.token!;
    await prisma.revokedToken.upsert({
      where: { jti },
      update: {},
      create: { jti, expiresAt: new Date(exp * 1000) },
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});