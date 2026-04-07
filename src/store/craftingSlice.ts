import type { StateCreator } from 'zustand'
import type { GameState } from '@/types/game'
import type { CraftingSession, PourPattern, ApprenticeMemory } from '@/types/crafting'
import { clamp } from '@/utils/math'

export interface CraftingSlice {
  session: CraftingSession | null
  pourHistory: PourPattern[]
  apprenticePatterns: ApprenticeMemory[]

  startCraft: (recipeId: string, outputId: string) => void
  updatePourProgress: (progress: number) => void
  commitPour: (pourValue: number) => void
  cancelCraft: () => void
  saveApprenticePattern: (recipeId: string, pourValue: number) => void
}

const MAX_POUR_HISTORY = 20

export const createCraftingSlice: StateCreator<GameState, [], [], CraftingSlice> = (set, get) => ({
  session: null,
  pourHistory: [],
  apprenticePatterns: [],

  startCraft(recipeId, outputId) {
    set({
      session: {
        recipeId,
        outputId,
        pourProgress: 0,
        isPouring: false,
        startedAt: Date.now(),
      },
    })
  },

  updatePourProgress(progress) {
    set(state => {
      if (!state.session) return state
      return { session: { ...state.session, pourProgress: clamp(progress, 0, 1), isPouring: true } }
    })
  },

  commitPour(pourValue) {
    const { session } = get()
    if (!session) return

    const pattern: PourPattern = {
      recipeId: session.recipeId,
      pourValue,
      success: false, // evaluated by craftingSystem
      timestamp: Date.now(),
    }

    set(state => ({
      session: null,
      pourHistory: [pattern, ...state.pourHistory].slice(0, MAX_POUR_HISTORY),
    }))
  },

  cancelCraft() {
    set({ session: null })
  },

  saveApprenticePattern(recipeId, pourValue) {
    set(state => {
      const existing = state.apprenticePatterns.find(p => p.recipeId === recipeId)
      if (existing) {
        // Exponential moving average
        const n = Math.min(existing.sampleCount + 1, 10)
        const avg = existing.avgPourValue * ((n - 1) / n) + pourValue * (1 / n)
        return {
          apprenticePatterns: state.apprenticePatterns.map(p =>
            p.recipeId === recipeId ? { ...p, avgPourValue: avg, sampleCount: n } : p
          ),
        }
      }
      return {
        apprenticePatterns: [
          ...state.apprenticePatterns,
          { recipeId, avgPourValue: pourValue, sampleCount: 1, accuracyRange: 0.08 },
        ],
      }
    })
  },
})
