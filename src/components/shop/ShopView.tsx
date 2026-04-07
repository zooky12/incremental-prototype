import { useGold, useGameStore } from '@/store'
import { NumberDisplay } from '@/components/shared/NumberDisplay'
import { useAllUpgradesWithStatus, getUpgradeCost } from '@/hooks/useUpgrades'

export function ShopView() {
  const gold = useGold()
  const spendGold = useGameStore(s => s.spendGold)
  const purchaseUpgrade = useGameStore(s => s.purchaseUpgrade)
  const upgrades = useAllUpgradesWithStatus()

  function handleBuy(upgradeId: string, cost: number) {
    const success = spendGold(cost)
    if (success) purchaseUpgrade(upgradeId)
  }

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-primary uppercase tracking-wider">Alchemist's Shop</div>
        <NumberDisplay value={gold} label="gold" icon="🪙" />
      </div>

      {/* Upgrades by category */}
      {(['dungeon', 'crafting', 'shop'] as const).map(category => {
        const catUpgrades = upgrades.filter(u => u.category === category)
        return (
          <div key={category} className="flex flex-col gap-2">
            <div className="text-xs text-muted uppercase tracking-wider border-b border-border pb-1">
              {category}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {catUpgrades.map(upgrade => {
                const cost = getUpgradeCost(upgrade, upgrade.currentLevel)
                const canBuy = upgrade.isUnlocked && !upgrade.isMaxed && gold >= cost

                return (
                  <div
                    key={upgrade.id}
                    className={`
                      p-3 rounded-lg border transition-all
                      ${!upgrade.isUnlocked ? 'border-border/30 opacity-40' : 'border-border bg-surface-2'}
                    `}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-sm font-bold text-text">{upgrade.displayName}</span>
                      <span className="text-xs bg-surface px-1 rounded text-muted ml-1">
                        {upgrade.currentLevel}/{upgrade.maxLevel}
                      </span>
                    </div>
                    <div className="text-xs text-muted mb-2">{upgrade.description}</div>

                    {!upgrade.isUnlocked ? (
                      <div className="text-xs text-muted/60">
                        Locked
                      </div>
                    ) : upgrade.isMaxed ? (
                      <div className="text-xs text-accent">Maxed out</div>
                    ) : (
                      <button
                        onClick={() => handleBuy(upgrade.id, cost)}
                        disabled={!canBuy}
                        className={`
                          w-full py-1 rounded text-xs font-bold transition-all
                          ${canBuy
                            ? 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40'
                            : 'bg-surface text-muted border border-border/40 cursor-not-allowed'
                          }
                        `}
                      >
                        {cost} gold
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Sell potions section (stub) */}
      <div className="mt-auto text-xs text-muted text-center border border-border/30 rounded p-3">
        Potion selling coming soon. Brew potions in the Crafting tab.
      </div>
    </div>
  )
}
