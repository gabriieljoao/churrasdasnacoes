import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: Profile | null
  isLoading: boolean
  isInitialized: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  initialize: () => Promise<void>
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: true,
      isInitialized: false,

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      initialize: async () => {
        if (get().isInitialized) return
        set({ isLoading: true })
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            set({ user: profile ?? null })
          }
        } finally {
          set({ isLoading: false, isInitialized: true })
        }

        // Listen for session changes
        supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' && session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()
            set({ user: profile ?? null })
          } else if (event === 'SIGNED_OUT') {
            set({ user: null })
          }
        })
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null })
      },
    }),
    {
      name: 'churrasco-auth-store',
      partialize: (state) => ({ user: state.user }),
    }
  )
)
