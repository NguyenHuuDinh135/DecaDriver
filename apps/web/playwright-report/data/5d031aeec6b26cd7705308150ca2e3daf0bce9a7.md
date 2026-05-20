# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e/auth.spec.ts >> Landing page >> demo section has two upload drop-zones
- Location: tests/e2e/auth.spec.ts:29:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('Garment image')
Expected: visible
Error: strict mode violation: getByText('Garment image') resolved to 2 elements:
    1) <p class="mt-3 text-muted-foreground">Upload your photo and a garment image to see the …</p> aka getByText('Upload your photo and a garment image to see the result.')
    2) <p class="text-sm font-medium text-foreground">Garment image</p> aka getByText('Garment image', { exact: true })

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('Garment image')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e4]:
        - generic [ref=e5]: DecaDriver
        - link "Open App" [ref=e7] [cursor=pointer]:
          - /url: /feed
    - generic [ref=e9]:
      - paragraph [ref=e10]: AI-Powered Fashion
      - heading "Try on anything, before you buy" [level=1] [ref=e11]:
        - text: Try on anything,
        - text: before you buy
      - paragraph [ref=e12]: Upload your photo and any garment. Our AI generates a photorealistic image of you wearing it — in seconds, for free.
      - generic [ref=e13]:
        - link "Try It Free" [ref=e14] [cursor=pointer]:
          - /url: /onboarding
          - img
          - text: Try It Free
        - link "Explore Feed" [ref=e15] [cursor=pointer]:
          - /url: /feed
    - generic [ref=e17]:
      - generic [ref=e18]:
        - heading "Fashion meets intelligence" [level=2] [ref=e19]
        - paragraph [ref=e20]: Three tools that transform how you shop and dress.
      - generic [ref=e21]:
        - generic [ref=e22]:
          - heading "Virtual Try-On" [level=3] [ref=e23]
          - paragraph [ref=e24]: See yourself in any garment instantly. Our AI generates photorealistic results in seconds.
        - generic [ref=e25]:
          - heading "AI Stylist" [level=3] [ref=e26]
          - paragraph [ref=e27]: Get personalized outfit recommendations based on your body type, preferences, and trends.
        - generic [ref=e28]:
          - heading "Smart Wardrobe" [level=3] [ref=e29]
          - paragraph [ref=e30]: Organize your closet digitally. Mix, match, and plan outfits with intelligent suggestions.
    - generic [ref=e32]:
      - generic [ref=e33]:
        - heading "Try it now" [level=2] [ref=e34]
        - paragraph [ref=e35]: Upload your photo and a garment image to see the result.
      - generic [ref=e36]:
        - generic [ref=e37]:
          - paragraph [ref=e38]: Your Photo
          - generic [ref=e40] [cursor=pointer]:
            - img [ref=e42]
            - paragraph [ref=e45]: Full-body photo
            - paragraph [ref=e46]: Drag & drop or click
        - generic [ref=e47]:
          - paragraph [ref=e48]: Garment
          - generic [ref=e50] [cursor=pointer]:
            - img [ref=e52]
            - paragraph [ref=e56]: Garment image
            - paragraph [ref=e57]: Drag & drop or click
      - generic [ref=e58]:
        - button "Generate Try-On" [disabled]:
          - img
          - text: Generate Try-On
    - contentinfo [ref=e59]:
      - generic [ref=e60]:
        - paragraph [ref=e61]: © 2026 DecaDriver
        - generic [ref=e62]:
          - link "Feed" [ref=e63] [cursor=pointer]:
            - /url: /feed
          - link "Try-On" [ref=e64] [cursor=pointer]:
            - /url: /try-on
          - link "Wardrobe" [ref=e65] [cursor=pointer]:
            - /url: /wardrobe
  - region "Notifications alt+T"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test"
  2  | 
  3  | // ---------------------------------------------------------------------------
  4  | // Landing page  (/)
  5  | // ---------------------------------------------------------------------------
  6  | 
  7  | test.describe("Landing page", () => {
  8  |   test.beforeEach(async ({ page }) => {
  9  |     await page.goto("/")
  10 |   })
  11 | 
  12 |   test("hero heading is visible", async ({ page }) => {
  13 |     await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
  14 |     await expect(page.getByRole("heading", { level: 1 })).toContainText("Try on anything")
  15 |   })
  16 | 
  17 |   test("'Open App' button links to /feed", async ({ page }) => {
  18 |     const link = page.getByRole("link", { name: /open app/i })
  19 |     await expect(link).toBeVisible()
  20 |     await expect(link).toHaveAttribute("href", "/feed")
  21 |   })
  22 | 
  23 |   test("'Try It Free' button links to /onboarding", async ({ page }) => {
  24 |     const link = page.getByRole("link", { name: /try it free/i }).first()
  25 |     await expect(link).toBeVisible()
  26 |     await expect(link).toHaveAttribute("href", "/onboarding")
  27 |   })
  28 | 
  29 |   test("demo section has two upload drop-zones", async ({ page }) => {
  30 |     // The two DropZone components each display their label text
  31 |     await expect(page.getByText("Full-body photo")).toBeVisible()
> 32 |     await expect(page.getByText("Garment image")).toBeVisible()
     |                                                   ^ Error: expect(locator).toBeVisible() failed
  33 | 
  34 |     // Both zones share the same sub-label
  35 |     const dropZones = page.getByText("Drag & drop or click")
  36 |     await expect(dropZones).toHaveCount(2)
  37 |   })
  38 | 
  39 |   test("features section lists all three product pillars", async ({ page }) => {
  40 |     await expect(page.getByText("Virtual Try-On")).toBeVisible()
  41 |     await expect(page.getByText("AI Stylist")).toBeVisible()
  42 |     await expect(page.getByText("Smart Wardrobe")).toBeVisible()
  43 |   })
  44 | })
  45 | 
  46 | // ---------------------------------------------------------------------------
  47 | // Onboarding  (/onboarding)
  48 | // ---------------------------------------------------------------------------
  49 | 
  50 | test.describe("Onboarding page", () => {
  51 |   test("unauthenticated access to app route does not redirect to /login", async ({ page }) => {
  52 |     await page.goto("/feed")
  53 |     await expect(page).toHaveURL(/\/feed/)
  54 |   })
  55 | 
  56 |   test("shows intro step without authentication", async ({ page }) => {
  57 |     await page.goto("/onboarding")
  58 | 
  59 |     await expect(
  60 |       page.getByRole("heading", { name: /create your likeness/i })
  61 |     ).toBeVisible()
  62 |   })
  63 | 
  64 |   test("intro step shows description text", async ({ page }) => {
  65 |     await page.goto("/onboarding")
  66 | 
  67 |     await expect(page.getByText(/build a private image profile/i)).toBeVisible()
  68 |   })
  69 | 
  70 |   test("intro step Continue button advances to privacy step", async ({ page }) => {
  71 |     await page.goto("/onboarding")
  72 | 
  73 |     await page.getByRole("button", { name: /continue/i }).click()
  74 | 
  75 |     await expect(page.getByRole("heading", { name: /privacy first/i })).toBeVisible()
  76 |   })
  77 | 
  78 |   test("progress indicator is visible", async ({ page }) => {
  79 |     await page.goto("/onboarding")
  80 | 
  81 |     const progressBar = page.getByRole("progressbar")
  82 |     await expect(progressBar).toBeVisible()
  83 |   })
  84 | })
  85 | 
```