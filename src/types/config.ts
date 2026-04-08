// ============================================================
// TypeScript mirrors of all JSON schema shapes.
// These are the authoritative types — JSON files must match.
// ============================================================

export interface BalanceConfig {
  dungeon: {
    torchDurationSeconds: number
    baseHp: number
    stabilityLossPerRun: number        // stability lost when exiting with live enemies
    resourceStabilityEffect: number    // slope for resource yield multiplier (negative = less at low stability)
    enemyStabilityEffect: number       // slope for enemy drop multiplier (positive = more at low stability)
    energyRechargeRate: number         // energy per second while in recharge zone (base)
    autoEnergyDrainRate: number        // energy drained per second in auto zone (base)
    autoStabilityDrainRate: number     // stability drained per second in auto zone (base)
    purgeStabilityGainRate: number     // stability gained per second in purge zone (base)
    purgeEnergyDrainRate: number       // energy drained per second in purge zone (base)
    brokenRechargeSlowdown: number     // recharge rate divisor when stability = 0
    brokenRecoverStability: number     // stability restored when a broken core finishes recharging
    hpCostPerEnemyClick: number
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
  wanderRadius?: number   // kept for back-compat; not used by MovementController
  idleTime?: number       // seconds to idle after arriving (wander) or losing target (chase_node)
  patrolTurnRate?: number // amplitude of sinusoidal heading change for patrol
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
  spawnIntervalSeconds: number   // average seconds between spawns of this enemy type
  stabilityRecoverOnKill: number // stability points restored to the core when this enemy is killed
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
  spawnIntervalSeconds: number   // average seconds between spawns of this resource type in a run
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
  // count in each SpawnGroup is the maximum alive at once; spawn timing is per-entity
}

export interface DungeonConfig {
  id: string
  displayName: string
  backgroundAsset: string
  coreSlots: number
  maxEnergy: number
  energyPerRun: number
  unlockCondition: UnlockCondition | null
  spawnRateMultiplier: number          // scales all entity spawn intervals (higher = faster spawns)
  rechargeRateMultiplier: number       // scales base energyRechargeRate for this dungeon's cores
  autoEnergyDrainMultiplier: number    // scales base autoEnergyDrainRate
  autoStabilityDrainMultiplier: number // scales base autoStabilityDrainRate
  purgeStabilityGainMultiplier: number // scales base purgeStabilityGainRate
  purgeEnergyDrainMultiplier: number   // scales base purgeEnergyDrainRate
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
