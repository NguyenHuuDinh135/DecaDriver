import { describe, it, expect, beforeEach, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createElement, type ReactNode } from "react"
import { http, HttpResponse } from "msw"
import { useUploadAvatar, useAvatarStatus, useHasAvatar } from "../use-avatar"
import { useAuthStore } from "@/lib/stores/auth"
import { setMockAvatarStatus } from "@/tests/mocks/handlers"
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

function createMockFile(name: string, size = 1024): File {
  const buffer = new ArrayBuffer(size)
  return new File([buffer], name, { type: "image/jpeg" })
}

describe("useUploadAvatar", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
    setMockAvatarStatus("pending")
  })

  it("uploads images successfully", async () => {
    const images = Array.from({ length: 5 }, (_, i) =>
      createMockFile(`photo-${i}.jpg`)
    )

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(images)

    await waitFor(() => {
      expect(result.current.isIdle).toBe(false)
    })

    await waitFor(
      () => {
        expect(
          result.current.isSuccess || result.current.isError
        ).toBe(true)
      },
      { timeout: 5000 }
    )

    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual({
      id: "avatar-job-123",
      status: "pending",
      lora_s3_key: null,
      reference_image_url: null,
      created_at: "2026-05-07T10:30:00Z",
    })
  })

  it("fails when server rejects insufficient images", async () => {
    server.use(
      http.post(`${BASE_URL}/avatar/train`, () => {
        return HttpResponse.json(
          { detail: "At least 5 images are required" },
          { status: 422 }
        )
      })
    )

    const images = Array.from({ length: 3 }, (_, i) =>
      createMockFile(`photo-${i}.jpg`)
    )

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(images)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })

  it("fails when not authenticated", async () => {
    useAuthStore.setState({
      token: null,
      isAuthenticated: false,
    })

    const images = Array.from({ length: 5 }, (_, i) =>
      createMockFile(`photo-${i}.jpg`)
    )

    const { result } = renderHook(() => useUploadAvatar(), {
      wrapper: createWrapper(),
    })

    result.current.mutate(images)

    await waitFor(() => {
      expect(result.current.isError).toBe(true)
    })
  })
})

describe("useAvatarStatus", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("fetches avatar status", async () => {
    setMockAvatarStatus("processing")

    const { result } = renderHook(() => useAvatarStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("processing")
  })

  it("returns completed status with lora key", async () => {
    setMockAvatarStatus("completed")

    const { result } = renderHook(() => useAvatarStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("completed")
    expect(result.current.data?.lora_s3_key).toBe(
      "s3://models/user-123/lora.safetensors"
    )
  })

  it("returns failed status", async () => {
    setMockAvatarStatus("failed")

    const { result } = renderHook(() => useAvatarStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data?.status).toBe("failed")
  })
})

describe("useHasAvatar", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: "mock-jwt-token",
      isAuthenticated: true,
    })
  })

  it("returns true when status is completed", async () => {
    setMockAvatarStatus("completed")

    const { result } = renderHook(() => useHasAvatar(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toBe(true)
    })
  })

  it("returns false when status is not completed", async () => {
    setMockAvatarStatus("processing")

    const { result } = renderHook(() => useHasAvatar(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toBe(false)
    })
  })
})
