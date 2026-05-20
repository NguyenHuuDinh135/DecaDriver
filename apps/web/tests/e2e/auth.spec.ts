import { test, expect } from "@playwright/test"

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

  test("'Open App' button links to /feed", async ({ page }) => {
    const link = page.getByRole("link", { name: /open app/i })
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/feed")
  })

  test("'Try It Free' button links to /onboarding", async ({ page }) => {
    const link = page.getByRole("link", { name: /try it free/i }).first()
    await expect(link).toBeVisible()
    await expect(link).toHaveAttribute("href", "/onboarding")
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
// Onboarding  (/onboarding)
// ---------------------------------------------------------------------------

test.describe("Onboarding page", () => {
  test("unauthenticated access to app route does not redirect to /login", async ({ page }) => {
    await page.goto("/feed")
    await expect(page).toHaveURL(/\/feed/)
  })

  test("shows intro step without authentication", async ({ page }) => {
    await page.goto("/onboarding")

    await expect(
      page.getByRole("heading", { name: /create your likeness/i })
    ).toBeVisible()
  })

  test("intro step shows description text", async ({ page }) => {
    await page.goto("/onboarding")

    await expect(page.getByText(/build a private image profile/i)).toBeVisible()
  })

  test("intro step Continue button advances to privacy step", async ({ page }) => {
    await page.goto("/onboarding")

    await page.getByRole("button", { name: /continue/i }).click()

    await expect(page.getByRole("heading", { name: /privacy first/i })).toBeVisible()
  })

  test("progress indicator is visible", async ({ page }) => {
    await page.goto("/onboarding")

    const progressBar = page.getByRole("progressbar")
    await expect(progressBar).toBeVisible()
  })
})
