"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import { useStyleProfile } from "@/lib/hooks/use-profile"
import type { StyleProfile } from "@/lib/hooks/use-profile"

interface GarmentPublic {
  id: string
  title: string
  brand: string | null
  image_url: string
  created_at: string
}

interface AnalyzeStylePayload {
  image_url: string
}

export function useAnalyzeStyle() {
  const queryClient = useQueryClient()

  return useMutation<StyleProfile, Error, AnalyzeStylePayload>({
    mutationFn: (payload) =>
      api.post<StyleProfile>("/stylist/analyze", payload),
    onSuccess: (data) => {
      queryClient.setQueryData(["styleProfile"], data)
    },
  })
}

export { useStyleProfile }

export function useRecommendations(limit = 20) {
  const { data: profile } = useStyleProfile()

  return useQuery<GarmentPublic[]>({
    queryKey: ["recommendations", limit],
    queryFn: () => api.get<GarmentPublic[]>(`/recommend/?limit=${limit}`),
    enabled: !!profile,
    staleTime: 5 * 60 * 1000,
  })
}

export type { GarmentPublic, AnalyzeStylePayload }
