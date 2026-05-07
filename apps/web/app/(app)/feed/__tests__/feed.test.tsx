import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { http, HttpResponse } from "msw"
import { useAuthStore } from "@/lib/stores/auth"
import { server } from "@/tests/mocks/server"
import FeedPage from "../page"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    back: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode
    href: string
  }) => createElement("a", { href }, children),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe("FeedPage", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("renders the page heading", async () => {
    render(createElement(FeedPage), { wrapper: createWrapper() })

    expect(screen.getByText("Your Style Feed")).toBeDefined()
  })

  it("renders the Your Looks section heading", async () => {
    render(createElement(FeedPage), { wrapper: createWrapper() })

    expect(screen.getByText("Your Looks")).toBeDefined()
  })

  it("renders the Discover section heading", async () => {
    render(createElement(FeedPage), { wrapper: createWrapper() })

    expect(screen.getByText("Discover")).toBeDefined()
  })

  it("shows loading skeletons while fetching", () => {
    render(createElement(FeedPage), { wrapper: createWrapper() })

    const pulseElements = document.querySelectorAll(".animate-pulse")
    expect(pulseElements.length).toBeGreaterThan(0)
  })

  it("shows empty state when no completed looks", async () => {
    server.use(
      http.get("http://localhost:8000/api/v1/tryon/", () => {
        return HttpResponse.json([])
      })
    )

    render(createElement(FeedPage), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(
        screen.getByText(
          "No looks yet. Try on a garment to create your first look."
        )
      ).toBeDefined()
    })
  })

  it("renders completed looks as cards", async () => {
    render(createElement(FeedPage), { wrapper: createWrapper() })

    await waitFor(() => {
      expect(screen.getByText("Look #on-1")).toBeDefined()
    })
  })
})
