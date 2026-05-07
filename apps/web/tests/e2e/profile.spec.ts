import { test, expect } from "@playwright/test"

test.describe("Profile & Settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login")
    await page.getByLabel("Email").fill("test@example.com")
    await page.getByLabel("Password").fill("password123")
    await page.getByRole("button", { name: /sign in|log in/i }).click()
    await page.waitForURL("**/feed")
  })

  test("view profile page shows user info", async ({ page }) => {
    await page.goto("/profile")
    await expect(page.getByText("Profile")).toBeVisible()
    await expect(page.getByText("Edit Profile")).toBeVisible()
  })

  test("navigate to settings and edit name", async ({ page }) => {
    await page.goto("/profile/settings")
    await expect(page.getByLabel("Full Name")).toBeVisible()

    await page.getByLabel("Full Name").clear()
    await page.getByLabel("Full Name").fill("Updated Name")
    await page.getByRole("button", { name: /save/i }).click()

    await expect(page.getByText(/profile updated/i)).toBeVisible()
  })

  test("change password form validates", async ({ page }) => {
    await page.goto("/profile/settings")

    await page.getByLabel("Current Password").fill("myold")
    await page.getByLabel("New Password").fill("short")
    await page.getByLabel("Confirm Password").fill("short")
    await page.getByRole("button", { name: /change password/i }).click()

    await expect(page.getByText(/at least 8 characters/i)).toBeVisible()
  })

  test("delete account flow has confirmation steps", async ({ page }) => {
    await page.goto("/profile/settings")

    await page.getByRole("button", { name: /delete account/i }).click()
    await expect(page.getByText(/are you sure/i)).toBeVisible()

    await page.getByRole("button", { name: /continue/i }).click()
    await expect(page.getByPlaceholder("Type DELETE")).toBeVisible()

    const deleteButton = page.getByRole("button", { name: /delete forever/i })
    await expect(deleteButton).toBeDisabled()

    await page.getByPlaceholder("Type DELETE").fill("DELETE")
    await expect(deleteButton).toBeEnabled()
  })
})
