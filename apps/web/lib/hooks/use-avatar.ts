"use client"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

type AvatarJobStatus = "pending" | "processing" | "completed" | "failed"

interface AvatarJob {
  id: string
  status: AvatarJobStatus
  lora_s3_key: string | null
  reference_image_url: string | null
  created_at: string
}

export function useUploadAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (images: File[]) => {
      const formData = new FormData()
      for (const image of images) {
        formData.append("images", image)
      }
      return api.post<AvatarJob>("/avatar/train", undefined, { formData })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["avatarStatus"] })
    },
  })
}

export function useAvatarStatus() {
  return useQuery<AvatarJob>({
    queryKey: ["avatarStatus"],
    queryFn: () => api.get<AvatarJob>("/avatar/status"),
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (status === "pending" || status === "processing") {
        return 5000
      }
      return false
    },
    retry: 1,
  })
}

export function useHasAvatar(): boolean {
  const { data } = useAvatarStatus()
  return data?.status === "completed"
}

export type { AvatarJob, AvatarJobStatus }
