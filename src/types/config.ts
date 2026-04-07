// ============================================================
// TypeScript mirrors of all JSON schema shapes.
// These are the authoritative types — JSON files must match.
// ============================================================

export interface BalanceConfig {
  dungeon: {
    torchDurationSeconds: number
    baseHp: number
    stabilityDrainManual: number
    stabilityDrainAuto: number
    stabilityRestorePurge: number
    stabilityGainOnKill: number
    hpCostPerEnemyClick: number
    enemyStabilityDrainPerSecond: number
    screenShakeIntensity: number
    screenShakeDecay: number
    maxStability: number
  }
  crafting: {
    basePourWindowSeconds: number
    baseFailureChance: number
    apprenticeAccuracyRange: number
  }
  shop: {
    baseSellMultiplier: number
  }
}

// --- Dungeon / Entity configs ---

export type MovementType = 'static' | 'wander' | 'chase_node' | 'patrol'

export interface MovementConfig {
  type: MovementType
  speed?: number
  wanderRadius?: number
}

export interface DropEntry {
  resourceId: string
  chance: number
  quantity: number
}

export interface EnemyConfig {
  id: string
  displayName: string
  spriteAsset: string
  hp: number
  hpCostToClick: number
  stabilityDrainPerSecond: number
  movement: MovementConfig
  dropTable: DropEntry[]
}

export interface ResourceConfig {
  id: string
  displayName: string
  spriteAsset: string
  resourceId: string
  yieldQuantity: number
  respawnSeconds: number
  movement: MovementConfig
}

export type SpawnZone = 'left' | 'center' | 'right' | 'random'

export interface SpawnGroup {
  entityId: string
  type: 'enemy' | 'resource'
  count: number
  spawnZone: SpawnZone
}

export interface DungeonDepth {
  level: number
  spawnGroups: SpawnGroup[]
  maxEnemies: number
  enemySpawnIntervalSeconds: number
}

export interface DungeonConfig {
  id: string
  displayName: string
  backgroundAsset: string
  coreSlots: number
  unlockCondition: UnlockCondition | null
  depths: DungeonDepth[]
}

// --- Upgrade configs ---

export type UnlockConditionType = 'upgrade_level' | 'prestige_tier' | 'runs_completed'

export interface UnlockCondition {
  type: UnlockConditionType
  upgradeId?: string
  level?: number
  tier?: number
  count?: number
}

export type UpgradeOperation = 'add' | 'multiply' | 'set' | 'exponential'
export type CostCurveType = 'exponential' | 'linear'

export interface UpgradeEffect {
  stat: string           // dot-path into balance.json, e.g. "dungeon.torchDurationSeconds"
  operation: UpgradeOperation
  valuePerLevel: number[]
}

export interface CostCurve {
  type: CostCurveType
  base: number
  exponent?: number      // for exponential
  increment?: number     // for linear
  resource: string
}

export interface UpgradeConfig {
  id: string
  displayName: string
  description: string
  category: 'dungeon' | 'crafting' | 'shop'
  maxLevel: number
  unlockCondition: UnlockCondition | null
  effect: UpgradeEffect
  costCurve: CostCurve
}

// --- Recipe configs ---

export interface RecipeIngredient {
  itemId: string
  quantity: number
}

export interface PourWindow {
  start: number   // 0-1 fraction of timing bar
  end: number
}

export interface RecipeConfig {
  id: string
  outputId: string
  outputQuantity: number
  ingredients: RecipeIngredient[]
  pourWindow: PourWindow | null   // null = auto-processed, no mini-game
  canAutomate: boolean
  discoveredByDefault?: boolean
}

// --- Potion configs ---

export interface PotionUnlockCondition {
  type: 'upgrade_purchased' | 'recipe_crafted_count'
  upgradeId?: string
  level?: number
  recipeId?: string
  count?: number
}

export interface PotionEffect {
  type: 'heal' | 'stability_restore' | 'torch_extend' | 'yield_boost' | 'drop_rate_boost'
  value: number
  durationSeconds?: number
}

export interface PotionConfig {
  id: string
  displayName: string
  tier: number
  baseGoldValue: number
  spriteAsset: string
  description: string
  dungeonEffect: PotionEffect | null
  shopUnlockCondition: PotionUnlockCondition | null
}
