"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"
import type { VideoTryOnJob } from "@/lib/types/garment"

export function useCreateVideoTryOn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (tryonJobId: string) => {
      return api.post<VideoTryOnJob>(`/video-tryon/?tryon_job_id=${tryonJobId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["videoTryOnResult"] })
    },
  })
}

export function useVideoTryOnResult(jobId: string | null) {
  return useQuery<VideoTryOnJob>({
    queryKey: ["videoTryOnResult", jobId],
    queryFn: () => api.get<VideoTryOnJob>(`/video-tryon/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "pending" || status === "processing") {
        return 5000
      }
      return false
    },
  })
}
