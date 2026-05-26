import { create } from "zustand"
import type { StudySet } from "../data/mockData"
import { defaultCategoryList } from "../data/mockData"
import { apiCall } from "../lib/api"

interface DeletedStudySet {
  set: StudySet
  deletedAt: number
}

let syncTimer: ReturnType<typeof setTimeout> | null = null

function scheduleSync(studySets: StudySet[]) {
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(async () => {
    try {
      await apiCall("/studysets", {
        method: "PUT",
        body: JSON.stringify({ studySets }),
      })
    } catch { /* silent */ }
  }, 300)
}

async function fetchStudySets(): Promise<StudySet[]> {
  try {
    const data = await apiCall<{ success: boolean; studySets: StudySet[] }>("/studysets")
    return data.success ? data.studySets : []
  } catch {
    return []
  }
}

interface AppState {
  studySets: StudySet[]
  deletedStudySets: DeletedStudySet[]
  searchQuery: string
  selectedCategory: string
  categories: string[]
  currentUserId: string | null
  isSyncing: boolean
  loadUserStudySets: (userId: string) => Promise<void>
  clearUserStudySets: () => void
  setSearchQuery: (query: string) => void
  setSelectedCategory: (category: string) => void
  addStudySet: (set: StudySet) => void
  updateStudySet: (id: string, updates: Partial<StudySet>) => void
  deleteStudySet: (id: string) => void
  softDeleteStudySet: (id: string) => void
  undoDeleteStudySet: (id: string) => void
  addCategory: (name: string) => void
  deleteCategory: (name: string) => void
  getFilteredSets: () => StudySet[]
}

export const useStore = create<AppState>((set, get) => ({
  studySets: [],
  deletedStudySets: [],
  searchQuery: "",
  selectedCategory: "全部",
  categories: defaultCategoryList,
  currentUserId: null,
  isSyncing: false,

  loadUserStudySets: async (userId: string) => {
    set({ isSyncing: true })
    const sets = await fetchStudySets()
    set({ studySets: sets, currentUserId: userId, deletedStudySets: [], isSyncing: false })
  },

  clearUserStudySets: () => {
    set({ studySets: [], currentUserId: null, deletedStudySets: [], selectedCategory: "全部", searchQuery: "" })
  },

  setSearchQuery: (query: string) => set({ searchQuery: query }),

  setSelectedCategory: (category: string) => set({ selectedCategory: category }),

  addStudySet: (setItem: StudySet) => {
    const updated = [setItem, ...get().studySets]
    set({ studySets: updated })
    scheduleSync(updated)
  },

  updateStudySet: (id: string, updates: Partial<StudySet>) => {
    const state = get()
    const index = state.studySets.findIndex((s) => s.id === id)
    if (index === -1) return
    const updated = [...state.studySets]
    updated[index] = { ...updated[index], ...updates }
    set({ studySets: updated })
    scheduleSync(updated)
  },

  deleteStudySet: (id: string) => {
    const updated = get().studySets.filter((s) => s.id !== id)
    set({ studySets: updated })
    scheduleSync(updated)
  },

  softDeleteStudySet: (id: string) => {
    const state = get()
    const target = state.studySets.find((s) => s.id === id)
    if (!target) return
    const updated = state.studySets.filter((st) => st.id !== id)
    set((s) => ({
      studySets: updated,
      deletedStudySets: [...s.deletedStudySets, { set: target, deletedAt: Date.now() }],
    }))
    scheduleSync(updated)
    setTimeout(() => {
      const current = get()
      const stillDeleted = current.deletedStudySets.find((d) => d.set.id === id)
      if (stillDeleted) {
        set((s) => ({
          deletedStudySets: s.deletedStudySets.filter((d) => d.set.id !== id),
        }))
      }
    }, 30000)
  },

  undoDeleteStudySet: (id: string) => {
    const state = get()
    const deleted = state.deletedStudySets.find((d) => d.set.id === id)
    if (!deleted) return
    const restored = [deleted.set, ...state.studySets]
    set((s) => ({
      deletedStudySets: s.deletedStudySets.filter((d) => d.set.id !== id),
      studySets: restored,
    }))
    scheduleSync(restored)
  },

  addCategory: (name: string) =>
    set((state) => ({
      categories: state.categories.includes(name)
        ? state.categories
        : [...state.categories, name],
    })),

  deleteCategory: (name: string) =>
    set((state) => ({
      categories: state.categories.filter((c) => c !== name),
    })),

  getFilteredSets: () => {
    const state = get()
    let filtered = state.studySets

    if (state.selectedCategory !== "全部") {
      filtered = filtered.filter((s) => s.category === state.selectedCategory)
    }

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.cards.some((c) => c.term.toLowerCase().includes(q) || c.definition.toLowerCase().includes(q))
      )
    }

    return filtered
  },
}))
