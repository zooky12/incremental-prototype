import { TABS } from '@/utils/constants'
import { useGold, useActiveRun } from '@/store'
import { formatNumber } from '@/utils/math'

type Tab = typeof TABS[keyof typeof TABS]

interface TabBarProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
}

const TAB_CONFIG = [
  { id: TABS.DUNGEON,     label: 'Dungeon',  icon: '⛏' },
  { id: TABS.CRAFTING,    label: 'Alchemy',  icon: '⚗' },
  { id: TABS.SHOP,        label: 'Shop',     icon: '🏪' },
  { id: TABS.ATTRIBUTES,  label: 'Attrs',    icon: '📊' },
] as const

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const gold = useGold()
  const activeRun = useActiveRun()

  return (
    <div className="flex items-center justify-between bg-surface border-b border-border px-3 h-12 shrink-0">
      {/* Left: tab buttons */}
      <div className="flex gap-1">
        {TAB_CONFIG.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-all
              ${activeTab === tab.id
                ? 'bg-primary/15 text-primary border border-primary/30'
                : 'text-muted hover:text-text hover:bg-surface-2'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.id === TABS.DUNGEON && activeRun && (
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Right: gold */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-primary font-mono font-bold">{formatNumber(gold)}</span>
        <span className="text-muted text-xs">gold</span>
      </div>
    </div>
  )
}
