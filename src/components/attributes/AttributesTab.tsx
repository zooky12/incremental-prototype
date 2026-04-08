import { useState } from 'react'
import { useGameStore, useUnlockedZones, useAttributeOverrides } from '@/store'
import { usePlayerAttributes } from '@/hooks/usePlayerAttributes'
import { getAttributes } from '@/utils/configLoader'

const LOCKABLE_ZONES = [
  { zone: 'auto',  label: 'Auto Zone',  description: 'Runs itself — drains stability faster' },
  { zone: 'purge', label: 'Purge Zone', description: 'Cleanup run — restores stability' },
]

export function AttributesTab() {
  const attrs = getAttributes()
  const computed = usePlayerAttributes()
  const overrides = useAttributeOverrides()
  const unlockedZones = useUnlockedZones()
  const setAttributeOverride = useGameStore(s => s.setAttributeOverride)
  const setZoneUnlocked = useGameStore(s => s.setZoneUnlocked)

  // Local draft input state (controlled inputs for override fields)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  function handleOverrideChange(id: string, raw: string) {
    setDrafts(d => ({ ...d, [id]: raw }))
    const num = parseFloat(raw)
    if (!isNaN(num)) {
      setAttributeOverride(id, num)
    }
  }

  function handleOverrideClear(id: string) {
    setDrafts(d => {
      const next = { ...d }
      delete next[id]
      return next
    })
    setAttributeOverride(id, null)
  }

  const byCategory = attrs.reduce<Record<string, typeof attrs>>((acc, a) => {
    ;(acc[a.category] ??= []).push(a)
    return acc
  }, {})

  function handleResetAll() {
    if (window.confirm('Erase ALL progress? This cannot be undone.')) {
      // Reset Zustand state to initial values BEFORE clearing storage.
      // Zustand's persist subscription fires asynchronously after setState and would
      // re-write the old in-memory state back to localStorage if we only called removeItem.
      useGameStore.setState({
        // dungeon
        activeRun: null,
        cores: [],
        totalRunsCompleted: 0,
        dungeonPrestigeLevel: 0,
        // resources
        materials: {},
        potions: {},
        gold: 0,
        // crafting
        session: null,
        pourHistory: [],
        apprenticePatterns: [],
        // shop
        purchasedUpgrades: {},
        discoveredRecipes: [],
        reputation: 0,
        gamePrestigeLevel: 0,
        // attributes
        attributeOverrides: {},
        runBuffs: {},
        unlockedZones: ['recharge', 'manual'],
      }, true)
      localStorage.removeItem('alchemy-empire-save')
      window.location.reload()
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-primary font-bold text-sm uppercase tracking-wider mb-1">Debug — Attributes</h2>
          <p className="text-muted text-xs">Override values are absolute and replace all computed modifiers.</p>
        </div>
        <button
          onClick={handleResetAll}
          className="shrink-0 text-xs bg-danger/20 hover:bg-danger/30 text-danger border border-danger/40 hover:border-danger rounded px-3 py-1.5 transition-colors"
        >
          Reset All Progress
        </button>
      </div>

      {/* Zone Unlocks */}
      <section>
        <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">Zone Unlocks</h3>
        <div className="bg-surface rounded-lg border border-border divide-y divide-border">
          {LOCKABLE_ZONES.map(({ zone, label, description }) => (
            <label key={zone} className="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-surface-2 transition-colors">
              <input
                type="checkbox"
                checked={unlockedZones.includes(zone)}
                onChange={e => setZoneUnlocked(zone, e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <div>
                <div className="text-sm font-medium text-text">{label}</div>
                <div className="text-xs text-muted">{description}</div>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* Attribute rows grouped by category */}
      {Object.entries(byCategory).map(([category, list]) => (
        <section key={category}>
          <h3 className="text-xs font-bold text-muted uppercase tracking-wider mb-2">{category}</h3>
          <div className="bg-surface rounded-lg border border-border divide-y divide-border">
            {list.map(attr => {
              const value = computed[attr.id] ?? attr.baseValue
              const hasOverride = overrides[attr.id] !== undefined
              const draftValue = drafts[attr.id] ?? (hasOverride ? String(overrides[attr.id]) : '')

              return (
                <div key={attr.id} className="flex items-center gap-3 px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text">{attr.displayName}</div>
                    <div className="text-xs text-muted truncate">{attr.description}</div>
                  </div>

                  {/* Effective value */}
                  <div className={`text-sm font-mono font-bold min-w-[3rem] text-right ${hasOverride ? 'text-warning' : 'text-accent'}`}>
                    {attr.type === 'integer' ? Math.round(value) : value.toFixed(2)}
                  </div>

                  {/* Override input */}
                  <input
                    type="number"
                    value={draftValue}
                    placeholder={String(attr.baseValue)}
                    onChange={e => handleOverrideChange(attr.id, e.target.value)}
                    className="w-20 bg-bg border border-border rounded px-2 py-1 text-xs font-mono text-text focus:outline-none focus:border-primary"
                  />

                  {/* Clear override */}
                  <button
                    onClick={() => handleOverrideClear(attr.id)}
                    disabled={!hasOverride}
                    className="text-xs text-muted hover:text-danger disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-1"
                    title="Clear override"
                  >
                    ✕
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
