import { create } from 'zustand'

interface AuthState {
  isAuthenticated: boolean
  user: { name: string; email: string } | null
  setUser: (user: { name: string; email: string }) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  setUser: (user) => set({ isAuthenticated: true, user }),
  logout: () => set({ isAuthenticated: false, user: null }),
}))
