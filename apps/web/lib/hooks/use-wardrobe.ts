"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

interface TryOnJob {
  id: string
  garment_id: string
  status: "pending" | "processing" | "completed" | "failed"
  result_url: string | null
  created_at: string
}

export function useTryOnHistory() {
  return useQuery<TryOnJob[]>({
    queryKey: ["tryOnHistory"],
    queryFn: () => api.get<TryOnJob[]>("/tryon/"),
    staleTime: 2 * 60 * 1000,
  })
}

export function useTryOnDetail(id: string) {
  return useQuery<TryOnJob>({
    queryKey: ["tryOnDetail", id],
    queryFn: () => api.get<TryOnJob>(`/tryon/${id}`),
    enabled: !!id,
  })
}

export function useCompletedTryOns() {
  const query = useTryOnHistory()
  const completed = query.data?.filter((job) => job.status === "completed") ?? []
  return { ...query, data: completed }
}

export function useDeleteLook() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => api.delete<void>(`/tryon/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tryOnHistory"] })
    },
  })
}

export type { TryOnJob }
