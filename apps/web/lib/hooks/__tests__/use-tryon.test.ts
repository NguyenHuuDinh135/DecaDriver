import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { http, HttpResponse } from "msw"
import {
  useGarments,
  useCreateTryOn,
  useTryOnResult,
  useTryOnHistory,
} from "../use-tryon"
import { useAuthStore } from "@/lib/stores/auth"
import { setMockTryOnJobStatus } from "@/tests/mocks/handlers"
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

describe("useGarments", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("fetches garments for page 0", async () => {
    const { result } = renderHook(() => useGarments(0, 20), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data).toHaveLength(4)
    expect(result.current.data?.count).toBe(4)
    expect(result.current.data?.data?.[0]?.title).toBe("Classic Oxford Shirt")
  })

  it("handles pagination with skip parameter", async () => {
    server.use(
      http.get(`${BASE_URL}/garments/`, ({ request }) => {
        const url = new URL(request.url)
        const skip = Number(url.searchParams.get("skip") ?? "0")

        if (skip >= 4) {
          return HttpResponse.json({ data: [], count: 4 })
        }

        return HttpResponse.json({
          data: [
            {
              id: `garment-page-${skip}`,
              title: `Item at offset ${skip}`,
              brand: null,
              image_url: "https://cdn.example.com/garments/test.webp",
              created_at: "2026-04-01T10:00:00Z",
            },
          ],
          count: 10,
        })
      })
    )

    const { result } = renderHook(() => useGarments(1, 2), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.data?.[0]?.id).toBe("garment-page-2")
  })

  it("fails when not authenticated", async () => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
    })

    const { result } = renderHook(() => useGarments(0, 20), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe("useCreateTryOn", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("creates a try-on job successfully", async () => {
    const { result } = renderHook(() => useCreateTryOn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("garment-1")

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe("tryon-new-123")
    expect(result.current.data?.garment_id).toBe("garment-1")
    expect(result.current.data?.status).toBe("pending")
  })

  it("fails when not authenticated", async () => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
    })

    const { result } = renderHook(() => useCreateTryOn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("garment-1")

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it("fails when server rejects the request", async () => {
    server.use(
      http.post(`${BASE_URL}/tryon/`, () => {
        return HttpResponse.json(
          { detail: "garment_id is required" },
          { status: 422 }
        )
      })
    )

    const { result } = renderHook(() => useCreateTryOn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("")

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe("useTryOnResult", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
    setMockTryOnJobStatus("pending")
  })

  it("fetches job status when completed", async () => {
    setMockTryOnJobStatus("completed")

    const { result } = renderHook(() => useTryOnResult("tryon-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("completed")
    expect(result.current.data?.result_url).toBe(
      "https://cdn.example.com/results/look1.jpg"
    )
  })

  it("returns pending status with null result_url", async () => {
    setMockTryOnJobStatus("pending")

    const { result } = renderHook(() => useTryOnResult("tryon-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("pending")
    expect(result.current.data?.result_url).toBeNull()
  })

  it("handles failed status", async () => {
    setMockTryOnJobStatus("failed")

    const { result } = renderHook(() => useTryOnResult("tryon-1"), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("failed")
    expect(result.current.data?.result_url).toBeNull()
  })

  it("does not fetch when jobId is null", () => {
    const { result } = renderHook(() => useTryOnResult(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })
})

describe("useTryOnHistory", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("fetches all try-on jobs", async () => {
    const { result } = renderHook(() => useTryOnHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toHaveLength(4)
    expect(result.current.data?.[0]?.id).toBe("tryon-1")
  })

  it("fails when not authenticated", async () => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
    })

    const { result } = renderHook(() => useTryOnHistory(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})
