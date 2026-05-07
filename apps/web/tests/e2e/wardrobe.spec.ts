import { test, expect } from "@playwright/test"

test.describe("Wardrobe", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("test@example.com")
    await page.getByLabel("Password").fill("password123")
    await page.getByRole("button", { name: /sign in|log in/i }).click()
    await page.waitForURL("**/feed")
  })

  test("view wardrobe page with grid of completed looks", async ({ page }) => {
    await page.goto("/wardrobe")
    await expect(page.getByText("Wardrobe")).toBeVisible()
    await expect(page.getByText("History")).toBeVisible()
  })

  test("navigate to history page shows all try-on jobs", async ({ page }) => {
    await page.goto("/wardrobe/history")
    await expect(page.getByText("Try-On History")).toBeVisible()
  })

  test("history page shows status badges", async ({ page }) => {
    await page.goto("/wardrobe/history")
    await expect(page.getByText("Completed")).toBeVisible()
    await expect(page.getByText("Processing")).toBeVisible()
    await expect(page.getByText("Failed")).toBeVisible()
  })
})
