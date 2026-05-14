import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { http, HttpResponse } from "msw"
import { useCreateVideoTryOn, useVideoTryOnResult } from "../use-video-tryon"
import { useAuthStore } from "@/lib/stores/auth"
import { setMockVideoTryOnJobStatus } from "@/tests/mocks/handlers"
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

describe("useCreateVideoTryOn", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("creates a video try-on job with tryon_job_id", async () => {
    const { result } = renderHook(() => useCreateVideoTryOn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("tryon-1")

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe("video-tryon-job-123")
    expect(result.current.data?.tryon_job_id).toBe("tryon-1")
    expect(result.current.data?.status).toBe("pending")
    expect(result.current.data?.result_url).toBeNull()
  })

  it("fails when not authenticated", async () => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
    })

    const { result } = renderHook(() => useCreateVideoTryOn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("tryon-1")

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it("fails when server rejects the request", async () => {
    server.use(
      http.post(`${BASE_URL}/video-tryon/`, () => {
        return HttpResponse.json(
          { detail: "tryon_job_id is required" },
          { status: 422 }
        )
      })
    )

    const { result } = renderHook(() => useCreateVideoTryOn(), {
      wrapper: createWrapper(),
    })

    result.current.mutate("")

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe("useVideoTryOnResult", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
    setMockVideoTryOnJobStatus("pending")
  })

  it("fetches video try-on job result when completed", async () => {
    setMockVideoTryOnJobStatus("completed")

    const { result } = renderHook(
      () => useVideoTryOnResult("video-tryon-job-123"),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.id).toBe("video-tryon-job-123")
    expect(result.current.data?.tryon_job_id).toBe("tryon-1")
    expect(result.current.data?.status).toBe("completed")
    expect(result.current.data?.result_url).toBe(
      "https://cdn.example.com/results/video-look1.mp4"
    )
  })

  it("returns pending status with null result_url", async () => {
    setMockVideoTryOnJobStatus("pending")

    const { result } = renderHook(
      () => useVideoTryOnResult("video-tryon-job-123"),
      { wrapper: createWrapper() }
    )

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("pending")
    expect(result.current.data?.result_url).toBeNull()
  })

  it("does not fetch when jobId is null", () => {
    const { result } = renderHook(() => useVideoTryOnResult(null), {
      wrapper: createWrapper(),
    })

    expect(result.current.fetchStatus).toBe("idle")
  })

  it("does not fetch when jobId is undefined", () => {
    const { result } = renderHook(
      () => useVideoTryOnResult(undefined as unknown as string | null),
      { wrapper: createWrapper() }
    )

    expect(result.current.fetchStatus).toBe("idle")
  })
})
