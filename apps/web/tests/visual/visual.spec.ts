import { test, expect } from "@playwright/test"

const BREAKPOINTS = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
] as const

for (const bp of BREAKPOINTS) {
  test.describe(`Visual regression @ ${bp.name} (${bp.width}px)`, () => {
    test.use({ viewport: { width: bp.width, height: bp.height } })

    test("login page", async ({ page }) => {
      await page.goto("/login")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`login-${bp.name}.png`, {
        fullPage: true,
      })
    })

    test("feed page (empty)", async ({ page }) => {
      await page.goto("/feed")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`feed-empty-${bp.name}.png`, {
        fullPage: true,
      })
    })

    test("profile page", async ({ page }) => {
      await page.goto("/profile")
      await page.waitForLoadState("networkidle")
      await expect(page).toHaveScreenshot(`profile-${bp.name}.png`, {
        fullPage: true,
      })
    })
  })
}
