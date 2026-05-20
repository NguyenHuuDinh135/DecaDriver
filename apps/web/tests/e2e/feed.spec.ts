import { test, expect } from "@playwright/test"

const API_BASE = "http://localhost:8000/api/v1"

const MOCK_GARMENTS = [
  {
    id: "garment-1",
    title: "Classic Oxford Shirt",
    brand: "Maison Noir",
    image_url: "https://cdn.example.com/garments/oxford.webp",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "garment-2",
    title: "Slim Fit Chinos",
    brand: "DecaBasics",
    image_url: "https://cdn.example.com/garments/chinos.webp",
    created_at: "2026-04-02T11:00:00Z",
  },
  {
    id: "garment-3",
    title: "Leather Bomber Jacket",
    brand: null,
    image_url: "https://cdn.example.com/garments/bomber.webp",
    created_at: "2026-04-03T12:00:00Z",
  },
]

const MOCK_COMPLETED_LOOKS = [
  {
    id: "tryon-abc1",
    garment_id: "garment-1",
    status: "completed",
    result_url: "https://cdn.example.com/results/look1.jpg",
    created_at: "2026-04-15T10:30:00Z",
  },
  {
    id: "tryon-abc2",
    garment_id: "garment-2",
    status: "completed",
    result_url: "https://cdn.example.com/results/look2.jpg",
    created_at: "2026-04-16T14:00:00Z",
  },
]

const AUTH_STORAGE_VALUE = JSON.stringify({
  state: {
    token: "test-token",
    isAuthenticated: true,
    user: {
      id: "user-1",
      email: "test@test.com",
      full_name: "Test User",
    },
  },
  version: 0,
})

async function setupAuth(page: import("@playwright/test").Page) {
  // Navigate to an unprotected page so we can set storage before hitting protected routes
  await page.goto("/")

  // Set localStorage so Zustand's persist middleware hydrates the auth store
  await page.evaluate((value) => {
    localStorage.setItem("auth-storage", value)
  }, AUTH_STORAGE_VALUE)

  // Set a cookie with the same payload so the Next.js middleware also
  // recognises the session without redirecting to /login
  await page.context().addCookies([
    {
      name: "auth-storage",
      value: AUTH_STORAGE_VALUE,
      domain: "localhost",
      path: "/",
    },
  ])
}

test.describe("Feed", () => {
  test.beforeEach(async ({ page }) => {
    // Default API mocks used by most feed tests
    await page.route(`${API_BASE}/garments/**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_GARMENTS, count: MOCK_GARMENTS.length }),
      })
    })

    await page.route(`${API_BASE}/recommend/**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_GARMENTS),
      })
    })

    await page.route(`${API_BASE}/stylist/profile`, (route) => {
      route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ detail: "No style profile found" }),
      })
    })

    await page.route(`${API_BASE}/avatar/status`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "avatar-job-123",
          status: "completed",
          lora_s3_key: "s3://models/user-1/lora.safetensors",
          reference_image_url: "https://cdn.example.com/avatars/user-1.webp",
          created_at: "2026-04-01T08:00:00Z",
        }),
      })
    })

    await setupAuth(page)
  })

  test('/feed shows "Your Style Feed" heading, "Your Looks" section, and "Discover" section', async ({
    page,
  }) => {
    await page.route(`${API_BASE}/tryon/`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COMPLETED_LOOKS),
      })
    })

    await page.goto("/feed")

    await expect(page.getByRole("heading", { name: "Your Style Feed" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Your Looks" })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Discover" })).toBeVisible()
  })

  test('/feed empty state shows "No looks yet" message with "Start a Try-On" button', async ({
    page,
  }) => {
    await page.route(`${API_BASE}/tryon/`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    })

    await page.goto("/feed")

    await expect(
      page.getByText(/No looks yet/i)
    ).toBeVisible()

    const startButton = page.getByRole("button", { name: /Start a Try-On/i })
    await expect(startButton).toBeVisible()

    await startButton.click()
    await page.waitForURL("**/try-on")
  })

  test("/feed/products shows search input and garment grid", async ({ page }) => {
    await page.goto("/feed/products")

    await expect(
      page.getByPlaceholder(/Search garments/i)
    ).toBeVisible()

    // At least one garment card from the mocked data should appear
    await expect(page.getByText("Classic Oxford Shirt")).toBeVisible()
    await expect(page.getByText("Slim Fit Chinos")).toBeVisible()
    await expect(page.getByText("Leather Bomber Jacket")).toBeVisible()
  })

  test("/feed/[lookId] shows look detail with garment info", async ({ page }) => {
    const lookId = "tryon-abc1"

    await page.route(`${API_BASE}/tryon/${lookId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: lookId,
          garment_id: "garment-1",
          status: "completed",
          result_url: "https://cdn.example.com/results/look1.jpg",
          created_at: "2026-04-15T10:30:00Z",
        }),
      })
    })

    await page.goto(`/feed/${lookId}`)

    // Garment title from the garments list mock (garment-1 → "Classic Oxford Shirt")
    await expect(page.getByText("Classic Oxford Shirt")).toBeVisible()

    // Brand of garment-1
    await expect(page.getByText("Maison Noir")).toBeVisible()
  })
})
