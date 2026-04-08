export type CoreZone = 'manual' | 'auto' | 'purge' | 'recharge'

export interface DungeonCore {
  id: string
  dungeonId: string
  displayName: string
  stability: number   // 0–100, persistent; changes only on run end
  energy: number      // 0–maxEnergy (from dungeon config)
  zone: CoreZone
}

export type NodeType = 'resource' | 'enemy'

export interface ActiveNode {
  id: string
  entityId: string
  type: NodeType
  // Normalized position (0–1), converted to pixels by NodeSpawner
  x: number
  y: number
  // Current state
  hp: number                // enemy clicks remaining; resources have 1 click
  depleted: boolean
  respawnAt: number | null  // Date.now() timestamp, null if not respawning
}

export interface DungeonRun {
  dungeonId: string
  coreId: string             // links run to its core for endRun stability/energy updates
  depth: number
  startedAt: number          // Date.now()
  nodes: ActiveNode[]
  torchTimeRemaining: number
  hp: number
  maxHp: number              // resolved from attribute system at run start
  materialsGained: Record<string, number>
  spawnTimers: Record<string, number>  // entityId → Date.now() timestamp of next spawn
}
