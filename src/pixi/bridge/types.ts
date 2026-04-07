import type { NodeType } from '@/types/dungeon'

// Events emitted FROM PixiJS → consumed by React hooks
export interface PixiToReactEvents {
  'node-clicked': {
    nodeId: string
    nodeType: NodeType
    x: number
    y: number
  }
  'run-end': undefined
}

// Commands sent FROM React → consumed by PixiJS scene methods
// (These are called as direct method calls on DungeonScene, not events)
// Kept here for documentation purposes
export type ReactToPixiCommands = {
  setHp: (hp: number) => void
  setStability: (stability: number) => void
  triggerScreenShake: (intensity?: number) => void
  despawnNode: (nodeId: string) => void
  respawnNode: (nodeId: string) => void
}
