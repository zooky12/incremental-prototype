import type { StateCreator } from 'zustand'
import type { GameState } from '@/types/game'
import type { DungeonRun, DungeonCore, CoreZone, ActiveNode } from '@/types/dungeon'
import { getBalance, getDungeonById, getEnemyById, getResourceById } from '@/utils/configLoader'
import { clamp, rollDropTable } from '@/utils/math'

export interface DungeonSlice {
  activeRun: DungeonRun | null
  cores: DungeonCore[]
  totalRunsCompleted: number
  dungeonPrestigeLevel: number

  startRun: (dungeonId: string, depth: number) => void
  endRun: () => void
  clickNode: (nodeId: string) => { hpLost: number; materialsGained: Record<string, number>; killed: boolean }
  tickDungeon: (delta: number) => void
  assignCore: (coreId: string, zone: CoreZone) => void
  addCore: (dungeonId: string) => void
  updateNodeState: (nodeId: string, updates: Partial<ActiveNode>) => void
}

export const createDungeonSlice: StateCreator<GameState, [], [], DungeonSlice> = (set, get) => ({
  activeRun: null,
  cores: [],
  totalRunsCompleted: 0,
  dungeonPrestigeLevel: 0,

  startRun(dungeonId, depth) {
    const balance = getBalance()
    const dungeon = getDungeonById(dungeonId)
    if (!dungeon) return

    const depthData = dungeon.depths[Math.min(depth - 1, dungeon.depths.length - 1)]

    // Build initial nodes from the depth's spawn groups
    const nodes: ActiveNode[] = []
    let nodeIndex = 0
    for (const group of depthData.spawnGroups) {
      for (let i = 0; i < group.count; i++) {
        const entityDef =
          group.type === 'enemy'
            ? getEnemyById(group.entityId)
            : getResourceById(group.entityId)

        if (!entityDef) continue

        // Assign positions based on spawn zone
        const x = spawnZoneToX(group.spawnZone, nodeIndex)
        const y = 0.3 + Math.random() * 0.4

        nodes.push({
          id: `node_${nodeIndex++}`,
          entityId: group.entityId,
          type: group.type,
          x,
          y,
          hp: group.type === 'enemy' ? (getEnemyById(group.entityId)?.hp ?? 1) : 1,
          depleted: false,
          respawnAt: null,
        })
      }
    }

    set({
      activeRun: {
        dungeonId,
        depth,
        startedAt: Date.now(),
        nodes,
        torchTimeRemaining: balance.dungeon.torchDurationSeconds,
        hp: balance.dungeon.baseHp,
        stability: balance.dungeon.maxStability,
        materialsGained: {},
      },
    })
  },

  endRun() {
    const run = get().activeRun
    if (!run) return

    // Apply all materials gained to inventory
    if (Object.keys(run.materialsGained).length > 0) {
      get().addMaterials(run.materialsGained)
    }

    set(state => ({
      activeRun: null,
      totalRunsCompleted: state.totalRunsCompleted + 1,
    }))
  },

  clickNode(nodeId) {
    const run = get().activeRun
    if (!run) return { hpLost: 0, materialsGained: {}, killed: false }

    const node = run.nodes.find(n => n.id === nodeId)
    if (!node || node.depleted) return { hpLost: 0, materialsGained: {}, killed: false }

    const balance = getBalance()
    let hpLost = 0
    let materialsGained: Record<string, number> = {}
    let killed = false

    if (node.type === 'enemy') {
      const enemyDef = getEnemyById(node.entityId)
      if (!enemyDef) return { hpLost: 0, materialsGained: {}, killed: false }

      hpLost = enemyDef.hpCostToClick
      const newHp = node.hp - 1

      if (newHp <= 0) {
        // Enemy killed — roll drops
        materialsGained = rollDropTable(enemyDef.dropTable)
        killed = true
        set(state => {
          if (!state.activeRun) return state
          return {
            activeRun: {
              ...state.activeRun,
              hp: clamp(state.activeRun.hp - hpLost, 0, balance.dungeon.baseHp),
              stability: clamp(
                state.activeRun.stability + balance.dungeon.stabilityGainOnKill,
                0,
                balance.dungeon.maxStability
              ),
              nodes: state.activeRun.nodes.map(n =>
                n.id === nodeId ? { ...n, hp: 0, depleted: true } : n
              ),
              materialsGained: mergeMaterials(state.activeRun.materialsGained, materialsGained),
            },
          }
        })
      } else {
        set(state => {
          if (!state.activeRun) return state
          return {
            activeRun: {
              ...state.activeRun,
              hp: clamp(state.activeRun.hp - hpLost, 0, balance.dungeon.baseHp),
              nodes: state.activeRun.nodes.map(n =>
                n.id === nodeId ? { ...n, hp: newHp } : n
              ),
            },
          }
        })
      }
    } else {
      // Resource node
      const resourceDef = getResourceById(node.entityId)
      if (!resourceDef) return { hpLost: 0, materialsGained: {}, killed: false }

      materialsGained = { [resourceDef.resourceId]: resourceDef.yieldQuantity }
      set(state => {
        if (!state.activeRun) return state
        return {
          activeRun: {
            ...state.activeRun,
            nodes: state.activeRun.nodes.map(n =>
              n.id === nodeId
                ? { ...n, depleted: true, respawnAt: Date.now() + resourceDef.respawnSeconds * 1000 }
                : n
            ),
            materialsGained: mergeMaterials(state.activeRun.materialsGained, materialsGained),
          },
        }
      })
    }

    // End run if HP reaches 0
    if (get().activeRun && (get().activeRun!.hp - hpLost) <= 0) {
      get().endRun()
    }

    return { hpLost, materialsGained, killed }
  },

  tickDungeon(delta) {
    const run = get().activeRun
    if (!run) return

    const balance = getBalance()
    const now = Date.now()

    set(state => {
      if (!state.activeRun) return state

      const newTorch = state.activeRun.torchTimeRemaining - delta

      // Respawn depleted resource nodes
      const nodes = state.activeRun.nodes.map(n => {
        if (n.depleted && n.type === 'resource' && n.respawnAt !== null && now >= n.respawnAt) {
          return { ...n, depleted: false, respawnAt: null, hp: 1 }
        }
        return n
      })

      // Enemy stability drain
      const liveEnemies = nodes.filter(n => n.type === 'enemy' && !n.depleted)
      const enemyDrain = liveEnemies.reduce((sum, n) => {
        const def = getEnemyById(n.entityId)
        return sum + (def?.stabilityDrainPerSecond ?? 0)
      }, 0)

      const newStability = clamp(
        state.activeRun.stability - enemyDrain * delta,
        0,
        balance.dungeon.maxStability
      )

      return {
        activeRun: {
          ...state.activeRun,
          torchTimeRemaining: Math.max(0, newTorch),
          stability: newStability,
          nodes,
        },
      }
    })

    // Torch expired — end run
    if (get().activeRun && get().activeRun!.torchTimeRemaining <= 0) {
      get().endRun()
    }
  },

  assignCore(coreId, zone) {
    set(state => ({
      cores: state.cores.map(c => (c.id === coreId ? { ...c, zone } : c)),
    }))
  },

  addCore(dungeonId) {
    const dungeon = getDungeonById(dungeonId)
    if (!dungeon) return
    const id = `core_${Date.now()}`
    set(state => ({
      cores: [
        ...state.cores,
        {
          id,
          dungeonId,
          displayName: dungeon.displayName,
          stability: 100,
          zone: 'idle',
        },
      ],
    }))
  },

  updateNodeState(nodeId, updates) {
    set(state => {
      if (!state.activeRun) return state
      return {
        activeRun: {
          ...state.activeRun,
          nodes: state.activeRun.nodes.map(n => (n.id === nodeId ? { ...n, ...updates } : n)),
        },
      }
    })
  },
})

function spawnZoneToX(zone: string, index: number): number {
  const jitter = () => (Math.random() - 0.5) * 0.1
  switch (zone) {
    case 'left':   return 0.15 + jitter()
    case 'center': return 0.45 + jitter()
    case 'right':  return 0.75 + jitter()
    default:       return 0.1 + Math.random() * 0.8
  }
}

function mergeMaterials(
  a: Record<string, number>,
  b: Record<string, number>
): Record<string, number> {
  const result = { ...a }
  for (const [k, v] of Object.entries(b)) {
    result[k] = (result[k] ?? 0) + v
  }
  return result
}
