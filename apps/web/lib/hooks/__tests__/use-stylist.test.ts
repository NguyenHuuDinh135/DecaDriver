import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { http, HttpResponse } from "msw"
import { useAnalyzeStyle, useRecommendations } from "../use-stylist"
import { useAuthStore } from "@/lib/stores/auth"
import { server } from "@/tests/mocks/server"

const BASE_URL = "http://localhost:8000/api/v1"

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
      mutations: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe("useAnalyzeStyle", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("submits analysis successfully", async () => {
    const { result } = renderHook(() => useAnalyzeStyle(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      image_url: "https://cdn.example.com/avatars/user-123.webp",
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.body_type).toBe("Athletic")
    expect(result.current.data?.color_tone).toBe("Warm")
    expect(result.current.data?.height_estimate).toBe("175cm")
    expect(result.current.data?.recommended_styles).toContain("Minimalist")
    expect(result.current.data?.avoid_styles).toContain("Oversized")
  })

  it("handles server error", async () => {
    server.use(
      http.post(`${BASE_URL}/stylist/analyze`, () => {
        return HttpResponse.json(
          { detail: "Internal server error" },
          { status: 500 }
        )
      })
    )

    const { result } = renderHook(() => useAnalyzeStyle(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({
      image_url: "https://cdn.example.com/avatars/user-123.webp",
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it("handles validation error when image_url is missing", async () => {
    server.use(
      http.post(`${BASE_URL}/stylist/analyze`, () => {
        return HttpResponse.json(
          { detail: "image_url is required" },
          { status: 422 }
        )
      })
    )

    const { result } = renderHook(() => useAnalyzeStyle(), {
      wrapper: createWrapper(),
    })

    result.current.mutate({ image_url: "" })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe("useRecommendations", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("fetches recommendations when profile exists", async () => {
    const { result } = renderHook(() => useRecommendations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(4)
    expect(result.current.data?.[0]?.title).toBe("Classic Oxford Shirt")
  })

  it("does not fetch when profile does not exist", async () => {
    server.use(
      http.get(`${BASE_URL}/stylist/profile`, () => {
        return HttpResponse.json(
          { detail: "Not found" },
          { status: 404 }
        )
      })
    )

    const { result } = renderHook(() => useRecommendations(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle")
    })
  })

  it("respects limit parameter", async () => {
    const { result } = renderHook(() => useRecommendations(2), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(2)
  })
})
