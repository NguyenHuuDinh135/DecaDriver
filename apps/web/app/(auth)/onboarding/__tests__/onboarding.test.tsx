import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { useAuthStore } from "@/lib/stores/auth"

const mockPush = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
  }),
}))

vi.mock("browser-image-compression", () => ({
  default: (file: File) => Promise.resolve(file),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe("Onboarding Wizard", () => {
  beforeEach(() => {
    mockPush.mockClear()
    useAuthStore.setState({
      user: {
        id: "user-123",
        email: "test@example.com",
        full_name: "Test User",
        is_active: true,
      },
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("renders welcome step initially", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    expect(screen.getByText("Welcome to DecaDriver")).toBeInTheDocument()
    expect(screen.getByText("Get Started")).toBeInTheDocument()
  })

  it("navigates forward from welcome to name step", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByText(/what.*s your name/i)).toBeInTheDocument()
    })
  })

  it("navigates back from name step to welcome", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByText("Back")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Back"))

    await waitFor(() => {
      expect(screen.getByText("Welcome to DecaDriver")).toBeInTheDocument()
    })
  })

  it("validates name is required with minimum 2 characters", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    })

    const input = screen.getByLabelText("Full Name")
    fireEvent.change(input, { target: { value: "A" } })

    const continueBtn = screen.getByRole("button", { name: /continue/i })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(
        screen.getByText("Name must be at least 2 characters")
      ).toBeInTheDocument()
    })
  })

  it("advances to preference step after valid name submission", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    })

    const input = screen.getByLabelText("Full Name")
    fireEvent.change(input, { target: { value: "Jane Doe" } })

    const continueBtn = screen.getByRole("button", { name: /continue/i })
    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText("What do you wear?")).toBeInTheDocument()
    })
  })

  it("cannot advance from preference step without selection", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText("What do you wear?")).toBeInTheDocument()
    })

    const continueBtn = screen.getByRole("button", { name: /continue/i })
    expect(continueBtn).toBeDisabled()
  })

  it("allows preference selection and advances", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText("Menswear")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Menswear"))

    const continueBtn = screen.getByRole("button", { name: /continue/i })
    expect(continueBtn).not.toBeDisabled()

    fireEvent.click(continueBtn)

    await waitFor(() => {
      expect(screen.getByText("Create your likeness")).toBeInTheDocument()
    })
  })

  it("shows completion step with redirect button after skipping avatar", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    render(createElement(Wrapper, null, createElement(OnboardingPage)))

    fireEvent.click(screen.getByText("Get Started"))

    await waitFor(() => {
      expect(screen.getByLabelText("Full Name")).toBeInTheDocument()
    })

    fireEvent.change(screen.getByLabelText("Full Name"), {
      target: { value: "Jane Doe" },
    })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText("Menswear")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Womenswear"))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    await waitFor(() => {
      expect(screen.getByText("Skip for now")).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText("Skip for now"))

    await waitFor(() => {
      expect(screen.getByText(/you.*re all set/i)).toBeInTheDocument()
    })

    expect(
      screen.getByText("Avatar skipped (create later in profile)")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByText("Start Exploring"))
    expect(mockPush).toHaveBeenCalledWith("/feed")
  })

  it("displays progress indicator with correct number of dots", async () => {
    const OnboardingPage = (await import("../page")).default
    const Wrapper = createWrapper()

    const { container } = render(
      createElement(Wrapper, null, createElement(OnboardingPage))
    )

    const dots = container.querySelectorAll(".rounded-full.h-1")
    expect(dots.length).toBe(5)
  })
})
