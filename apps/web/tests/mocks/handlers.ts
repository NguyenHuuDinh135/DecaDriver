import { http, HttpResponse } from "msw"

const BASE_URL = "http://localhost:8000/api/v1"

let avatarJobStatus = "pending"
let mockTryOnJobStatus = "completed"

export function setMockAvatarStatus(status: string) {
  avatarJobStatus = status
}

export function setMockTryOnJobStatus(status: string) {
  mockTryOnJobStatus = status
}

const MOCK_GARMENTS = [
  {
    id: "garment-1",
    title: "Classic Oxford Shirt",
    brand: "Maison Noir",
    image_url: "https://cdn.example.com/garments/oxford.webp",
    created_at: "2026-04-01T10:00:00Z",
  },
  {
    id: "garment-2",
    title: "Slim Fit Chinos",
    brand: "DecaBasics",
    image_url: "https://cdn.example.com/garments/chinos.webp",
    created_at: "2026-04-02T11:00:00Z",
  },
  {
    id: "garment-3",
    title: "Leather Bomber Jacket",
    brand: null,
    image_url: "https://cdn.example.com/garments/bomber.webp",
    created_at: "2026-04-03T12:00:00Z",
  },
  {
    id: "garment-4",
    title: "Cashmere Sweater",
    brand: "Luxe Line",
    image_url: "https://cdn.example.com/garments/sweater.webp",
    created_at: "2026-04-04T09:00:00Z",
  },
]

export const handlers = [
  http.post(`${BASE_URL}/avatar/train`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    avatarJobStatus = "pending"
    return HttpResponse.json({
      id: "avatar-job-123",
      status: "pending",
      lora_s3_key: null,
      reference_image_url: null,
      created_at: "2026-05-07T10:30:00Z",
    })
  }),

  http.get(`${BASE_URL}/avatar/status`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    return HttpResponse.json({
      id: "avatar-job-123",
      status: avatarJobStatus,
      lora_s3_key:
        avatarJobStatus === "completed"
          ? "s3://models/user-123/lora.safetensors"
          : null,
      reference_image_url:
        avatarJobStatus === "completed"
          ? "https://cdn.example.com/avatars/user-123.webp"
          : null,
      created_at: "2026-05-07T10:30:00Z",
    })
  }),

  http.post(`${BASE_URL}/login/access-token`, async ({ request }) => {
    const formData = await request.formData()
    const username = formData.get("username")
    const password = formData.get("password")

    if (username === "test@example.com" && password === "password123") {
      return HttpResponse.json({
        access_token: "mock-jwt-token",
        token_type: "bearer",
      })
    }

    return HttpResponse.json(
      { detail: "Incorrect email or password" },
      { status: 401 }
    )
  }),

  http.post(`${BASE_URL}/users/signup`, async ({ request }) => {
    const body = (await request.json()) as {
      email: string
      password: string
      full_name: string
    }

    if (body.email === "existing@example.com") {
      return HttpResponse.json(
        { detail: "A user with this email already exists" },
        { status: 400 }
      )
    }

    return HttpResponse.json({
      id: "user-123",
      email: body.email,
      full_name: body.full_name,
      is_active: true,
    })
  }),

  http.get(`${BASE_URL}/users/me`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    return HttpResponse.json({
      id: "user-123",
      email: "test@example.com",
      full_name: "Test User",
      is_active: true,
      created_at: "2025-11-15T08:00:00Z",
    })
  }),

  http.patch(`${BASE_URL}/users/me`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const body = (await request.json()) as { full_name?: string; email?: string }

    return HttpResponse.json({
      id: "user-123",
      email: body.email ?? "test@example.com",
      full_name: body.full_name ?? "Test User",
      is_active: true,
      created_at: "2025-11-15T08:00:00Z",
    })
  }),

  http.delete(`${BASE_URL}/users/me`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.patch(`${BASE_URL}/users/me/password`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const body = (await request.json()) as {
      current_password: string
      new_password: string
    }

    if (body.current_password === "wrong-password") {
      return HttpResponse.json(
        { detail: "Incorrect password" },
        { status: 400 }
      )
    }

    return HttpResponse.json({ message: "Password updated successfully" })
  }),

  http.get(`${BASE_URL}/garments/`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const url = new URL(request.url)
    const skip = Number(url.searchParams.get("skip") ?? "0")
    const limit = Number(url.searchParams.get("limit") ?? "20")
    const sliced = MOCK_GARMENTS.slice(skip, skip + limit)

    return HttpResponse.json({
      data: sliced,
      count: MOCK_GARMENTS.length,
    })
  }),

  http.get(`${BASE_URL}/garments/:id`, ({ request, params }) => {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const { id } = params
    const garment = MOCK_GARMENTS.find((g) => g.id === id)

    if (!garment) {
      return HttpResponse.json({ detail: "Garment not found" }, { status: 404 })
    }

    return HttpResponse.json(garment)
  }),

  http.delete(`${BASE_URL}/tryon/:id`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    return new HttpResponse(null, { status: 204 })
  }),

  http.post(`${BASE_URL}/tryon/`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const url = new URL(request.url)
    const garmentId = url.searchParams.get("garment_id")

    if (!garmentId) {
      return HttpResponse.json(
        { detail: "garment_id is required" },
        { status: 422 }
      )
    }

    return HttpResponse.json({
      id: "tryon-new-123",
      garment_id: garmentId,
      status: "pending",
      result_url: null,
      created_at: "2026-05-07T15:00:00Z",
    })
  }),

  http.get(`${BASE_URL}/tryon/`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    return HttpResponse.json([
      {
        id: "tryon-1",
        garment_id: "garment-1",
        status: "completed",
        result_url: "https://cdn.example.com/results/look1.jpg",
        created_at: "2026-04-15T10:30:00Z",
      },
      {
        id: "tryon-2",
        garment_id: "garment-2",
        status: "processing",
        result_url: null,
        created_at: "2026-04-16T14:00:00Z",
      },
      {
        id: "tryon-3",
        garment_id: "garment-3",
        status: "failed",
        result_url: null,
        created_at: "2026-04-14T09:15:00Z",
      },
      {
        id: "tryon-4",
        garment_id: "garment-4",
        status: "completed",
        result_url: "https://cdn.example.com/results/look4.jpg",
        created_at: "2026-04-13T16:45:00Z",
      },
    ])
  }),

  http.get(`${BASE_URL}/tryon/:id`, ({ request, params }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const { id } = params

    return HttpResponse.json({
      id,
      garment_id: "garment-1",
      status: mockTryOnJobStatus,
      result_url:
        mockTryOnJobStatus === "completed"
          ? "https://cdn.example.com/results/look1.jpg"
          : null,
      created_at: "2026-04-15T10:30:00Z",
    })
  }),

  http.get(`${BASE_URL}/stylist/profile`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    return HttpResponse.json({
      body_type: "Athletic",
      color_tone: "Warm",
      height_estimate: "175cm",
      recommended_styles: ["Minimalist", "Classic", "Smart Casual"],
      avoid_styles: ["Oversized", "Neon"],
    })
  }),

  http.post(`${BASE_URL}/stylist/analyze`, async ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const body = (await request.json()) as { image_url: string }

    if (!body.image_url) {
      return HttpResponse.json(
        { detail: "image_url is required" },
        { status: 422 }
      )
    }

    return HttpResponse.json({
      body_type: "Athletic",
      color_tone: "Warm",
      height_estimate: "175cm",
      recommended_styles: ["Minimalist", "Classic", "Smart Casual"],
      avoid_styles: ["Oversized", "Neon"],
    })
  }),

  http.get(`${BASE_URL}/recommend/`, ({ request }) => {
    const authHeader = request.headers.get("Authorization")

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return HttpResponse.json({ detail: "Not authenticated" }, { status: 401 })
    }

    const url = new URL(request.url)
    const limit = Number(url.searchParams.get("limit") ?? "20")

    const recommendations = MOCK_GARMENTS.slice(0, limit)
    return HttpResponse.json(recommendations)
  }),
]
