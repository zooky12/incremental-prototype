import { useMemo } from 'react'
import { useGameStore } from '@/store'
import { getAttributes, getUpgrades } from '@/utils/configLoader'

// Resolves the 3-tier attribute system:
// 1. Base value from attributes.json
// 2. Additive tier: sum all 'add' upgrade effects for this stat
// 3. Multiplicative tier: product of all 'multiply' upgrade effects
// 4. Exponential tier: repeated exponentiation for 'exponential' upgrades
// 5. Per-run buffs (multiplicative, from potions)
// 6. Debug override (absolute, replaces everything)
//
// Memoized — recomputes only when purchasedUpgrades, attributeOverrides, or runBuffs change.
export function usePlayerAttributes(): Record<string, number> {
  const purchasedUpgrades = useGameStore(s => s.purchasedUpgrades)
  const attributeOverrides = useGameStore(s => s.attributeOverrides)
  const runBuffs = useGameStore(s => s.runBuffs)

  return useMemo(() => {
    const attrs = getAttributes()
    const upgrades = getUpgrades()
    const result: Record<string, number> = {}

    for (const attr of attrs) {
      // Pre-filter upgrades that target this attribute
      const relevant = upgrades.filter(u => u.effect.stat === attr.id)

      let value = attr.baseValue

      // Tier 1: additive
      for (const upgrade of relevant) {
        if (upgrade.effect.operation !== 'add') continue
        const level = purchasedUpgrades[upgrade.id] ?? 0
        if (level === 0) continue
        const delta = upgrade.effect.valuePerLevel.slice(0, level).reduce((s, v) => s + v, 0)
        value += delta
      }

      // Tier 2: multiplicative
      for (const upgrade of relevant) {
        if (upgrade.effect.operation !== 'multiply') continue
        const level = purchasedUpgrades[upgrade.id] ?? 0
        if (level === 0) continue
        const factor = upgrade.effect.valuePerLevel.slice(0, level).reduce((p, v) => p * v, 1)
        value *= factor
      }

      // Tier 3: exponential
      for (const upgrade of relevant) {
        if (upgrade.effect.operation !== ('exponential' as string)) continue
        const level = purchasedUpgrades[upgrade.id] ?? 0
        if (level === 0) continue
        for (let i = 0; i < level; i++) {
          value = Math.pow(value, upgrade.effect.valuePerLevel[i] ?? 1)
        }
      }

      // Per-run buffs (multiplicative)
      if (runBuffs[attr.id] !== undefined) {
        value *= runBuffs[attr.id]
      }

      // Debug override — absolute, replaces computed value
      if (attributeOverrides[attr.id] !== undefined) {
        value = attributeOverrides[attr.id]
      }

      result[attr.id] = value
    }

    return result
  }, [purchasedUpgrades, attributeOverrides, runBuffs])
}

// Convenience hook for a single attribute value
export function usePlayerAttr(id: string): number {
  const attrs = usePlayerAttributes()
  return attrs[id] ?? 0
}
