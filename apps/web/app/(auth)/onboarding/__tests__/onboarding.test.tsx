import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { createElement } from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}))

vi.mock("motion/react", () => {
  const React = require("react")
  return {
    AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
    motion: new Proxy(
      {},
      {
        get: (_target: unknown, prop: string) => {
          return React.forwardRef((props: Record<string, unknown>, ref: unknown) => {
            const {
              initial: _i, animate: _a, exit: _e, transition: _t,
              whileHover: _wh, whileTap: _wt, variants: _v,
              ...rest
            } = props
            return React.createElement(prop, { ...rest, ref })
          })
        },
      }
    ),
    useReducedMotion: () => false,
  }
})

async function renderOnboarding() {
  const OnboardingPage = (await import("../page")).default
  render(createElement(OnboardingPage))
}

async function advanceToCapture() {
  await renderOnboarding()

  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
  fireEvent.click(screen.getByRole("button", { name: "Start Selfies" }))

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: "Look straight ahead" })
    ).toBeInTheDocument()
  })
}

async function captureAllSelfies() {
  await advanceToCapture()

  for (let index = 0; index < 6; index += 1) {
    fireEvent.click(screen.getByRole("button", { name: "Capture" }))
  }

  await waitFor(() => {
    expect(
      screen.getByRole("heading", { name: "Selfies complete" })
    ).toBeInTheDocument()
    expect(screen.getByText("6 / 6")).toBeInTheDocument()
  })

  fireEvent.click(screen.getByRole("button", { name: "Continue" }))
}

async function advanceToReview() {
  await captureAllSelfies()

  await waitFor(() => {
    expect(screen.getByText("Add 2 full-length photos")).toBeInTheDocument()
  })

  fireEvent.click(
    screen.getByRole("button", { name: "Add full body photo 1" })
  )
  fireEvent.click(
    screen.getByRole("button", { name: "Add full body photo 2" })
  )

  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  await waitFor(() => {
    expect(screen.getByText("Review your image profile")).toBeInTheDocument()
  })
}

async function advanceToNotifications() {
  await advanceToReview()

  fireEvent.click(screen.getByRole("button", { name: "Create Likeness" }))

  await waitFor(() => {
    expect(screen.getByText("One more thing")).toBeInTheDocument()
  })
}

describe("Likeness onboarding flow", () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it("renders the webapp likeness intro as the active onboarding route", async () => {
    await renderOnboarding()

    expect(
      screen.getByRole("heading", { name: "Create your likeness" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Build a private image profile/i)
    ).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "1"
    )
  })

  it("moves through intro, privacy, selfie instructions, and back navigation", async () => {
    await renderOnboarding()

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(
      screen.getByRole("heading", { name: "Privacy first" })
    ).toBeInTheDocument()
    expect(
      screen.getByText(/They are not uploaded or shared/i)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Back" }))
    expect(screen.getByText("Create your likeness")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    fireEvent.click(screen.getByRole("button", { name: "Continue" }))
    expect(
      screen.getByRole("heading", { name: "Take 6 selfies" })
    ).toBeInTheDocument()
    expect(screen.getAllByText("Straight ahead").length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Start Selfies" })).toBeEnabled()
  })

  it("captures six mock selfies and advances prompts", async () => {
    await advanceToCapture()

    fireEvent.click(screen.getByRole("button", { name: "Capture" }))

    await waitFor(() => {
      expect(screen.getByText("1 / 6")).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Turn to your left profile" })
      ).toBeInTheDocument()
    })

    for (let index = 0; index < 5; index += 1) {
      fireEvent.click(screen.getByRole("button", { name: "Capture" }))
    }

    await waitFor(() => {
      expect(screen.getByText("6 / 6")).toBeInTheDocument()
      expect(
        screen.getByRole("heading", { name: "Selfies complete" })
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
    })
  })

  it("gates full-body Continue until both mock slots are filled", async () => {
    await captureAllSelfies()

    const continueButton = screen.getByRole("button", { name: "Continue" })
    expect(continueButton).toBeDisabled()

    fireEvent.click(
      screen.getByRole("button", { name: "Add full body photo 1" })
    )
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()

    fireEvent.click(
      screen.getByRole("button", { name: "Add full body photo 2" })
    )
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
  })

  it("keeps review CTA disabled when a required image is removed", async () => {
    await advanceToReview()

    const createButton = screen.getByRole("button", {
      name: "Create Likeness",
    })
    expect(createButton).toBeEnabled()

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Straight ahead selfie" })
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Create Likeness" })
      ).toBeDisabled()
      expect(screen.getByText("5 / 6")).toBeInTheDocument()
    })
  })

  it("allows skipping notifications and routing to brand selection", async () => {
    await advanceToNotifications()

    fireEvent.click(screen.getByRole("button", { name: "Skip" }))

    await waitFor(() => {
      expect(screen.getByText("Creating your likeness")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole("button", { name: "Select Brands" }))
    expect(mockPush).toHaveBeenCalledWith("/onboarding/brands")
  })

  it("allows enabling mock notifications before creating", async () => {
    await advanceToNotifications()

    fireEvent.click(
      screen.getByRole("button", { name: "Enable Notifications" })
    )

    await waitFor(() => {
      expect(screen.getByText("Creating your likeness")).toBeInTheDocument()
    })
  })
})
