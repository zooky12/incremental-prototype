import { useMemo } from 'react'
import { useGameStore } from '@/store'
import { getUpgrades, getBalance } from '@/utils/configLoader'
import { resolvePath, setPath } from '@/utils/math'
import type { UpgradeConfig, UnlockCondition } from '@/types/config'
import type { BalanceConfig } from '@/types/config'

// Evaluates all purchased upgrades and returns an effective balance config
// with all upgrade effects applied on top of the base values.
export function useEffectiveBalance(): BalanceConfig {
  const purchasedUpgrades = useGameStore(s => s.purchasedUpgrades)
  const dungeonPrestigeLevel = useGameStore(s => s.dungeonPrestigeLevel)
  const totalRunsCompleted = useGameStore(s => s.totalRunsCompleted)

  return useMemo(() => {
    const base = getBalance()
    const upgrades = getUpgrades()
    // Deep clone to avoid mutating the imported config
    const effective = JSON.parse(JSON.stringify(base)) as BalanceConfig

    for (const upgrade of upgrades) {
      const level = purchasedUpgrades[upgrade.id] ?? 0
      if (level === 0) continue

      const effectiveObj = effective as unknown as Record<string, unknown>
      const current = resolvePath(effectiveObj, upgrade.effect.stat)
      const delta = upgrade.effect.valuePerLevel
        .slice(0, level)
        .reduce((sum, v) => sum + v, 0)

      let next: number
      switch (upgrade.effect.operation) {
        case 'add':
          next = current + delta
          break
        case 'multiply':
          next = current * upgrade.effect.valuePerLevel
            .slice(0, level)
            .reduce((prod, v) => prod * v, 1)
          break
        case 'set':
          next = upgrade.effect.valuePerLevel[level - 1]
          break
        default:
          next = current
      }

      setPath(effectiveObj, upgrade.effect.stat, next)
    }

    return effective
  }, [purchasedUpgrades, dungeonPrestigeLevel, totalRunsCompleted])
}

// Returns whether an upgrade is unlocked given current game state
export function useIsUpgradeUnlocked(upgradeId: string): boolean {
  const purchasedUpgrades = useGameStore(s => s.purchasedUpgrades)
  const dungeonPrestigeLevel = useGameStore(s => s.dungeonPrestigeLevel)
  const totalRunsCompleted = useGameStore(s => s.totalRunsCompleted)

  return useMemo(() => {
    const upgrade = getUpgrades().find(u => u.id === upgradeId)
    if (!upgrade) return false
    return evaluateUnlockCondition(upgrade.unlockCondition, purchasedUpgrades, dungeonPrestigeLevel, totalRunsCompleted)
  }, [upgradeId, purchasedUpgrades, dungeonPrestigeLevel, totalRunsCompleted])
}

// Returns all upgrades with their unlock status and current level
export function useAllUpgradesWithStatus() {
  const purchasedUpgrades = useGameStore(s => s.purchasedUpgrades)
  const dungeonPrestigeLevel = useGameStore(s => s.dungeonPrestigeLevel)
  const totalRunsCompleted = useGameStore(s => s.totalRunsCompleted)

  return useMemo(() => {
    const upgrades = getUpgrades()
    return upgrades.map(upgrade => ({
      ...upgrade,
      currentLevel: purchasedUpgrades[upgrade.id] ?? 0,
      isUnlocked: evaluateUnlockCondition(
        upgrade.unlockCondition,
        purchasedUpgrades,
        dungeonPrestigeLevel,
        totalRunsCompleted
      ),
      isMaxed: (purchasedUpgrades[upgrade.id] ?? 0) >= upgrade.maxLevel,
    }))
  }, [purchasedUpgrades, dungeonPrestigeLevel, totalRunsCompleted])
}

function evaluateUnlockCondition(
  condition: UnlockCondition | null,
  purchasedUpgrades: Record<string, number>,
  dungeonPrestigeLevel: number,
  totalRunsCompleted: number
): boolean {
  if (!condition) return true
  switch (condition.type) {
    case 'upgrade_level':
      return (purchasedUpgrades[condition.upgradeId!] ?? 0) >= (condition.level ?? 1)
    case 'prestige_tier':
      return dungeonPrestigeLevel >= (condition.tier ?? 1)
    case 'runs_completed':
      return totalRunsCompleted >= (condition.count ?? 1)
    default:
      return true
  }
}

// Calculate upgrade cost at current level
export function getUpgradeCost(upgrade: UpgradeConfig, currentLevel: number): number {
  if (currentLevel >= upgrade.maxLevel) return Infinity
  const { base, exponent, increment, type } = upgrade.costCurve
  if (type === 'exponential') {
    return Math.floor(base * Math.pow(exponent ?? 2, currentLevel))
  }
  return Math.floor(base + (increment ?? base) * currentLevel)
}
