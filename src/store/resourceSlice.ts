import type { StateCreator } from 'zustand'
import type { GameState } from '@/types/game'

export interface ResourceSlice {
  materials: Record<string, number>
  potions: Record<string, number>
  gold: number

  addMaterials: (gained: Record<string, number>) => void
  spendMaterials: (cost: Record<string, number>) => boolean
  addPotion: (potionId: string, quantity?: number) => void
  spendPotion: (potionId: string) => boolean
  addGold: (amount: number) => void
  spendGold: (amount: number) => boolean
  canAfford: (cost: Record<string, number>) => boolean
}

export const createResourceSlice: StateCreator<GameState, [], [], ResourceSlice> = (set, get) => ({
  materials: {},
  potions: {},
  gold: 0,

  addMaterials(gained) {
    set(state => {
      const next = { ...state.materials }
      for (const [id, qty] of Object.entries(gained)) {
        next[id] = (next[id] ?? 0) + qty
      }
      return { materials: next }
    })
  },

  spendMaterials(cost) {
    if (!get().canAfford(cost)) return false
    set(state => {
      const next = { ...state.materials }
      for (const [id, qty] of Object.entries(cost)) {
        next[id] = (next[id] ?? 0) - qty
      }
      return { materials: next }
    })
    return true
  },

  addPotion(potionId, quantity = 1) {
    set(state => ({
      potions: { ...state.potions, [potionId]: (state.potions[potionId] ?? 0) + quantity },
    }))
  },

  spendPotion(potionId) {
    const count = get().potions[potionId] ?? 0
    if (count <= 0) return false
    set(state => ({
      potions: { ...state.potions, [potionId]: state.potions[potionId] - 1 },
    }))
    return true
  },

  addGold(amount) {
    set(state => ({ gold: state.gold + amount }))
  },

  spendGold(amount) {
    if (get().gold < amount) return false
    set(state => ({ gold: state.gold - amount }))
    return true
  },

  canAfford(cost) {
    const { materials } = get()
    return Object.entries(cost).every(([id, qty]) => (materials[id] ?? 0) >= qty)
  },
})
