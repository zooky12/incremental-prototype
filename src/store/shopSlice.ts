import type { StateCreator } from 'zustand'
import type { GameState } from '@/types/game'

export interface ShopSlice {
  purchasedUpgrades: Record<string, number>
  discoveredRecipes: string[]
  reputation: number
  gamePrestigeLevel: number

  purchaseUpgrade: (upgradeId: string) => boolean
  discoverRecipe: (recipeId: string) => void
  addReputation: (amount: number) => void
}

export const createShopSlice: StateCreator<GameState, [], [], ShopSlice> = (set, get) => ({
  purchasedUpgrades: {},
  discoveredRecipes: [],
  reputation: 0,
  gamePrestigeLevel: 0,

  purchaseUpgrade(upgradeId) {
    // Cost calculation and validation is done by upgradeSystem.ts
    // This slice just records the purchase
    set(state => ({
      purchasedUpgrades: {
        ...state.purchasedUpgrades,
        [upgradeId]: (state.purchasedUpgrades[upgradeId] ?? 0) + 1,
      },
    }))
    return true
  },

  discoverRecipe(recipeId) {
    if (get().discoveredRecipes.includes(recipeId)) return
    set(state => ({ discoveredRecipes: [...state.discoveredRecipes, recipeId] }))
  },

  addReputation(amount) {
    set(state => ({ reputation: state.reputation + amount }))
  },
})
