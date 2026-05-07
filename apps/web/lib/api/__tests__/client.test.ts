import { describe, it, expect, beforeEach, vi } from "vitest"
import { api, configureAuth, ApiClientError } from "../client"

const BASE_URL = "http://localhost:8000/api/v1"

describe("API Client", () => {
  let mockLogout: ReturnType<typeof vi.fn>

  beforeEach(() => {
    mockLogout = vi.fn()
    configureAuth({
      getToken: () => "test-token",
      logout: mockLogout,
    })
    vi.restoreAllMocks()
  })

  describe("token attachment", () => {
    it("attaches Authorization header when token exists", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "test" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      await api.get("/test")

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/test`,
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      )
    })

    it("does not attach Authorization header when no token", async () => {
      configureAuth({
        getToken: () => null,
        logout: mockLogout,
      })

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: "test" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      await api.get("/test")

      const headers = mockFetch.mock.calls[0]![1]!.headers
      expect(headers.Authorization).toBeUndefined()
    })
  })

  describe("401 handling", () => {
    it("calls logout and throws on 401 response", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ detail: "Unauthorized" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(api.get("/protected")).rejects.toThrow(ApiClientError)
      expect(mockLogout).toHaveBeenCalled()
    })
  })

  describe("error handling", () => {
    it("throws ApiClientError with detail from response body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ detail: "Validation error" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      try {
        await api.get("/test")
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).status).toBe(422)
        expect((error as ApiClientError).detail).toBe("Validation error")
      }
    })

    it("handles non-JSON error responses", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.reject(new Error("not json")),
      })
      vi.stubGlobal("fetch", mockFetch)

      try {
        await api.get("/test")
      } catch (error) {
        expect(error).toBeInstanceOf(ApiClientError)
        expect((error as ApiClientError).detail).toBe("Internal Server Error")
      }
    })
  })

  describe("HTTP methods", () => {
    it("sends POST with JSON body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "1" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      await api.post("/items", { name: "test" })

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/items`,
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ name: "test" }),
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        })
      )
    })

    it("sends POST with FormData", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ token: "abc" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      const formData = new FormData()
      formData.append("username", "test@example.com")

      await api.post("/login", undefined, { formData })

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/login`,
        expect.objectContaining({
          method: "POST",
          body: formData,
        })
      )
    })

    it("sends PUT with JSON body", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ id: "1", name: "updated" }),
      })
      vi.stubGlobal("fetch", mockFetch)

      await api.put("/items/1", { name: "updated" })

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/items/1`,
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ name: "updated" }),
        })
      )
    })

    it("sends DELETE request", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
        json: () => Promise.resolve(undefined),
      })
      vi.stubGlobal("fetch", mockFetch)

      await api.delete("/items/1")

      expect(mockFetch).toHaveBeenCalledWith(
        `${BASE_URL}/items/1`,
        expect.objectContaining({
          method: "DELETE",
        })
      )
    })
  })
})
