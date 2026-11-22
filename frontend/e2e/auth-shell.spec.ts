import { test, expect } from "@playwright/test";

test.describe("UI Auth and Application Shell (Issue 13 / SYS-02, F-01, F-02)", () => {
  test("unauthenticated user is redirected to /login", async ({ page }) => {
    await page.goto("/items");
    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator(".login-card")).toBeVisible();
  });

  test("login form has visible labels and client validation", async ({ page }) => {
    await page.goto("/login");

    // Visible labels (SDS 11.5)
    await expect(page.locator("label[for='username']")).toHaveText("Username");
    await expect(page.locator("label[for='password']")).toHaveText("Password");

    // Submit empty form -> field errors
    await page.click("button[type='submit']");
    await expect(page.locator("#username-error")).toContainText("Username is required");
    await expect(page.locator("#password-error")).toContainText("Password is required");
  });

  test("invalid credentials show generic rejection message (FR-01, AC-02)", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#username", "borrower1");
    await page.fill("#password", "wrong_password_999");
    await page.click("button[type='submit']");

    const errorAlert = page.locator("[data-testid='login-error-alert']");
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toHaveText("Invalid username or password");
  });

  test("borrower can log in, view role navigation, and log out (AC-09, TEST-15)", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#username", "borrower1");
    await page.fill("#password", "demo_password_123");
    await page.click("button[type='submit']");

    // Reaches catalog (SDS 11.1)
    await expect(page).toHaveURL(/\/items/);
    await expect(page.locator("[data-testid='catalog-page']")).toBeVisible();

    // User display name & textual role in navbar (SDS 11.1, 11.5)
    const displayName = page.locator("[data-testid='user-display-name']");
    await expect(displayName).toBeVisible();
    const roleBadge = page.locator("[data-testid='user-role-badge']");
    await expect(roleBadge).toHaveText("(Borrower)");

    // Navigation links for Borrower
    await expect(page.locator("a.nav-link", { hasText: "Catalog" })).toBeVisible();
    await expect(
      page.locator("a.nav-link", { hasText: "My Requests & Loans" })
    ).toBeVisible();
    await expect(
      page.locator("a.nav-link", { hasText: "Requests to Process" })
    ).toHaveCount(0);
    await expect(
      page.locator("a.nav-link", { hasText: "Active Loans" })
    ).toHaveCount(0);

    // Attempt direct navigation to custodian route -> 403 Forbidden state (SDS 11.1, 11.3)
    await page.goto("/manage/requests");
    await expect(page.locator("[data-testid='forbidden-screen']")).toBeVisible();
    await expect(page.locator("[role='alert']")).toContainText(
      "You are not allowed to do this."
    );

    // Logout flow (F-02, AC-05, AC-09)
    await page.click("[data-testid='logout-button']");
    await expect(page).toHaveURL(/\/login/);

    // After logout, protected screen redirects back to /login
    await page.goto("/items");
    await expect(page).toHaveURL(/\/login/);
  });

  test("custodian sees custodian navigation entries and cannot see borrower entries", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.fill("#username", "custodian1");
    await page.fill("#password", "demo_password_123");
    await page.click("button[type='submit']");

    await expect(page).toHaveURL(/\/items/);
    await expect(page.locator("[data-testid='user-role-badge']")).toHaveText(
      "(Custodian)"
    );

    // Navigation links for Custodian (SDS 11.1)
    await expect(page.locator("a.nav-link", { hasText: "Catalog" })).toBeVisible();
    await expect(
      page.locator("a.nav-link", { hasText: "Requests to Process" })
    ).toBeVisible();
    await expect(
      page.locator("a.nav-link", { hasText: "Active Loans" })
    ).toBeVisible();
    await expect(
      page.locator("a.nav-link", { hasText: "My Requests & Loans" })
    ).toHaveCount(0);

    // Attempt direct navigation to borrower route -> 403 Forbidden state
    await page.goto("/my");
    await expect(page.locator("[data-testid='forbidden-screen']")).toBeVisible();
    await expect(page.locator("[role='alert']")).toContainText(
      "You are not allowed to do this."
    );
  });
});
