"use client"

import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore, type User } from "@/lib/stores/auth"
import { api } from "@/lib/api/client"

export function useAuth() {
  const router = useRouter()
  const { user, isAuthenticated, login, logout, setUser } = useAuthStore()

  const handleLogin = async (email: string, password: string) => {
    await login(email, password)
    router.push("/feed")
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return {
    user,
    isAuthenticated,
    login: handleLogin,
    logout: handleLogout,
    setUser,
  }
}

export function useCurrentUser() {
  const { isAuthenticated, setUser } = useAuthStore()

  return useQuery<User>({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const user = await api.get<User>("/users/me")
      setUser(user)
      return user
    },
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1000,
  })
}
