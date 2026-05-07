"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api/client"

interface StyleProfile {
  body_type: string | null
  color_tone: string | null
  height_estimate: string | null
  recommended_styles: string[]
  avoid_styles: string[]
}

interface UpdateUserPayload {
  email?: string
  full_name?: string
}

interface ChangePasswordPayload {
  current_password: string
  new_password: string
}

export function useStyleProfile() {
  return useQuery<StyleProfile>({
    queryKey: ["styleProfile"],
    queryFn: () => api.get<StyleProfile>("/stylist/profile"),
    staleTime: 10 * 60 * 1000,
    retry: false,
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateUserPayload) =>
      api.patch<{ id: string; email: string; full_name: string | null }>(
        "/users/me",
        data
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["currentUser"] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: ChangePasswordPayload) =>
      api.patch<{ message: string }>("/users/me/password", data),
  })
}

export function useDeleteAccount() {
  return useMutation({
    mutationFn: () => api.delete<void>("/users/me"),
  })
}

export type { StyleProfile, UpdateUserPayload, ChangePasswordPayload }
