import { test, expect } from "@playwright/test"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Inject a valid auth-storage cookie so the middleware treats the browser
 * session as authenticated without hitting the real API.
 */
async function injectAuthCookie(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    {
      name: "auth-storage",
      value: JSON.stringify({ state: { token: "fake-test-token", isAuthenticated: true } }),
      domain: "localhost",
      path: "/",
    },
  ])
}

// ---------------------------------------------------------------------------
// Landing page  (/)
// ---------------------------------------------------------------------------

test.describe("Landing page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
  })

  test("hero heading is visible", async ({ page }) => {
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Try on anything")
  })

  test("'Try It Free' button scrolls to demo section", async ({ page }) => {
    const demoSection = page.locator("#demo")
    await expect(demoSection).toBeAttached()

    await page.getByRole("button", { name: /try it free/i }).click()

    // After smooth-scroll, the demo section should be in the viewport
    await expect(demoSection).toBeInViewport({ ratio: 0.3 })
  })

  test("'Get Started' button links to /register", async ({ page }) => {
    const link = page.getByRole("link", { name: /get started/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/register")
  })

  test("'Sign In' button links to /login", async ({ page }) => {
    const link = page.getByRole("link", { name: /sign in/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/login")
  })

  test("demo section has two upload drop-zones", async ({ page }) => {
    // The two DropZone components each display their label text
    await expect(page.getByText("Full-body photo")).toBeVisible()
    await expect(page.getByText("Garment image")).toBeVisible()

    // Both zones share the same sub-label
    const dropZones = page.getByText("Drag & drop or click")
    await expect(dropZones).toHaveCount(2)
  })

  test("features section lists all three product pillars", async ({ page }) => {
    await expect(page.getByText("Virtual Try-On")).toBeVisible()
    await expect(page.getByText("AI Stylist")).toBeVisible()
    await expect(page.getByText("Smart Wardrobe")).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Login page  (/login)
// ---------------------------------------------------------------------------

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
  })

  test("page title renders", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible()
  })

  test("email and password inputs are present", async ({ page }) => {
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible()
    await expect(page.getByPlaceholder("••••••••")).toBeVisible()
  })

  test("submit button is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible()
  })

  test("empty form submission shows email validation error", async ({ page }) => {
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test("invalid email shows validation error", async ({ page }) => {
    await page.getByPlaceholder("you@example.com").fill("not-an-email")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test("missing password shows validation error", async ({ page }) => {
    await page.getByPlaceholder("you@example.com").fill("user@example.com")
    await page.getByRole("button", { name: /sign in/i }).click()
    await expect(page.getByText(/password is required/i)).toBeVisible()
  })

  test("link to /register is present", async ({ page }) => {
    const link = page.getByRole("link", { name: /get started/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/register")
  })

  test("successful login redirects to /feed", async ({ page }) => {
    // Mock the token endpoint
    await page.route("**/api/v1/login/access-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "fake-token", token_type: "bearer" }),
      })
    )

    await page.getByPlaceholder("you@example.com").fill("user@example.com")
    await page.getByPlaceholder("••••••••").fill("password123")
    await page.getByRole("button", { name: /sign in/i }).click()

    await page.waitForURL("**/feed")
  })

  test("invalid credentials shows error message", async ({ page }) => {
    await page.route("**/api/v1/login/access-token", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Incorrect email or password" }),
      })
    )

    await page.getByPlaceholder("you@example.com").fill("wrong@example.com")
    await page.getByPlaceholder("••••••••").fill("wrongpassword")
    await page.getByRole("button", { name: /sign in/i }).click()

    await expect(page.getByText(/incorrect email or password/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Register page  (/register)
// ---------------------------------------------------------------------------

test.describe("Register page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/register")
  })

  test("page title renders", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible()
  })

  test("all three inputs are present", async ({ page }) => {
    await expect(page.getByPlaceholder("Jane Smith")).toBeVisible()
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible()
    await expect(page.getByPlaceholder("••••••••")).toBeVisible()
  })

  test("submit button is visible", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible()
  })

  test("empty form submission shows full name validation error", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click()
    await expect(page.getByText(/full name is required/i)).toBeVisible()
  })

  test("invalid email shows validation error", async ({ page }) => {
    await page.getByPlaceholder("Jane Smith").fill("Jane Smith")
    await page.getByPlaceholder("you@example.com").fill("bad-email")
    await page.getByRole("button", { name: /create account/i }).click()
    await expect(page.getByText(/valid email/i)).toBeVisible()
  })

  test("short password shows validation error", async ({ page }) => {
    await page.getByPlaceholder("Jane Smith").fill("Jane Smith")
    await page.getByPlaceholder("you@example.com").fill("jane@example.com")
    await page.getByPlaceholder("••••••••").fill("short")
    await page.getByRole("button", { name: /create account/i }).click()
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test("link to /login is present", async ({ page }) => {
    const link = page.getByRole("link", { name: /sign in/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/login")
  })

  test("successful registration redirects to /onboarding", async ({ page }) => {
    await page.route("**/api/v1/users/signup", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          email: "newuser@example.com",
          full_name: "New User",
          is_active: true,
        }),
      })
    )
    await page.route("**/api/v1/login/access-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ access_token: "fake-token", token_type: "bearer" }),
      })
    )

    await page.getByPlaceholder("Jane Smith").fill("New User")
    await page.getByPlaceholder("you@example.com").fill("newuser@example.com")
    await page.getByPlaceholder("••••••••").fill("securepassword")
    await page.getByRole("button", { name: /create account/i }).click()

    await page.waitForURL("**/onboarding")
  })

  test("duplicate email shows error message", async ({ page }) => {
    await page.route("**/api/v1/users/signup", (route) =>
      route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Email already registered" }),
      })
    )

    await page.getByPlaceholder("Jane Smith").fill("Existing User")
    await page.getByPlaceholder("you@example.com").fill("existing@example.com")
    await page.getByPlaceholder("••••••••").fill("password123")
    await page.getByRole("button", { name: /create account/i }).click()

    await expect(page.getByText(/email already registered/i)).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// Onboarding  (/onboarding)
// ---------------------------------------------------------------------------

test.describe("Onboarding page", () => {
  test("unauthenticated access to protected route redirects to /login", async ({ page }) => {
    // /feed is a protected path — no cookie set, so middleware should redirect
    await page.goto("/feed")
    await expect(page).toHaveURL(/\/login/)
  })

  test("shows welcome step when authenticated", async ({ page }) => {
    await injectAuthCookie(page)
    await page.goto("/onboarding")

    await expect(
      page.getByRole("heading", { name: /welcome to decadriver/i })
    ).toBeVisible()
  })

  test("welcome step shows AI Avatar feature card", async ({ page }) => {
    await injectAuthCookie(page)
    await page.goto("/onboarding")

    await expect(page.getByText("AI Avatar")).toBeVisible()
  })

  test("welcome step shows Virtual Try-On feature card", async ({ page }) => {
    await injectAuthCookie(page)
    await page.goto("/onboarding")

    await expect(page.getByText("Virtual Try-On")).toBeVisible()
  })

  test("welcome step Get Started button advances to name step", async ({ page }) => {
    await injectAuthCookie(page)
    await page.goto("/onboarding")

    await page.getByRole("button", { name: /get started/i }).click()

    await expect(page.getByPlaceholder("Jane Smith")).toBeVisible()
  })

  test("progress indicator is visible", async ({ page }) => {
    await injectAuthCookie(page)
    await page.goto("/onboarding")

    // The ProgressIndicator renders 5 dot/bar elements
    const progressDots = page.locator(".h-1.rounded-full")
    await expect(progressDots).toHaveCount(5)
  })
})
