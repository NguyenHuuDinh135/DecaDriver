import { create } from "zustand"
import { persist } from "zustand/middleware"
import { api, configureAuth, ApiClientError } from "@/lib/api/client"

interface User {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  created_at?: string
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  setToken: (token: string) => void
  setUser: (user: User) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email: string, password: string) => {
        const formData = new FormData()
        formData.append("username", email)
        formData.append("password", password)

        const response = await api.post<{
          access_token: string
          token_type: string
        }>("/login/access-token", undefined, { formData })

        const token = response.access_token
        set({
          token,
          isAuthenticated: true,
        })

        // Sync with cookies for middleware
        const storageValue = JSON.stringify({
          state: { token, isAuthenticated: true },
          version: 0,
        })
        document.cookie = `auth-token=${token}; path=/; max-age=604800; SameSite=Lax`
        document.cookie = `auth-storage=${encodeURIComponent(storageValue)}; path=/; max-age=604800; SameSite=Lax`
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        })
        // Clear cookies
        document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
        document.cookie = "auth-storage=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT"
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true })
        const storageValue = JSON.stringify({
          state: { token, isAuthenticated: true },
          version: 0,
        })
        document.cookie = `auth-token=${token}; path=/; max-age=604800; SameSite=Lax`
        document.cookie = `auth-storage=${encodeURIComponent(storageValue)}; path=/; max-age=604800; SameSite=Lax`
      },

      setUser: (user: User) => {
        set({ user })
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

configureAuth({
  getToken: () => useAuthStore.getState().token,
  logout: () => useAuthStore.getState().logout(),
})

export type { User, AuthState, AuthActions, AuthStore }
