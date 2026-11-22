import { expect, type APIRequestContext, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";

const API = "http://localhost:3000";
export const PASSWORD = process.env.SEED_DEMO_PASSWORD ?? "";

export async function apiToken(request: APIRequestContext, username: string): Promise<string> {
  const res = await request.post(`${API}/api/auth/login`, { data: { username, password: PASSWORD } });
  expect(res.status(), `login ${username}`).toBe(200);
  return (await res.json()).token;
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

// Creates an E2E-* item managed by `custodian` (through the real API).
export async function createItem(request: APIRequestContext, custodian: string) {
  const token = await apiToken(request, custodian);
  const assetTag = `E2E-${randomUUID().slice(0, 8)}`;
  const res = await request.post(`${API}/api/items`, {
    headers: auth(token),
    data: { assetTag, name: `E2E item ${assetTag}`, description: "created by an E2E test" },
  });
  expect(res.status()).toBe(201);
  return { assetTag, id: (await res.json()).id as string };
}

export async function createRequest(request: APIRequestContext, borrower: string, itemId: string) {
  const token = await apiToken(request, borrower);
  const res = await request.post(`${API}/api/requests`, { headers: auth(token), data: { itemId } });
  expect(res.status()).toBe(201);
  return (await res.json()).id as string;
}

export async function checkoutViaApi(request: APIRequestContext, custodian: string, requestId: string) {
  const token = await apiToken(request, custodian);
  const res = await request.post(`${API}/api/requests/${requestId}/checkout`, { headers: auth(token) });
  expect(res.status()).toBe(201);
}

export async function loginUi(page: Page, username: string) {
  await page.goto("/login");
  await page.fill("#username", username);
  await page.fill("#password", PASSWORD);
  await page.click("button[type='submit']");
  await expect(page).toHaveURL(/\/items/);
}