export type CoreZone = 'manual' | 'auto' | 'purge' | 'idle'

export interface DungeonCore {
  id: string
  dungeonId: string
  displayName: string
  stability: number         // 0–100
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
  depth: number
  startedAt: number         // Date.now()
  nodes: ActiveNode[]
  torchTimeRemaining: number
  hp: number
  stability: number
  materialsGained: Record<string, number>
}
