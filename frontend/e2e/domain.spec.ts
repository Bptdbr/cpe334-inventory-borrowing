import { test, expect } from "@playwright/test";
import { checkoutViaApi, createItem, createRequest, loginUi } from "./helpers";

test.describe("Domain journeys (Issue 14, F-03 to F-06)", () => {
  test("TEST-73: custodian checks out a request, loan appears for both roles (AC-46)", async ({ page, request }) => {
    const item = await createItem(request, "custodian1");
    await createRequest(request, "borrower1", item.id);

    await loginUi(page, "custodian1");
    await page.goto("/manage/requests");
    await expect(page.getByTestId(`manage-request-row-${item.assetTag}`)).toBeVisible();
    await page.getByTestId(`checkout-button-${item.assetTag}`).click();

    await expect(page.getByTestId("success-message")).toHaveText("Checkout recorded");
    await expect(page.getByTestId(`request-status-${item.assetTag}`)).toHaveText("FULFILLED");
    await expect(page.getByTestId(`checkout-button-${item.assetTag}`)).toHaveCount(0);

    await page.goto("/manage/loans");
    await expect(page.getByTestId(`manage-loan-row-${item.assetTag}`)).toBeVisible();

    await page.getByTestId("logout-button").click();
    await loginUi(page, "borrower1");
    await page.goto("/my");
    await expect(page.getByTestId(`my-loan-row-${item.assetTag}`)).toBeVisible();
  });

  test("TEST-87: borrower sees own data on /my and is forbidden on /manage/requests (AC-55)", async ({ page, request }) => {
    const item = await createItem(request, "custodian1");
    await createRequest(request, "borrower1", item.id);

    await loginUi(page, "borrower1");
    await page.goto("/my");
    await expect(page.getByTestId(`my-request-row-${item.assetTag}`)).toBeVisible();
    await expect(page.getByTestId(`request-status-${item.assetTag}`)).toHaveText("PENDING");

    await page.goto("/manage/requests");
    await expect(page.getByTestId("forbidden-screen")).toBeVisible();
  });

  test("TEST-88: custodian sees only managed items and is forbidden on /my (AC-55)", async ({ page, request }) => {
    const mine = await createItem(request, "custodian1");
    const foreign = await createItem(request, "custodian2");
    await createRequest(request, "borrower1", mine.id);
    await createRequest(request, "borrower1", foreign.id);

    await loginUi(page, "custodian1");
    await page.goto("/manage/requests");
    await expect(page.getByTestId(`manage-request-row-${mine.assetTag}`)).toBeVisible();
    await expect(page.getByTestId(`manage-request-row-${foreign.assetTag}`)).toHaveCount(0);

    await page.goto("/manage/loans");
    await expect(page.getByTestId("manage-loans-page")).toBeVisible();
    await expect(page.getByTestId(`manage-loan-row-${foreign.assetTag}`)).toHaveCount(0);

    await page.goto("/my");
    await expect(page.getByTestId("forbidden-screen")).toBeVisible();
  });

  test("TEST-89: borrower requests an available item; an unavailable item cannot be requested (AC-29, AC-30)", async ({ page, request }) => {
    const item = await createItem(request, "custodian1");
    const other = await createItem(request, "custodian1");
    const otherRequest = await createRequest(request, "borrower2", other.id);
    await checkoutViaApi(request, "custodian1", otherRequest);

    await loginUi(page, "borrower1");
    await expect(page.getByTestId(`item-status-${item.assetTag}`)).toHaveText("AVAILABLE");
    await page.getByTestId(`request-button-${item.assetTag}`).click();
    await expect(page.getByTestId("success-message")).toHaveText("Request submitted");

    await page.goto("/my");
    await expect(page.getByTestId(`my-request-row-${item.assetTag}`)).toBeVisible();

    await page.goto("/items");
    await expect(page.getByTestId(`item-status-${other.assetTag}`)).toHaveText("ON_LOAN");
    await expect(page.getByTestId(`request-button-${other.assetTag}`)).toBeDisabled();
  });

  test("TEST-90: checkout of an already processed request shows the 409 message and refreshes (AC-40)", async ({ page, request }) => {
    const item = await createItem(request, "custodian1");
    const requestId = await createRequest(request, "borrower1", item.id);

    await loginUi(page, "custodian1");
    await page.goto("/manage/requests");
    await expect(page.getByTestId(`checkout-button-${item.assetTag}`)).toBeVisible();

    await checkoutViaApi(request, "custodian1", requestId); // processed behind the page's back
    await page.getByTestId(`checkout-button-${item.assetTag}`).click();

    await expect(page.getByTestId("feedback-error")).toHaveText("This request has already been processed");
    await expect(page.getByTestId(`request-status-${item.assetTag}`)).toHaveText("FULFILLED");
  });
});