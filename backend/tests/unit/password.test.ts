import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../../src/modules/auth/password.js";

describe("Password hashing (F-01, AC-08)", () => {
  it("TEST-01: hashes with argon2id, never stores the plain password, verifies right and wrong passwords", async () => {
    const plain = "Some-Password-123";
    const hash = await hashPassword(plain);

    expect(hash).not.toBe(plain);
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, plain)).toBe(true);
    expect(await verifyPassword(hash, "wrong-password")).toBe(false);
  });
});