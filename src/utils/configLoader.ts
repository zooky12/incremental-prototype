// Typed loaders for all JSON config files.
// Import from here instead of importing JSON directly — provides type safety.

import type {
  BalanceConfig,
  DungeonConfig,
  EnemyConfig,
  ResourceConfig,
  UpgradeConfig,
  RecipeConfig,
  PotionConfig,
} from '@/types/config'

import balanceRaw from '@/data/balance.json'
import dungeonsRaw from '@/data/dungeons.json'
import enemiesRaw from '@/data/enemies.json'
import resourcesRaw from '@/data/resources.json'
import upgradesRaw from '@/data/upgrades.json'
import recipesRaw from '@/data/recipes.json'
import potionsRaw from '@/data/potions.json'

export const getBalance = (): BalanceConfig => balanceRaw as BalanceConfig
export const getDungeons = (): DungeonConfig[] => dungeonsRaw as DungeonConfig[]
export const getEnemies = (): EnemyConfig[] => enemiesRaw as EnemyConfig[]
export const getResources = (): ResourceConfig[] => resourcesRaw as ResourceConfig[]
export const getUpgrades = (): UpgradeConfig[] => upgradesRaw as UpgradeConfig[]
export const getRecipes = (): RecipeConfig[] => recipesRaw as RecipeConfig[]
export const getPotions = (): PotionConfig[] => potionsRaw as PotionConfig[]

// Lookup helpers

export const getDungeonById = (id: string): DungeonConfig | undefined =>
  getDungeons().find(d => d.id === id)

export const getEnemyById = (id: string): EnemyConfig | undefined =>
  getEnemies().find(e => e.id === id)

export const getResourceById = (id: string): ResourceConfig | undefined =>
  getResources().find(r => r.id === id)

export const getUpgradeById = (id: string): UpgradeConfig | undefined =>
  getUpgrades().find(u => u.id === id)

export const getRecipeById = (id: string): RecipeConfig | undefined =>
  getRecipes().find(r => r.id === id)

export const getRecipeForOutput = (outputId: string): RecipeConfig | undefined =>
  getRecipes().find(r => r.outputId === outputId)

export const getPotionById = (id: string): PotionConfig | undefined =>
  getPotions().find(p => p.id === id)
