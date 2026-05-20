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
      user: {
        id: "mock-user-1",
        email: "demo@decadriver.com",
        full_name: "Demo User",
        is_active: true,
      },
      token: "mock-token-123",
      isAuthenticated: true,

      login: async (email: string, password: string) => {
        // Mock login - do nothing
      },

      logout: () => {
        // Mock logout - keep authenticated
        set({
          user: {
            id: "mock-user-1",
            email: "demo@decadriver.com",
            full_name: "Demo User",
            is_active: true,
          },
          token: "mock-token-123",
          isAuthenticated: true,
        })
      },

      setToken: (token: string) => {
        set({ token, isAuthenticated: true })
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
