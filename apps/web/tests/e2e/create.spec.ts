import { test, expect } from "@playwright/test"

const AUTH_STATE = JSON.stringify({
  state: {
    token: "test-token",
    isAuthenticated: true,
    user: { id: "user-1", email: "test@test.com", full_name: "Test User" },
  },
  version: 0,
})

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

test.describe("Create hub (/create)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await authenticate(page)
  })

  test("shows hub with 3 create options", async ({ page }) => {
    await page.goto("/create")

    await expect(page.getByRole("heading", { name: "Create" })).toBeVisible()
    await expect(
      page.getByText("What would you like to do?")
    ).toBeVisible()

    await expect(page.getByRole("link", { name: /Create a Look/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /Add a Link/i })).toBeVisible()
    await expect(page.getByRole("link", { name: /Create a Post/i })).toBeVisible()
  })

  test("Create a Look option links to /try-on", async ({ page }) => {
    await page.goto("/create")

    const link = page.getByRole("link", { name: /Create a Look/i })
    await expect(link).toHaveAttribute("href", "/try-on")
  })

  test("Add a Link option links to /create/link", async ({ page }) => {
    await page.goto("/create")

    const link = page.getByRole("link", { name: /Add a Link/i })
    await expect(link).toHaveAttribute("href", "/create/link")
  })

  test("Create a Post option links to /create/post", async ({ page }) => {
    await page.goto("/create")

    const link = page.getByRole("link", { name: /Create a Post/i })
    await expect(link).toHaveAttribute("href", "/create/post")
  })
})

test.describe("Import from URL (/create/link)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await authenticate(page)
  })

  test("shows URL input, title input, and submit button", async ({ page }) => {
    await page.goto("/create/link")

    await expect(
      page.getByRole("heading", { name: /Import from URL/i })
    ).toBeVisible()
    await expect(page.getByLabel("Title")).toBeVisible()
    await expect(page.getByLabel("Image URL")).toBeVisible()
    await expect(
      page.getByRole("button", { name: /Import Garment/i })
    ).toBeVisible()
  })

  test("submit button is disabled when form is empty", async ({ page }) => {
    await page.goto("/create/link")

    const submitButton = page.getByRole("button", { name: /Import Garment/i })
    await expect(submitButton).toBeDisabled()
  })

  test("submit button is disabled when only title is filled", async ({
    page,
  }) => {
    await page.goto("/create/link")

    await page.getByLabel("Title").fill("Blue Denim Jacket")
    const submitButton = page.getByRole("button", { name: /Import Garment/i })
    await expect(submitButton).toBeDisabled()
  })

  test("submit button is disabled when only URL is filled", async ({
    page,
  }) => {
    await page.goto("/create/link")

    await page.getByLabel("Image URL").fill("https://example.com/jacket.jpg")
    const submitButton = page.getByRole("button", { name: /Import Garment/i })
    await expect(submitButton).toBeDisabled()
  })

  test("successful submission navigates to /wardrobe", async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/garments/", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "garment-1",
            title: "Blue Denim Jacket",
            image_url: "https://example.com/jacket.jpg",
            created_at: new Date().toISOString(),
          }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto("/create/link")

    await page.getByLabel("Title").fill("Blue Denim Jacket")
    await page
      .getByLabel("Image URL")
      .fill("https://example.com/jacket.jpg")

    await page.getByRole("button", { name: /Import Garment/i }).click()

    await page.waitForURL("**/wardrobe")
    await expect(page).toHaveURL(/\/wardrobe$/)
  })

  test("shows error message when API call fails", async ({ page }) => {
    await page.route("http://localhost:8000/api/v1/garments/", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ detail: "Internal server error" }),
        })
      } else {
        route.continue()
      }
    })

    await page.goto("/create/link")

    await page.getByLabel("Title").fill("Blue Denim Jacket")
    await page
      .getByLabel("Image URL")
      .fill("https://example.com/jacket.jpg")

    await page.getByRole("button", { name: /Import Garment/i }).click()

    await expect(page.getByText(/Internal server error/i)).toBeVisible()
  })
})

test.describe("Create post (/create/post)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/")
    await authenticate(page)
  })

  test("renders the post creation UI", async ({ page }) => {
    await page.goto("/create/post")

    await expect(page.getByRole("heading", { name: /Post New Look/i })).toBeVisible()
    await expect(
      page.getByPlaceholder(/Describe your style/i)
    ).toBeVisible()
    await expect(page.getByText(/Tap to upload video\/photo/i)).toBeVisible()
  })

  test("post button is disabled when caption is empty", async ({ page }) => {
    await page.goto("/create/post")

    const postButton = page.getByRole("button", { name: /Post/i })
    await expect(postButton).toBeDisabled()
  })

  test("post button is enabled after entering caption", async ({ page }) => {
    await page.goto("/create/post")

    await page
      .getByPlaceholder(/Describe your style/i)
      .fill("My outfit today")

    const postButton = page.getByRole("button", { name: /Post/i })
    await expect(postButton).toBeEnabled()
  })
})
