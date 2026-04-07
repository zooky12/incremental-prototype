import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GameState } from '@/types/game'
import { createResourceSlice } from './resourceSlice'
import { createDungeonSlice } from './dungeonSlice'
import { createCraftingSlice } from './craftingSlice'
import { createShopSlice } from './shopSlice'
import { createAttributeSlice } from './attributeSlice'
import { persistConfig } from './persistConfig'
import { getRecipes } from '@/utils/configLoader'

// Single composed store — import only this in components and hooks
export const useGameStore = create<GameState>()(
  persist(
    (...args) => {
      const [set, get, api] = args

      const baseState = {
        ...createResourceSlice(...args),
        ...createDungeonSlice(...args),
        ...createCraftingSlice(...args),
        ...createShopSlice(...args),
        ...createAttributeSlice(...args),
      }

      // Initialize discoveredRecipes from JSON on first load
      const defaultDiscovered = getRecipes()
        .filter(r => r.discoveredByDefault)
        .map(r => r.id)

      return {
        ...baseState,
        discoveredRecipes:
          baseState.discoveredRecipes.length > 0
            ? baseState.discoveredRecipes
            : defaultDiscovered,
      }
    },
    persistConfig
  )
)

// Convenience selectors — avoids re-renders when unrelated state changes
export const useGold = () => useGameStore(s => s.gold)
export const useMaterials = () => useGameStore(s => s.materials)
export const usePotions = () => useGameStore(s => s.potions)
export const useActiveRun = () => useGameStore(s => s.activeRun)
export const useCores = () => useGameStore(s => s.cores)
export const useCraftingSession = () => useGameStore(s => s.session)
export const usePurchasedUpgrades = () => useGameStore(s => s.purchasedUpgrades)
export const useDiscoveredRecipes = () => useGameStore(s => s.discoveredRecipes)
export const useUnlockedZones = () => useGameStore(s => s.unlockedZones)
export const useAttributeOverrides = () => useGameStore(s => s.attributeOverrides)
