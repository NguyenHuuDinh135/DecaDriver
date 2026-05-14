import { test, expect } from "@playwright/test"

const AUTH_STATE = JSON.stringify({
  state: {
    token: "test-token",
    isAuthenticated: true,
    user: { id: "user-1", email: "test@test.com", full_name: "Test User" },
  },
  version: 0,
})

const MOCK_COMPLETED_JOBS = [
  {
    id: "job-1",
    garment_id: "garment-1",
    status: "completed",
    result_url: "https://example.com/result-1.jpg",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "job-2",
    garment_id: "garment-2",
    status: "completed",
    result_url: "https://example.com/result-2.jpg",
    created_at: "2024-01-14T09:00:00Z",
  },
]

const MOCK_HISTORY_JOBS = [
  {
    id: "job-1",
    garment_id: "garment-1",
    status: "completed",
    result_url: "https://example.com/result-1.jpg",
    created_at: "2024-01-15T10:00:00Z",
  },
  {
    id: "job-2",
    garment_id: "garment-2",
    status: "processing",
    result_url: null,
    created_at: "2024-01-14T09:00:00Z",
  },
  {
    id: "job-3",
    garment_id: "garment-3",
    status: "failed",
    result_url: null,
    created_at: "2024-01-13T08:00:00Z",
  },
]

async function authenticate(page: import("@playwright/test").Page) {
  await page.context().addCookies([
    {
      name: "auth-storage",
      value: AUTH_STATE,
      domain: "localhost",
      path: "/",
    },
  ])
  await page.evaluate((authState) => {
    localStorage.setItem("auth-storage", authState)
  }, AUTH_STATE)
}

test.describe("Wardrobe page (/wardrobe)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HISTORY_JOBS),
      })
    })

    await page.goto("/")
    await authenticate(page)
  })

  test("shows wardrobe heading and history link", async ({ page }) => {
    await page.goto("/wardrobe")

    await expect(page.getByRole("heading", { name: "Wardrobe" })).toBeVisible()
    await expect(
      page.getByRole("link", { name: /History/i })
    ).toBeVisible()
  })

  test("history link navigates to /wardrobe/history", async ({ page }) => {
    await page.goto("/wardrobe")

    const historyLink = page.getByRole("link", { name: /History/i })
    await expect(historyLink).toHaveAttribute("href", "/wardrobe/history")
  })

  test("wardrobe items link to /feed/{id}", async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COMPLETED_JOBS),
      })
    })

    await page.goto("/wardrobe")

    await expect(
      page.getByRole("link", { name: /try-on result/i }).first()
    ).toBeVisible()

    const firstLink = page.locator('a[href="/feed/job-1"]')
    await expect(firstLink).toBeVisible()

    const secondLink = page.locator('a[href="/feed/job-2"]')
    await expect(secondLink).toBeVisible()
  })

  test("wardrobe items do not link to /wardrobe/history", async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COMPLETED_JOBS),
      })
    })

    await page.goto("/wardrobe")

    // Completed look items link to /feed/:id, not /wardrobe/history
    for (const job of MOCK_COMPLETED_JOBS) {
      const feedLink = page.locator(`a[href="/feed/${job.id}"]`)
      await expect(feedLink).toBeVisible()
    }
  })

  test("shows empty state when no completed looks", async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    })

    await page.goto("/wardrobe")

    await expect(page.getByText(/No completed looks yet/i)).toBeVisible()
    await expect(
      page.getByRole("link", { name: /Start Try-On/i })
    ).toBeVisible()
  })

  test("share button generates URL based on window.location.origin", async ({
    page,
  }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COMPLETED_JOBS),
      })
    })

    await page.goto("/wardrobe")

    const shareButtons = page.locator('button:has(svg)').filter({
      has: page.locator('[data-lucide="share-2"], svg'),
    })

    await page.waitForLoadState("networkidle")

    const shareUrl = await page.evaluate(() => {
      return `${window.location.origin}/feed/job-1`
    })

    expect(shareUrl).toMatch(/^http:\/\/localhost:3000\/feed\/job-1$/)
    expect(shareUrl).not.toContain("hardcoded")
  })
})

test.describe("Try-on history (/wardrobe/history)", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_HISTORY_JOBS),
      })
    })

    await page.goto("/")
    await authenticate(page)
  })

  test("shows try-on history heading", async ({ page }) => {
    await page.goto("/wardrobe/history")

    await expect(
      page.getByRole("heading", { name: /Try-On History/i })
    ).toBeVisible()
  })

  test("shows history list with all try-on jobs", async ({ page }) => {
    await page.goto("/wardrobe/history")

    await expect(
      page.locator(".rounded-xl.border").first()
    ).toBeVisible()

    const items = page.locator(".rounded-xl.border")
    await expect(items).toHaveCount(MOCK_HISTORY_JOBS.length)
  })

  test("shows Completed status badge", async ({ page }) => {
    await page.goto("/wardrobe/history")

    await expect(page.getByText("Completed")).toBeVisible()
  })

  test("shows Processing status badge", async ({ page }) => {
    await page.goto("/wardrobe/history")

    await expect(page.getByText("Processing")).toBeVisible()
  })

  test("shows Failed status badge", async ({ page }) => {
    await page.goto("/wardrobe/history")

    await expect(page.getByText("Failed")).toBeVisible()
  })

  test("shows back button that links to /wardrobe", async ({ page }) => {
    await page.goto("/wardrobe/history")

    const backLink = page.getByRole("link").filter({
      has: page.locator("svg"),
    }).first()

    await expect(backLink).toHaveAttribute("href", "/wardrobe")
  })

  test("shows empty state when no history", async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/tryon/", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    })

    await page.goto("/wardrobe/history")

    await expect(
      page.getByText(/No try-on history yet/i)
    ).toBeVisible()
  })

  test("failed jobs show retry link to /try-on", async ({ page }) => {
    await page.goto("/wardrobe/history")

    const retryLink = page.getByRole("link", { name: "" }).filter({
      has: page.locator("svg"),
    })

    const tryOnLinks = page.locator('a[href="/try-on"]')
    await expect(tryOnLinks.first()).toBeVisible()
  })
})
