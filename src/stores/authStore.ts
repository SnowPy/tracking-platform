import { create } from 'zustand'
import { supabase } from '../supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import type { Profile } from '../types'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  setSession: (session: Session | null) => void
  fetchProfile: (userId: string) => Promise<void>
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  initialize: () => Promise<void>
}

let authInitialization: Promise<void> | null = null
let authListenerStarted = false

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,

  setSession: (session) => {
    set({ session, user: session?.user ?? null })
  },

  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    if (data) set({ profile: data })
  },

  signInWithPassword: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    set({ session: data.session, user: data.user })
    if (data.user) await get().fetchProfile(data.user.id)
  },

  signUp: async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
    // auto-login when email confirmation is disabled
    if (data.session) {
      set({ session: data.session, user: data.user })
      if (data.user) {
        await get().fetchProfile(data.user.id)
      }
    }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
    // 清理项目选择记录，避免下个用户看到上个人的项目状态
    localStorage.removeItem('current_project_id')
  },

  initialize: async () => {
    if (!authInitialization) {
      authInitialization = (async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession()
          if (error) throw error
          set({ session, user: session?.user ?? null })
          if (session?.user) await get().fetchProfile(session.user.id)
        } finally {
          set({ loading: false })
        }

        if (!authListenerStarted) {
          authListenerStarted = true
          supabase.auth.onAuthStateChange((event, session) => {
            set({ session, user: session?.user ?? null })

            if (event === 'TOKEN_REFRESHED') return

            if (session?.user) {
              void get().fetchProfile(session.user.id)
            } else {
              set({ profile: null })
            }
          })
        }
      })()
    }

    try {
      await authInitialization
    } catch (error) {
      authInitialization = null
      throw error
    }
  },
}))
