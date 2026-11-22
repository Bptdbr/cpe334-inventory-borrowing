import { describe, it, expect, afterEach, afterAll } from "vitest";
import request from "supertest";
import { Role } from "@prisma/client";
import { app } from "../../src/app.js";
import { prisma } from "../../src/lib/prisma.js";
import {
  getAuthToken,
  createTestItem,
  cleanupCatalogTestData,
} from "../helpers/catalog.js";

const bearer = (t: string) => ({ Authorization: `Bearer ${t}` });

afterEach(async () => {
  await cleanupCatalogTestData();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("Catalog API - GET /api/items (F-03, AC-20)", () => {
  it("TEST-31: authenticated borrower retrieves catalog items without holder privacy leakage", async () => {
    const { token: custodianToken, user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id, {
      name: "Oscilloscope 100MHz",
      description: "Dual channel",
    });

    const { token: borrowerToken } = await getAuthToken(Role.BORROWER);
    const res = await request(app).get("/api/items").set(bearer(borrowerToken));

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const found = res.body.find((i: any) => i.id === item.id);
    expect(found).toBeDefined();
    expect(found.assetTag).toBe(item.assetTag);
    expect(found.name).toBe("Oscilloscope 100MHz");
    expect(found.description).toBe("Dual channel");
    expect(found.status).toBe("AVAILABLE");
    expect(found.managedBy).toBe(custodian.id);
    expect(found.createdAt).toBeDefined();

    // D-08: holder/borrower identity is never returned in catalog
    expect(found).not.toHaveProperty("borrower");
    expect(found).not.toHaveProperty("borrowerId");
    expect(found).not.toHaveProperty("holder");
  });

  it("TEST-32: authenticated custodian retrieves identical catalog", async () => {
    const { token: custodianToken, user: custodian } = await getAuthToken(Role.CUSTODIAN);
    const item = await createTestItem(custodian.id);

    const res = await request(app).get("/api/items").set(bearer(custodianToken));

    expect(res.status).toBe(200);
    const found = res.body.find((i: any) => i.id === item.id);
    expect(found).toBeDefined();
    expect(found.assetTag).toBe(item.assetTag);
  });

  it("unauthenticated request to GET /api/items returns 401 UNAUTHENTICATED", async () => {
    const res = await request(app).get("/api/items");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("Catalog API - POST /api/items (F-03, AC-21 to AC-24)", () => {
  it("TEST-33: custodian creates an item starting as AVAILABLE with managedBy = caller (AC-21, BR-08)", async () => {
    const { token, user } = await getAuthToken(Role.CUSTODIAN);

    const res = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({
        assetTag: "EQ-TEST-SCOPE-01",
        name: "Logic Analyzer",
        description: "16-channel 100MHz",
      });

    expect(res.status).toBe(201);
    expect(res.body.assetTag).toBe("EQ-TEST-SCOPE-01");
    expect(res.body.name).toBe("Logic Analyzer");
    expect(res.body.description).toBe("16-channel 100MHz");
    expect(res.body.status).toBe("AVAILABLE");
    expect(res.body.managedBy).toBe(user.id);

    // Verify in database
    const dbItem = await prisma.item.findUnique({ where: { assetTag: "EQ-TEST-SCOPE-01" } });
    expect(dbItem).not.toBeNull();
    expect(dbItem?.managedBy).toBe(user.id);
    expect(dbItem?.status).toBe("AVAILABLE");
  });

  it("TEST-34: custodian creates an item without description, defaults to empty string (AC-21)", async () => {
    const { token } = await getAuthToken(Role.CUSTODIAN);

    const res = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({
        assetTag: "EQ-TEST-NODESC",
        name: "Multimeter without description",
      });

    expect(res.status).toBe(201);
    expect(res.body.description).toBe("");
  });

  it("TEST-35: borrower cannot create an item and receives 403 FORBIDDEN_ROLE (AC-22, BR-08)", async () => {
    const { token } = await getAuthToken(Role.BORROWER);

    const res = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({
        assetTag: "EQ-TEST-FORBIDDEN",
        name: "Illegal Item",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN_ROLE");

    const dbItem = await prisma.item.findUnique({ where: { assetTag: "EQ-TEST-FORBIDDEN" } });
    expect(dbItem).toBeNull();
  });

  it("TEST-36: unauthenticated user receives 401 UNAUTHENTICATED on POST /api/items (AC-22, NFR-01)", async () => {
    const res = await request(app)
      .post("/api/items")
      .send({
        assetTag: "EQ-TEST-ANON",
        name: "Anonymous Item",
      });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("TEST-37: duplicate assetTag returns 409 DUPLICATE_ASSET_TAG (AC-23, D-07)", async () => {
    const { token, user } = await getAuthToken(Role.CUSTODIAN);
    await createTestItem(user.id, { assetTag: "EQ-TEST-DUP-01" });

    const res = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({
        assetTag: "EQ-TEST-DUP-01",
        name: "Another item with same tag",
      });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("DUPLICATE_ASSET_TAG");
    expect(res.body.error.message).toMatch(/asset tag already exists/i);
  });

  it("TEST-38: validation rejects missing, empty or oversized fields with 422 VALIDATION_ERROR (AC-24)", async () => {
    const { token } = await getAuthToken(Role.CUSTODIAN);

    // Missing name
    const resNoName = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({ assetTag: "EQ-TEST-NONAME" });
    expect(resNoName.status).toBe(422);
    expect(resNoName.body.error.code).toBe("VALIDATION_ERROR");

    // Empty assetTag
    const resEmptyTag = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({ assetTag: "   ", name: "Valid Name" });
    expect(resEmptyTag.status).toBe(422);
    expect(resEmptyTag.body.error.code).toBe("VALIDATION_ERROR");

    // assetTag > 30 chars
    const resLongTag = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({ assetTag: "A".repeat(31), name: "Valid Name" });
    expect(resLongTag.status).toBe(422);
    expect(resLongTag.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("TEST-39: accepts valid boundary lengths (assetTag 30 chars, name 100 chars) (AC-24)", async () => {
    const { token } = await getAuthToken(Role.CUSTODIAN);

    const boundaryTag = "TAG" + "X".repeat(27); // 30 chars
    const boundaryName = "N".repeat(100); // 100 chars

    const res = await request(app)
      .post("/api/items")
      .set(bearer(token))
      .send({
        assetTag: boundaryTag,
        name: boundaryName,
      });

    expect(res.status).toBe(201);
    expect(res.body.assetTag).toBe(boundaryTag);
    expect(res.body.name).toBe(boundaryName);
  });
});
