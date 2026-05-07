import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { useCurrentUser } from "../use-auth"
import { useAuthStore } from "@/lib/stores/auth"

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe("useCurrentUser", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  it("does not fetch when not authenticated", () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.data).toBeUndefined()
  })

  it("fetches user when authenticated", async () => {
    useAuthStore.setState({
      token: "mock-jwt-token",
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toEqual({
      id: "user-123",
      email: "test@example.com",
      full_name: "Test User",
      is_active: true,
      created_at: "2025-11-15T08:00:00Z",
    })
  })

  it("updates store user on successful fetch", async () => {
    useAuthStore.setState({
      token: "mock-jwt-token",
      isAuthenticated: true,
    })

    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(useAuthStore.getState().user).toEqual({
      id: "user-123",
      email: "test@example.com",
      full_name: "Test User",
      is_active: true,
      created_at: "2025-11-15T08:00:00Z",
    })
  })
})
