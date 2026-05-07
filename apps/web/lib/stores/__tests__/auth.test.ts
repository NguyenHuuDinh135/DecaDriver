import { describe, it, expect, beforeEach, vi } from "vitest"
import { useAuthStore } from "../auth"

vi.mock("@/lib/api/client", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
  },
  configureAuth: vi.fn(),
  ApiClientError: class ApiClientError extends Error {
    status: number
    detail: string
    constructor(status: number, detail: string) {
      super(detail)
      this.status = status
      this.detail = detail
    }
  },
}))

describe("Auth Store", () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      token: null,
      isAuthenticated: false,
    })
  })

  describe("initial state", () => {
    it("starts with no user, no token, not authenticated", () => {
      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe("login", () => {
    it("sets token and isAuthenticated on successful login", async () => {
      const { api } = await import("@/lib/api/client")
      vi.mocked(api.post).mockResolvedValue({
        access_token: "new-token",
        token_type: "bearer",
      })

      await useAuthStore.getState().login("test@example.com", "password123")

      const state = useAuthStore.getState()
      expect(state.token).toBe("new-token")
      expect(state.isAuthenticated).toBe(true)
    })

    it("calls API with form data containing username and password", async () => {
      const { api } = await import("@/lib/api/client")
      vi.mocked(api.post).mockResolvedValue({
        access_token: "new-token",
        token_type: "bearer",
      })

      await useAuthStore.getState().login("test@example.com", "password123")

      expect(api.post).toHaveBeenCalledWith(
        "/login/access-token",
        undefined,
        expect.objectContaining({
          formData: expect.any(FormData),
        })
      )
    })
  })

  describe("logout", () => {
    it("clears user, token, and sets isAuthenticated to false", () => {
      useAuthStore.setState({
        user: {
          id: "1",
          email: "test@example.com",
          full_name: "Test",
          is_active: true,
        },
        token: "some-token",
        isAuthenticated: true,
      })

      useAuthStore.getState().logout()

      const state = useAuthStore.getState()
      expect(state.user).toBeNull()
      expect(state.token).toBeNull()
      expect(state.isAuthenticated).toBe(false)
    })
  })

  describe("setToken", () => {
    it("sets token and marks as authenticated", () => {
      useAuthStore.getState().setToken("manual-token")

      const state = useAuthStore.getState()
      expect(state.token).toBe("manual-token")
      expect(state.isAuthenticated).toBe(true)
    })
  })

  describe("setUser", () => {
    it("sets user in state", () => {
      const user = {
        id: "user-1",
        email: "test@example.com",
        full_name: "Test User",
        is_active: true,
      }

      useAuthStore.getState().setUser(user)

      expect(useAuthStore.getState().user).toEqual(user)
    })
  })
})
