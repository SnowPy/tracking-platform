import { create } from 'zustand'
import type { Project } from '../types'
import { getProjects } from '../api/projects'
import { formatError } from '../utils/errors'

const STORAGE_KEY = 'current_project_id'

interface ProjectState {
  projects: Project[]
  currentProjectId: string | null
  loading: boolean
  error: string | null
  fetchProjects: () => Promise<void>
  setCurrentProject: (id: string) => void
  initialize: () => Promise<void>
  reset: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProjectId: null,
  loading: true,
  error: null,

  fetchProjects: async () => {
    try {
      const projects = await getProjects()
      set({ projects, error: null })
    } catch (error: unknown) {
      set({ projects: [], error: formatError(error) })
    }
  },

  setCurrentProject: (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    set({ currentProjectId: id })
  },

  initialize: async () => {
    set({ loading: true, error: null })
    try {
      const projects = await getProjects()
      const saved = localStorage.getItem(STORAGE_KEY)
      const currentProjectId = saved && projects.some((project) => project.id === saved)
        ? saved
        : projects[0]?.id ?? null

      if (currentProjectId) localStorage.setItem(STORAGE_KEY, currentProjectId)
      set({ projects, currentProjectId, loading: false })
    } catch (error: unknown) {
      set({ projects: [], currentProjectId: null, loading: false, error: formatError(error) })
    }
  },

  reset: () => {
    localStorage.removeItem(STORAGE_KEY)
    set({ projects: [], currentProjectId: null, loading: false, error: null })
  },
}))
