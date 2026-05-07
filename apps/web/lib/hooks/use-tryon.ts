"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import type { Garment, GarmentsResponse, TryOnJob } from "@/lib/types/garment"

export function useGarments(page = 0, limit = 20) {
  return useQuery<GarmentsResponse>({
    queryKey: ["garments", page, limit],
    queryFn: () =>
      api.get<GarmentsResponse>(
        `/garments/?skip=${page * limit}&limit=${limit}`
      ),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateTryOn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (garmentId: string) => {
      return api.post<TryOnJob>(`/tryon/?garment_id=${garmentId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tryOnHistory"] })
    },
  })
}

export function useTryOnResult(jobId: string | null) {
  return useQuery<TryOnJob>({
    queryKey: ["tryOnResult", jobId],
    queryFn: () => api.get<TryOnJob>(`/tryon/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "pending" || status === "processing") {
        return 3000
      }
      return false
    },
  })
}

export function useTryOnHistory() {
  return useQuery<TryOnJob[]>({
    queryKey: ["tryOnHistory"],
    queryFn: () => api.get<TryOnJob[]>("/tryon/"),
    staleTime: 2 * 60 * 1000,
  })
}

export type { Garment, GarmentsResponse, TryOnJob }
