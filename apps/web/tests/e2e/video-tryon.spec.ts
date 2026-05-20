import { test, expect } from "@playwright/test"

const API_BASE = "http://localhost:8000/api/v1"

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
  await page.goto("/")
  await page.evaluate((value) => {
    localStorage.setItem("auth-storage", value)
  }, AUTH_STORAGE_VALUE)
  await page.context().addCookies([
    {
      name: "auth-storage",
      value: AUTH_STORAGE_VALUE,
      domain: "localhost",
      path: "/",
    },
  ])
}

test.describe("Video Try-On Flow", () => {
  const imageJobId = "tryon-job-100"
  const videoJobId = "video-job-200"

  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
  })

  test("complete flow: image result → Generate Video → video pending → video completed", async ({
    page,
  }) => {
    // Mock: completed image try-on job
    await page.route(`${API_BASE}/tryon/${imageJobId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: imageJobId,
          garment_id: "garment-1",
          status: "completed",
          result_url: "https://cdn.example.com/results/look100.jpg",
          created_at: "2026-05-15T10:00:00Z",
        }),
      })
    })

    // Mock: POST video-tryon (create video job)
    await page.route(`${API_BASE}/video-tryon/*`, (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: videoJobId,
            tryon_job_id: imageJobId,
            status: "pending",
            result_url: null,
            created_at: "2026-05-15T10:01:00Z",
          }),
        })
      }
    })

    // Navigate to the image result page
    await page.goto(`/try-on/result?job=${imageJobId}`)

    // Wait for the result to load and show "Generate Video" button
    const videoButton = page.getByRole("button", { name: /Generate Video/i })
    await expect(videoButton).toBeVisible()
    await expect(videoButton).toBeEnabled()

    // Mock: GET video-tryon job — first pending, then completed
    let videoCallCount = 0
    await page.route(`${API_BASE}/video-tryon/${videoJobId}`, (route) => {
      videoCallCount++
      if (videoCallCount <= 2) {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: videoJobId,
            tryon_job_id: imageJobId,
            status: "pending",
            result_url: null,
            created_at: "2026-05-15T10:01:00Z",
          }),
        })
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: videoJobId,
            tryon_job_id: imageJobId,
            status: "completed",
            result_url: "https://cdn.example.com/results/video200.mp4",
            created_at: "2026-05-15T10:01:00Z",
          }),
        })
      }
    })

    // Click "Generate Video"
    await videoButton.click()

    // Should navigate to video result page
    await page.waitForURL(`**/try-on/video?job=${videoJobId}`)

    // Should show pending state first
    await expect(page.getByText(/Generating your video/i)).toBeVisible()

    // After polling resolves to completed, video player and actions appear
    await expect(
      page.getByRole("button", { name: /Download/i })
    ).toBeVisible({ timeout: 30000 })
    await expect(page.getByRole("button", { name: /Share/i })).toBeVisible()

    // Video element should exist
    const video = page.locator("video")
    await expect(video).toBeVisible()
    await expect(video).toHaveAttribute("src", "https://cdn.example.com/results/video200.mp4")
  })

  test("/try-on/video shows pending state while job is processing", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/video-tryon/${videoJobId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: videoJobId,
          tryon_job_id: imageJobId,
          status: "processing",
          result_url: null,
          created_at: "2026-05-15T10:01:00Z",
        }),
      })
    })

    await page.goto(`/try-on/video?job=${videoJobId}`)

    await expect(page.getByText(/Generating your video/i)).toBeVisible()
    await expect(page.getByText(/30-60 seconds/i)).toBeVisible()
  })

  test("/try-on/video shows failed state with retry button", async ({ page }) => {
    await page.route(`${API_BASE}/video-tryon/${videoJobId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: videoJobId,
          tryon_job_id: imageJobId,
          status: "failed",
          result_url: null,
          created_at: "2026-05-15T10:01:00Z",
        }),
      })
    })

    await page.goto(`/try-on/video?job=${videoJobId}`)

    await expect(page.getByText(/Video generation failed/i)).toBeVisible()

    const retryButton = page.getByRole("button", { name: /Try Again/i })
    await expect(retryButton).toBeVisible()

    // Mock garments + avatar for the try-on page we'll navigate to
    await page.route(`${API_BASE}/garments/**`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], count: 0 }),
      })
    })
    await page.route(`${API_BASE}/avatar/status`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ id: "a1", status: "completed", lora_s3_key: null, reference_image_url: null, created_at: null }),
      })
    })

    await retryButton.click()
    await page.waitForURL("**/try-on")
  })

  test("/try-on/video with no job param shows error and back button", async ({
    page,
  }) => {
    await page.goto("/try-on/video")

    await expect(page.getByText(/No video job specified/i)).toBeVisible()

    const backButton = page.getByRole("button", { name: /Back to Try-On/i })
    await expect(backButton).toBeVisible()
  })

  test("/try-on/result Generate Video button shows loading state", async ({
    page,
  }) => {
    await page.route(`${API_BASE}/tryon/${imageJobId}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: imageJobId,
          garment_id: "garment-1",
          status: "completed",
          result_url: "https://cdn.example.com/results/look100.jpg",
          created_at: "2026-05-15T10:00:00Z",
        }),
      })
    })

    // Delay the video-tryon POST response to test loading state
    await page.route(`${API_BASE}/video-tryon/*`, async (route) => {
      if (route.request().method() === "POST") {
        await new Promise((resolve) => setTimeout(resolve, 2000))
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            id: videoJobId,
            tryon_job_id: imageJobId,
            status: "pending",
            result_url: null,
            created_at: "2026-05-15T10:01:00Z",
          }),
        })
      }
    })

    await page.goto(`/try-on/result?job=${imageJobId}`)

    const videoButton = page.getByRole("button", { name: /Generate Video/i })
    await expect(videoButton).toBeVisible()

    await videoButton.click()

    // Button should show loading state
    await expect(page.getByRole("button", { name: /Starting/i })).toBeVisible()
    await expect(page.getByRole("button", { name: /Starting/i })).toBeDisabled()
  })
})
