import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { http, HttpResponse } from "msw"
import { useTryOnHistory, useCompletedTryOns, useTryOnDetail } from "../use-wardrobe"
import { useAuthStore } from "@/lib/stores/auth"
import { server } from "@/tests/mocks/server"

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

describe("useTryOnHistory", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("fetches try-on history", async () => {
    const { result } = renderHook(() => useTryOnHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    const data = result.current.data!
    expect(data).toHaveLength(4)
    expect(data[0]!.id).toBe("tryon-1")
    expect(data[0]!.status).toBe("completed")
  })

  it("handles empty state", async () => {
    server.use(
      http.get("http://localhost:8000/api/v1/tryon/", () => {
        return HttpResponse.json([])
      })
    )

    const { result } = renderHook(() => useTryOnHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(0)
  })
})

describe("useCompletedTryOns", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("filters to only completed jobs", async () => {
    const { result } = renderHook(() => useCompletedTryOns(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(2)
    expect(result.current.data.every((j) => j.status === "completed")).toBe(true)
  })
})

describe("useTryOnDetail", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("fetches a single try-on job", async () => {
    const { result } = renderHook(() => useTryOnDetail("tryon-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe("tryon-1")
    expect(result.current.data?.status).toBe("completed")
  })

  it("does not fetch when id is empty", () => {
    const { result } = renderHook(() => useTryOnDetail(""), {
      wrapper: createWrapper(),
    })

    expect(result.current.isFetching).toBe(false)
  })
})
