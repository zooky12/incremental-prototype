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

    // Initialise per-entity spawn timers, staggered evenly across the first spawn interval
    // so entities don't all burst at once on entry
    const spawnTimers: Record<string, number> = {}
    const totalGroups = depthData.spawnGroups.length
    depthData.spawnGroups.forEach((group, i) => {
      const entity = group.type === 'enemy'
        ? getEnemyById(group.entityId)
        : getResourceById(group.entityId)
      if (!entity) return
      const intervalMs = (entity.spawnIntervalSeconds / dungeon.spawnRateMultiplier) * 1000
      // Stagger: spread across the first interval, minimum 1 s delay
      const staggerMs = 1000 + (i / totalGroups) * intervalMs
      spawnTimers[group.entityId] = Date.now() + staggerMs
    })

    set({
      activeRun: {
        dungeonId,
        coreId: core.id,
        depth,
        startedAt: Date.now(),
        nodes: [],          // starts empty — nodes spawn over time
        torchTimeRemaining: torchDuration,
        hp: maxHp,
        maxHp,
        materialsGained: {},
        spawnTimers,
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

    // Stability loss only when exiting with live enemies — no gain for clean exits;
    // stability is now recovered by killing enemies
    const liveEnemies = run.nodes.filter(n => n.type === 'enemy' && !n.depleted).length
    const stabilityDelta = liveEnemies > 0 ? -balance.dungeon.stabilityLossPerRun : 0

    set(state => {
      const updatedCores = state.cores.map(c => {
        if (c.id !== run.coreId) return c
        const maxEnergy = dungeon?.maxEnergy ?? 100
        const newStability = clamp(c.stability + stabilityDelta, 0, 100)
        const newEnergy = clamp(c.energy - energyCost, 0, maxEnergy)
        // If stability just hit 0, zero out energy too
        const finalEnergy = newStability <= 0 ? 0 : newEnergy
        return { ...c, stability: newStability, energy: finalEnergy }
      })
      return {
        activeRun: null,
        totalRunsCompleted: state.totalRunsCompleted + 1,
        cores: updatedCores,
      }
    })
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

        // Restore stability to the core when an enemy is killed
        const stabilityRecover = enemyDef.stabilityRecoverOnKill
        set(state => {
          if (!state.activeRun) return state
          const dungeon = getDungeonById(run.dungeonId)
          const maxEnergy = dungeon?.maxEnergy ?? 100
          return {
            activeRun: {
              ...state.activeRun,
              hp: clamp(state.activeRun.hp - hpLost, 0, state.activeRun.maxHp),
              nodes: state.activeRun.nodes.map(n =>
                n.id === nodeId ? { ...n, hp: 0, depleted: true } : n
              ),
              materialsGained: mergeMaterials(state.activeRun.materialsGained, materialsGained),
            },
            cores: state.cores.map(c =>
              c.id === run.coreId
                ? { ...c, stability: clamp(c.stability + stabilityRecover, 0, 100), energy: Math.min(c.energy, maxEnergy) }
                : c
            ),
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
    const now = Date.now()

    // ── Process all cores by zone ──────────────────────────────────────────────
    const autoMaterials: Record<string, number> = {}

    set(state => {
      let coresChanged = false
      const cores = state.cores.map(c => {
        const dungeon = getDungeonById(c.dungeonId)
        if (!dungeon) return c
        const maxEnergy = dungeon.maxEnergy

        if (c.zone === 'recharge') {
          if (c.energy >= maxEnergy) return c

          const isBroken = c.stability <= 0
          const baseRate = balance.dungeon.energyRechargeRate * dungeon.rechargeRateMultiplier
          const rate = isBroken
            ? baseRate / balance.dungeon.brokenRechargeSlowdown
            : baseRate

          const newEnergy = Math.min(c.energy + rate * delta, maxEnergy)

          // Broken core just finished its slow charge: restore minimal stability, zero energy
          if (isBroken && newEnergy >= maxEnergy) {
            coresChanged = true
            return {
              ...c,
              energy: 0,
              stability: balance.dungeon.brokenRecoverStability,
            }
          }

          if (newEnergy !== c.energy) {
            coresChanged = true
            return { ...c, energy: newEnergy }
          }
          return c
        }

        if (c.zone === 'auto') {
          if (c.energy <= 0) return c   // exhausted — no output, no further drain

          const energyDrain    = balance.dungeon.autoEnergyDrainRate    * dungeon.autoEnergyDrainMultiplier    * delta
          const stabilityDrain = balance.dungeon.autoStabilityDrainRate * dungeon.autoStabilityDrainMultiplier * delta
          const stabilityRatio = c.stability / 100

          let newEnergy    = clamp(c.energy    - energyDrain,    0, maxEnergy)
          let newStability = clamp(c.stability - stabilityDrain, 0, 100)

          // Stability hitting 0 kills energy too
          if (newStability <= 0) newEnergy = 0

          // Generate resources from the dungeon's depth spawnGroups
          const depthData = dungeon.depths[0]   // auto always uses depth 1 for now
          const resourceMult = 1 + balance.dungeon.resourceStabilityEffect * (1 - stabilityRatio)
          const enemyMult    = 1 + balance.dungeon.enemyStabilityEffect    * (1 - stabilityRatio)

          for (const group of depthData.spawnGroups) {
            if (group.type === 'resource') {
              const resDef = getResourceById(group.entityId)
              if (!resDef) continue
              // Rate: group.count nodes, each spawns every spawnIntervalSeconds, yields yieldQuantity
              const ratePerSec = (group.count * resDef.yieldQuantity) / resDef.spawnIntervalSeconds * dungeon.spawnRateMultiplier
              const expected = ratePerSec * resourceMult * delta
              const amount = Math.floor(expected) + (Math.random() < (expected % 1) ? 1 : 0)
              if (amount > 0) {
                autoMaterials[resDef.resourceId] = (autoMaterials[resDef.resourceId] ?? 0) + amount
              }
            } else {
              const enemyDef = getEnemyById(group.entityId)
              if (!enemyDef) continue
              const killRatePerSec = group.count / enemyDef.spawnIntervalSeconds * dungeon.spawnRateMultiplier
              for (const entry of enemyDef.dropTable) {
                const ratePerSec = killRatePerSec * entry.chance * entry.quantity * enemyMult
                const expected = ratePerSec * delta
                const amount = Math.floor(expected) + (Math.random() < (expected % 1) ? 1 : 0)
                if (amount > 0) {
                  autoMaterials[entry.resourceId] = (autoMaterials[entry.resourceId] ?? 0) + amount
                }
              }
            }
          }

          coresChanged = true
          return { ...c, energy: newEnergy, stability: newStability }
        }

        if (c.zone === 'purge') {
          if (c.energy <= 0) return c   // no energy → purge stops

          const energyDrain   = balance.dungeon.purgeEnergyDrainRate    * dungeon.purgeEnergyDrainMultiplier    * delta
          const stabilityGain = balance.dungeon.purgeStabilityGainRate  * dungeon.purgeStabilityGainMultiplier  * delta

          const newEnergy    = clamp(c.energy    - energyDrain,    0, maxEnergy)
          const newStability = clamp(c.stability + stabilityGain,  0, 100)

          if (newEnergy !== c.energy || newStability !== c.stability) {
            coresChanged = true
            return { ...c, energy: newEnergy, stability: newStability }
          }
          return c
        }

        return c
      })

      return coresChanged ? { cores } : state
    })

    // Flush auto-zone material gains into the player inventory
    if (Object.keys(autoMaterials).length > 0) {
      get().addMaterials(autoMaterials)
    }

    // ── Active run tick ────────────────────────────────────────────────────────
    const run = get().activeRun
    if (!run) return

    const dungeon = getDungeonById(run.dungeonId)
    const depthData = dungeon?.depths[Math.min(run.depth - 1, (dungeon?.depths.length ?? 1) - 1)]

    set(state => {
      if (!state.activeRun) return state

      const newTorch = state.activeRun.torchTimeRemaining - delta

      // Revive depleted resource nodes after their respawn timer
      let nodes = state.activeRun.nodes.map(n => {
        if (n.depleted && n.type === 'resource' && n.respawnAt !== null && now >= n.respawnAt) {
          return { ...n, depleted: false, respawnAt: null, hp: 1 }
        }
        return n
      })

      // Per-entity spawn timers — spawn a new node when its timer fires
      const spawnTimers = { ...state.activeRun.spawnTimers }

      if (depthData && dungeon) {
        for (const group of depthData.spawnGroups) {
          const entity = group.type === 'enemy'
            ? getEnemyById(group.entityId)
            : getResourceById(group.entityId)
          if (!entity) continue

          const maxCount = group.count
          const aliveCount = nodes.filter(n => n.entityId === group.entityId && !n.depleted).length
          if (aliveCount >= maxCount) continue

          const nextSpawnAt = spawnTimers[group.entityId] ?? now
          if (now < nextSpawnAt) continue

          // Spawn one node of this entity type
          const x = spawnZoneToX(group.spawnZone, nodes.length)
          const y = 0.15 + Math.random() * 0.65
          const newNode: ActiveNode = {
            id: `node_spawn_${now}_${group.entityId}_${Math.random().toString(36).slice(2, 7)}`,
            entityId: group.entityId,
            type: group.type,
            x,
            y,
            hp: group.type === 'enemy' ? (getEnemyById(group.entityId)?.hp ?? 1) : 1,
            depleted: false,
            respawnAt: null,
          }
          nodes = [...nodes, newNode]

          const intervalMs = (entity.spawnIntervalSeconds / dungeon.spawnRateMultiplier) * 1000
          spawnTimers[group.entityId] = now + intervalMs
        }
      }

      return {
        activeRun: {
          ...state.activeRun,
          torchTimeRemaining: Math.max(0, newTorch),
          nodes,
          spawnTimers,
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
