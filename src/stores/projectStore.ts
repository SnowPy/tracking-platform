import { create } from 'zustand'
import type { Project } from '../types'
import { getProjects } from '../api/projects'

const STORAGE_KEY = 'current_project_id'

interface ProjectState {
  projects: Project[]
  currentProjectId: string | null
  loading: boolean
  fetchProjects: () => Promise<void>
  setCurrentProject: (id: string) => void
  initialize: () => Promise<void>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  currentProjectId: null,
  loading: true,

  fetchProjects: async () => {
    try {
      const projects = await getProjects()
      set({ projects })
    } catch (err) {
      console.error('加载项目列表失败:', err)
    }
  },

  setCurrentProject: (id: string) => {
    localStorage.setItem(STORAGE_KEY, id)
    set({ currentProjectId: id })
  },

  initialize: async () => {
    await get().fetchProjects()
    const { projects } = get()

    if (projects.length === 0) {
      set({ loading: false })
      return
    }

    // 从 localStorage 恢复上次选中的项目
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && projects.some((p) => p.id === saved)) {
      set({ currentProjectId: saved })
    } else {
      // 默认选第一个
      set({ currentProjectId: projects[0].id })
    }

    set({ loading: false })
  },
}))
