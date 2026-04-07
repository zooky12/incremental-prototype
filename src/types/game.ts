import type { DungeonRun, DungeonCore } from './dungeon'
import type { CraftingSession, PourPattern, ApprenticeMemory } from './crafting'

// Combined game state — assembled from all store slices
export interface GameState {
  // Resources
  materials: Record<string, number>
  potions: Record<string, number>
  gold: number

  // Dungeon
  activeRun: DungeonRun | null
  cores: DungeonCore[]
  totalRunsCompleted: number
  dungeonPrestigeLevel: number

  // Crafting
  session: CraftingSession | null
  pourHistory: PourPattern[]
  apprenticePatterns: ApprenticeMemory[]

  // Shop / progression
  purchasedUpgrades: Record<string, number>  // upgradeId -> level purchased
  discoveredRecipes: string[]                // recipeIds player has unlocked
  reputation: number
  gamePrestigeLevel: number
}
