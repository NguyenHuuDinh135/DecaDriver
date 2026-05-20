"use client"

import { useMutation, useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

type FullOutfitStatus = "processing" | "completed" | "failed"
type VideoStatus = "not_requested" | "processing" | "completed" | "failed"

interface FullOutfitJob {
  job_id: string
  status: FullOutfitStatus
  stage?: string | null
  result_url: string | null
  debug_reference_url?: string | null
  debug_top_url?: string | null
  video_status?: VideoStatus
  video_url?: string | null
  error?: string | null
  video_error?: string | null
}

interface CreateFullOutfitInput {
  topImage: File
  bottomImage: File
  bodyReference: File
}

export function useCreateFullOutfitDemo() {
  return useMutation({
    mutationFn: async (input: CreateFullOutfitInput) => {
      const formData = new FormData()
      formData.append("top_image", input.topImage)
      formData.append("bottom_image", input.bottomImage)
      formData.append("body_reference", input.bodyReference)
      return api.post<FullOutfitJob>("/demo/full-outfit", undefined, { formData })
    },
  })
}

export function useFullOutfitDemoStatus(jobId: string | null) {
  return useQuery<FullOutfitJob>({
    queryKey: ["demoFullOutfit", jobId],
    queryFn: () => api.get<FullOutfitJob>(`/demo/full-outfit/${jobId}`),
    enabled: Boolean(jobId),
    refetchInterval: (query) => {
      const data = query.state.data
      if (data?.status === "processing" || data?.video_status === "processing") {
        return 3000
      }
      return false
    },
  })
}

export function useCreateFullOutfitVideo() {
  return useMutation({
    mutationFn: async (jobId: string) => {
      return api.post<Pick<FullOutfitJob, "job_id" | "video_status">>(
        `/demo/full-outfit/${jobId}/video`
      )
    },
  })
}

export type { FullOutfitJob, FullOutfitStatus, VideoStatus }
