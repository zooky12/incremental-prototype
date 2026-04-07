import type { StateCreator } from 'zustand'
import type { GameState } from '@/types/game'

export interface AttributeSlice {
  attributeOverrides: Record<string, number>
  runBuffs: Record<string, number>
  unlockedZones: string[]

  setAttributeOverride: (id: string, value: number | null) => void
  setRunBuff: (id: string, multiplier: number) => void
  clearRunBuffs: () => void
  setZoneUnlocked: (zone: string, unlocked: boolean) => void
}

export const createAttributeSlice: StateCreator<GameState, [], [], AttributeSlice> = (set) => ({
  attributeOverrides: {},
  runBuffs: {},
  unlockedZones: ['idle', 'manual'],

  setAttributeOverride(id, value) {
    set(state => {
      const next = { ...state.attributeOverrides }
      if (value === null) {
        delete next[id]
      } else {
        next[id] = value
      }
      return { attributeOverrides: next }
    })
  },

  setRunBuff(id, multiplier) {
    set(state => ({ runBuffs: { ...state.runBuffs, [id]: multiplier } }))
  },

  clearRunBuffs() {
    set({ runBuffs: {} })
  },

  setZoneUnlocked(zone, unlocked) {
    set(state => {
      const zones = new Set(state.unlockedZones)
      if (unlocked) {
        zones.add(zone)
      } else {
        zones.delete(zone)
      }
      return { unlockedZones: Array.from(zones) }
    })
  },
})
