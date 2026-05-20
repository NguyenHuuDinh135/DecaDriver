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

test.describe("Try-On", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_BASE}/garments/**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: MOCK_GARMENTS, count: MOCK_GARMENTS.length }),
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

  test('/try-on shows "Select a garment" heading and garment picker grid', async ({
    page,
  }) => {
    await page.goto("/try-on")

    await expect(
      page.getByRole("heading", { name: /Select a garment/i })
    ).toBeVisible()

    // Garment picker grid items from mock data
    await expect(page.getByText("Classic Oxford Shirt")).toBeVisible()
    await expect(page.getByText("Slim Fit Chinos")).toBeVisible()
    await expect(page.getByText("Leather Bomber Jacket")).toBeVisible()
  })

  test("/try-on selecting a garment enables the generate button", async ({
    page,
  }) => {
    await page.goto("/try-on")

    const generateButton = page.getByRole("button", { name: /Generate Try-On/i })
    await expect(generateButton).toBeDisabled()

    // Click the first garment in the picker grid
    await page.getByText("Classic Oxford Shirt").click()

    await expect(generateButton).toBeEnabled()
  })

  test("/try-on?garment=xxx pre-selects the garment from query param", async ({
    page,
  }) => {
    await page.goto("/try-on?garment=garment-2")

    // The selected garment preview panel should show the garment title
    await expect(page.getByText("Slim Fit Chinos")).toBeVisible()

    // Generate button should be enabled because a garment is already selected
    const generateButton = page.getByRole("button", { name: /Generate Try-On/i })
    await expect(generateButton).toBeEnabled()
  })

  test("/try-on/result?job=xxx shows polling state then result when complete", async ({
    page,
  }) => {
    const jobId = "tryon-job-456"

    // First call returns processing state
    let callCount = 0
    await page.route(`${API_BASE}/tryon/${jobId}`, (route) => {
      callCount++
      if (callCount === 1) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: jobId,
            garment_id: "garment-1",
            status: "processing",
            result_url: null,
            created_at: "2026-05-14T10:00:00Z",
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: jobId,
            garment_id: "garment-1",
            status: "completed",
            result_url: "https://cdn.example.com/results/look456.jpg",
            created_at: "2026-05-14T10:00:00Z",
          }),
        })
      }
    })

    await page.goto(`/try-on/result?job=${jobId}`)

    // Initial polling state: spinner copy is visible
    await expect(page.getByText(/Generating your look/i)).toBeVisible()

    // After the next poll resolves to completed, the result image and actions appear
    await expect(
      page.getByRole("button", { name: /Save to Wardrobe/i })
    ).toBeVisible({ timeout: 15000 })
  })

  test('/try-on/result "Save to Wardrobe" button navigates to /wardrobe', async ({
    page,
  }) => {
    const jobId = "tryon-job-789"

    await page.route(`${API_BASE}/tryon/${jobId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: jobId,
          garment_id: "garment-1",
          status: "completed",
          result_url: "https://cdn.example.com/results/look789.jpg",
          created_at: "2026-05-14T12:00:00Z",
        }),
      })
    })

    // Wardrobe page route: stub enough to not crash
    await page.route(`${API_BASE}/tryon/`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      })
    })

    await page.goto(`/try-on/result?job=${jobId}`)

    const saveButton = page.getByRole("button", { name: /Save to Wardrobe/i })
    await expect(saveButton).toBeVisible()

    await saveButton.click()
    await page.waitForURL("**/wardrobe")
  })
})
