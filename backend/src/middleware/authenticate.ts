import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { unauthenticated } from "../lib/errors.js";
import { verifyToken, TokenPayload } from "../modules/auth/token.js";

export interface CurrentUser {
  id: string;
  username: string;
  displayName: string;
  role: Role;
}

declare module "express-serve-static-core" {
  interface Request {
    user?: CurrentUser;
    token?: TokenPayload;
  }
}

export async function authenticate(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) throw unauthenticated();

    let payload: TokenPayload;
    try {
      payload = verifyToken(header.slice("Bearer ".length));
    } catch {
      throw unauthenticated();
    }

    const revoked = await prisma.revokedToken.findUnique({ where: { jti: payload.jti } });
    if (revoked) throw unauthenticated();

    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw unauthenticated();

    req.user = {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
    };
    req.token = payload;
    next();
  } catch (err) {
    next(err);
  }
}