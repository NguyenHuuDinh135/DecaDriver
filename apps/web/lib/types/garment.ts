export interface Garment {
  id: string
  title: string
  brand: string | null
  image_url: string
  created_at: string
}

export interface GarmentsResponse {
  data: Garment[]
  count: number
}

export interface TryOnJob {
  id: string
  garment_id: string
  status: "pending" | "processing" | "completed" | "failed"
  result_url: string | null
  created_at: string
}
