import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
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
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  render(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(OnboardingPage)
    )
  )
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

async function uploadUserBodyPhoto() {
  await waitFor(() => {
    expect(screen.getByText("Upload your full-body photo")).toBeInTheDocument()
  })

  const bodyInput = document.querySelector('input[name="body_reference"]')!
  const bodyFile = new File(["body"], "my-body-photo.jpg", { type: "image/jpeg" })
  fireEvent.change(bodyInput, { target: { files: [bodyFile] } })
}

async function advanceToReview() {
  await captureAllSelfies()
  await uploadUserBodyPhoto()

  await waitFor(() => {
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
  })
  fireEvent.click(screen.getByRole("button", { name: "Continue" }))

  await waitFor(() => {
    expect(screen.getByText("Review your image profile")).toBeInTheDocument()
  })
}

async function advanceToOutfit() {
  await advanceToReview()

  fireEvent.click(screen.getByRole("button", { name: "Choose Outfit" }))

  await waitFor(() => {
    expect(screen.getByText("Upload top and bottom")).toBeInTheDocument()
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

  it("requires users to upload their own full-body photo before review", async () => {
    await captureAllSelfies()

    expect(screen.getByText("Upload your full-body photo")).toBeInTheDocument()
    expect(screen.getAllByText(/This is the photo the AI will dress/i).length).toBeGreaterThan(0)
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled()

    await uploadUserBodyPhoto()

    await waitFor(() => {
      expect(screen.getAllByText("my-body-photo.jpg").length).toBeGreaterThan(0)
      expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled()
    })
  })

  it("keeps review CTA disabled when a required image is removed", async () => {
    await advanceToReview()

    const createButton = screen.getByRole("button", {
      name: "Choose Outfit",
    })
    expect(createButton).toBeEnabled()

    fireEvent.click(
      screen.getByRole("button", { name: "Remove Straight ahead selfie" })
    )

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Choose Outfit" })
      ).toBeDisabled()
      expect(screen.getByText("5 / 6")).toBeInTheDocument()
    })
  })

  it("requires both top and bottom before submitting full outfit", async () => {
    await advanceToOutfit()

    const generateButton = screen.getByRole("button", {
      name: /Generate Full Outfit/i,
    })
    expect(generateButton).toBeDisabled()

    const fileInputs = document.querySelectorAll('input[type="file"]')
    const topFile = new File(["top"], "top.jpg", { type: "image/jpeg" })
    const bottomFile = new File(["bottom"], "bottom.jpg", { type: "image/jpeg" })

    const topInput = fileInputs[fileInputs.length - 2]!

    fireEvent.change(topInput, { target: { files: [topFile] } })
    expect(screen.getByRole("button", { name: /Generate Full Outfit/i })).toBeDisabled()

    const refreshedInputs = document.querySelectorAll('input[type="file"]')
    const bottomInput = refreshedInputs[refreshedInputs.length - 1]!
    fireEvent.change(bottomInput, { target: { files: [bottomFile] } })
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Generate Full Outfit/i })).toBeEnabled()
    })
  })

  it("keeps video generation optional on the result step", async () => {
    await advanceToOutfit()

    expect(screen.getByText("Upload top and bottom")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Create Video/i })).not.toBeInTheDocument()
  })
})
