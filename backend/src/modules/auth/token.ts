import jwt from "jsonwebtoken";
import { randomUUID } from "crypto";
import { config } from "../../config.js";

export interface TokenPayload {
  sub: string;
  jti: string;
  exp: number;
}

// The token carries sub, jti, iat, exp only: no role (D-20).
export function signToken(userId: string) {
  const jti = randomUUID();
  const token = jwt.sign({ sub: userId, jti }, config.JWT_SECRET, {
    algorithm: "HS256",
    expiresIn: config.JWT_EXPIRES_IN_MINUTES * 60,
  });
  const { exp } = jwt.decode(token) as { exp: number };
  return { token, jti, expiresAt: new Date(exp * 1000).toISOString() };
}

// Throws if the signature is invalid or the token is expired.
export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, config.JWT_SECRET, { algorithms: ["HS256"] }) as TokenPayload;
}