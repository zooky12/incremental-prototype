export interface PourPattern {
  recipeId: string
  pourValue: number    // 0–1, where the player released the pour
  success: boolean
  timestamp: number
}

export interface ApprenticeMemory {
  recipeId: string
  avgPourValue: number       // average of last N successful pours
  sampleCount: number
  accuracyRange: number      // derived from balance.json + upgrades
}

export interface CraftingSession {
  recipeId: string
  outputId: string
  pourProgress: number       // 0–1, advances while held
  isPouring: boolean
  startedAt: number
}
