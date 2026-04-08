import type { StateCreator } from 'zustand'
import type { GameState } from '@/types/game'
import type { DungeonRun, DungeonCore, CoreZone, ActiveNode } from '@/types/dungeon'
import { getBalance, getDungeonById, getEnemyById, getResourceById } from '@/utils/configLoader'
import { clamp, rollDropTable, applyMultiplierToYield } from '@/utils/math'

export interface DungeonSlice {
  activeRun: DungeonRun | null
  cores: DungeonCore[]
  totalRunsCompleted: number
  dungeonPrestigeLevel: number

  startRun: (dungeonId: string, depth: number, maxHp: number, torchDuration: number) => void
  endRun: () => void
  clickNode: (nodeId: string, clickDamage: number, armor: number) => { hpLost: number; materialsGained: Record<string, number>; killed: boolean }
  destroyNode: (nodeId: string) => void
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

  startRun(dungeonId, depth, maxHp, torchDuration) {
    const dungeon = getDungeonById(dungeonId)
    if (!dungeon) return

    const state = get()
    const core = state.cores.find(c => c.zone === 'manual' && c.dungeonId === dungeonId)
    if (!core) return
    if (core.stability <= 0) return
    if (core.energy < dungeon.energyPerRun) return

    const depthData = dungeon.depths[Math.min(depth - 1, dungeon.depths.length - 1)]

    const nodes: ActiveNode[] = []
    let nodeIndex = 0
    for (const group of depthData.spawnGroups) {
      for (let i = 0; i < group.count; i++) {
        const entityDef =
          group.type === 'enemy'
            ? getEnemyById(group.entityId)
            : getResourceById(group.entityId)

        if (!entityDef) continue

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
        coreId: core.id,
        depth,
        startedAt: Date.now(),
        nodes,
        torchTimeRemaining: torchDuration,
        hp: maxHp,
        maxHp,
        materialsGained: {},
        nextEnemySpawnAt: Date.now() + (depthData.enemySpawnIntervalSeconds ?? 15) * 1000,
      },
    })
  },

  endRun() {
    const run = get().activeRun
    if (!run) return

    if (Object.keys(run.materialsGained).length > 0) {
      get().addMaterials(run.materialsGained)
    }

    const dungeon = getDungeonById(run.dungeonId)
    const energyCost = dungeon?.energyPerRun ?? 0
    const balance = getBalance()
    const liveEnemies = run.nodes.filter(n => n.type === 'enemy' && !n.depleted).length
    const stabilityDelta = liveEnemies > 0
      ? -balance.dungeon.stabilityLossPerRun
      :  balance.dungeon.stabilityGainPerRun

    set(state => ({
      activeRun: null,
      totalRunsCompleted: state.totalRunsCompleted + 1,
      cores: state.cores.map(c =>
        c.id === run.coreId
          ? {
              ...c,
              stability: clamp(c.stability + stabilityDelta, 0, 100),
              energy:    clamp(c.energy - energyCost, 0, dungeon?.maxEnergy ?? 100),
            }
          : c
      ),
    }))
  },

  clickNode(nodeId, clickDamage, armor) {
    const run = get().activeRun
    if (!run) return { hpLost: 0, materialsGained: {}, killed: false }

    const node = run.nodes.find(n => n.id === nodeId)
    if (!node || node.depleted) return { hpLost: 0, materialsGained: {}, killed: false }

    const balance = getBalance()
    const core = get().cores.find(c => c.id === run.coreId)
    const stabilityRatio = (core?.stability ?? 100) / 100

    let hpLost = 0
    let materialsGained: Record<string, number> = {}
    let killed = false

    if (node.type === 'enemy') {
      const enemyDef = getEnemyById(node.entityId)
      if (!enemyDef) return { hpLost: 0, materialsGained: {}, killed: false }

      hpLost = Math.max(0, enemyDef.hpCostToClick - armor)
      const newHp = node.hp - clickDamage

      if (newHp <= 0) {
        const enemyMult = 1 + balance.dungeon.enemyStabilityEffect * (1 - stabilityRatio)
        materialsGained = rollDropTable(enemyDef.dropTable, enemyMult)
        killed = true
        set(state => {
          if (!state.activeRun) return state
          return {
            activeRun: {
              ...state.activeRun,
              hp: clamp(state.activeRun.hp - hpLost, 0, state.activeRun.maxHp),
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
              hp: clamp(state.activeRun.hp - hpLost, 0, state.activeRun.maxHp),
              nodes: state.activeRun.nodes.map(n =>
                n.id === nodeId ? { ...n, hp: newHp } : n
              ),
            },
          }
        })
      }
    } else {
      const resourceDef = getResourceById(node.entityId)
      if (!resourceDef) return { hpLost: 0, materialsGained: {}, killed: false }

      const resourceMult = 1 + balance.dungeon.resourceStabilityEffect * (1 - stabilityRatio)
      const yieldAmt = applyMultiplierToYield(resourceDef.yieldQuantity, resourceMult)
      materialsGained = { [resourceDef.resourceId]: yieldAmt }

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
    if (get().activeRun && get().activeRun!.hp <= 0) {
      get().endRun()
    }

    return { hpLost, materialsGained, killed }
  },

  destroyNode(nodeId) {
    const run = get().activeRun
    if (!run) return
    const node = run.nodes.find(n => n.id === nodeId)
    if (!node || node.depleted) return

    set(state => {
      if (!state.activeRun) return state
      const resourceDef = node.type === 'resource' ? getResourceById(node.entityId) : null
      return {
        activeRun: {
          ...state.activeRun,
          nodes: state.activeRun.nodes.map(n =>
            n.id === nodeId
              ? {
                  ...n,
                  depleted: true,
                  respawnAt: resourceDef
                    ? Date.now() + resourceDef.respawnSeconds * 1000
                    : null,
                }
              : n
          ),
        },
      }
    })
  },

  tickDungeon(delta) {
    const balance = getBalance()

    // Recharge cores in the recharge zone — runs regardless of active run
    set(state => {
      let changed = false
      const cores = state.cores.map(c => {
        if (c.zone !== 'recharge') return c
        const dungeon = getDungeonById(c.dungeonId)
        const max = dungeon?.maxEnergy ?? 100
        if (c.energy >= max) return c
        const newEnergy = Math.min(c.energy + balance.dungeon.energyRechargeRate * delta, max)
        changed = true
        return { ...c, energy: newEnergy }
      })
      return changed ? { cores } : state
    })

    const run = get().activeRun
    if (!run) return

    const dungeon = getDungeonById(run.dungeonId)
    const depthData = dungeon?.depths[Math.min(run.depth - 1, (dungeon?.depths.length ?? 1) - 1)]
    const now = Date.now()

    set(state => {
      if (!state.activeRun) return state

      const newTorch = state.activeRun.torchTimeRemaining - delta

      // Respawn depleted resource nodes
      let nodes = state.activeRun.nodes.map(n => {
        if (n.depleted && n.type === 'resource' && n.respawnAt !== null && now >= n.respawnAt) {
          return { ...n, depleted: false, respawnAt: null, hp: 1 }
        }
        return n
      })

      // Continuous enemy spawning
      let nextEnemySpawnAt = state.activeRun.nextEnemySpawnAt
      if (depthData && nextEnemySpawnAt && now >= nextEnemySpawnAt) {
        const maxEnemies = depthData.maxEnemies ?? 4
        const intervalSec = depthData.enemySpawnIntervalSeconds ?? 15
        const liveCount = nodes.filter(n => n.type === 'enemy' && !n.depleted).length

        if (liveCount < maxEnemies) {
          const enemyGroups = depthData.spawnGroups.filter(g => g.type === 'enemy')
          if (enemyGroups.length > 0) {
            const group = enemyGroups[Math.floor(Math.random() * enemyGroups.length)]
            const newNode: ActiveNode = {
              id: `node_spawn_${now}_${Math.random().toString(36).slice(2)}`,
              entityId: group.entityId,
              type: 'enemy',
              x: 0.05 + Math.random() * 0.9,
              y: 0.15 + Math.random() * 0.6,
              hp: getEnemyById(group.entityId)?.hp ?? 1,
              depleted: false,
              respawnAt: null,
            }
            nodes = [...nodes, newNode]
          }
        }
        nextEnemySpawnAt = now + intervalSec * 1000
      }

      return {
        activeRun: {
          ...state.activeRun,
          torchTimeRemaining: Math.max(0, newTorch),
          nodes,
          nextEnemySpawnAt,
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
          energy: dungeon.maxEnergy,
          zone: 'recharge',
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
