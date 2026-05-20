/**
 * Mock data for demo / offline rendering.
 * All images live under /mock/ in the public directory.
 */

export interface MockGarment {
  id: string
  title: string
  brand: string | null
  image_url: string
  created_at: string
}

export interface MockLook {
  id: string
  garment_id: string
  status: "completed"
  result_url: string
  created_at: string
}

export const MOCK_GARMENTS: MockGarment[] = [
  {
    id: "g-001",
    title: "Tailored Navy Blazer",
    brand: "Atelier Moderne",
    image_url: "/mock/blazer-navy.png",
    created_at: "2026-05-18T10:00:00Z",
  },
  {
    id: "g-002",
    title: "Silk Cowl-Neck Blouse",
    brand: "Maison Lumière",
    image_url: "/mock/blouse-cream.png",
    created_at: "2026-05-17T14:30:00Z",
  },
  {
    id: "g-003",
    title: "Premium Dark Denim",
    brand: "Selvedge & Co.",
    image_url: "/mock/jeans-dark.png",
    created_at: "2026-05-16T09:15:00Z",
  },
  {
    id: "g-004",
    title: "Garden Floral Midi Dress",
    brand: "Petal Studio",
    image_url: "/mock/dress-floral.png",
    created_at: "2026-05-15T11:45:00Z",
  },
  {
    id: "g-005",
    title: "Cable-Knit Cashmere Sweater",
    brand: "Cashmere Collective",
    image_url: "/mock/sweater-camel.png",
    created_at: "2026-05-14T16:20:00Z",
  },
  {
    id: "g-006",
    title: "Essential Cotton Tee",
    brand: "Aeterna Basics",
    image_url: "/mock/tshirt-white.png",
    created_at: "2026-05-13T08:00:00Z",
  },
  {
    id: "g-007",
    title: "Rider Leather Jacket",
    brand: "Noir Atelier",
    image_url: "/mock/jacket-leather.png",
    created_at: "2026-05-12T13:10:00Z",
  },
  {
    id: "g-008",
    title: "Pleated Satin Midi Skirt",
    brand: "Verdant",
    image_url: "/mock/skirt-pleated.png",
    created_at: "2026-05-11T17:30:00Z",
  },
]

export const MOCK_LOOKS: MockLook[] = [
  {
    id: "look-001",
    garment_id: "g-001",
    status: "completed",
    result_url: "/mock/look-1.png",
    created_at: "2026-05-19T09:00:00Z",
  },
  {
    id: "look-002",
    garment_id: "g-002",
    status: "completed",
    result_url: "/mock/look-2.png",
    created_at: "2026-05-18T14:00:00Z",
  },
  {
    id: "look-003",
    garment_id: "g-005",
    status: "completed",
    result_url: "/mock/look-3.png",
    created_at: "2026-05-17T11:30:00Z",
  },
  {
    id: "look-004",
    garment_id: "g-007",
    status: "completed",
    result_url: "/mock/look-4.png",
    created_at: "2026-05-16T16:45:00Z",
  },
]

export const MOCK_STYLE_PROFILE = {
  body_type: "Inverted Triangle",
  color_tone: "Cool / Winter",
  height_estimate: "170 cm",
  recommended_styles: [
    "Structured Blazers",
    "A-Line Skirts",
    "Tailored Trousers",
    "V-Neck Tops",
  ],
  avoid_styles: ["Oversized Shoulders", "Heavy Patterns", "Boxy Cuts"],
}
