import { useState } from 'react'
import { TabBar } from './TabBar'
import { DungeonView } from '@/components/dungeon/DungeonView'
import { CraftingBench } from '@/components/crafting/CraftingBench'
import { ShopView } from '@/components/shop/ShopView'
import { AttributesTab } from '@/components/attributes/AttributesTab'
import { ToastStack } from '@/components/shared/ToastStack'
import { TABS } from '@/utils/constants'

type Tab = typeof TABS[keyof typeof TABS]

export function GameShell() {
  const [activeTab, setActiveTab] = useState<Tab>(TABS.DUNGEON)

  return (
    <div className="flex flex-col w-full h-full">
      <TabBar activeTab={activeTab} onTabChange={setActiveTab} />

      <div className="flex-1 relative overflow-hidden">
        {/* All views are mounted but hidden — preserves Pixi canvas across tab switches */}
        <div className={`absolute inset-0 ${activeTab === TABS.DUNGEON ? '' : 'hidden'}`}>
          <DungeonView />
        </div>
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === TABS.CRAFTING ? '' : 'hidden'}`}>
          <CraftingBench />
        </div>
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === TABS.SHOP ? '' : 'hidden'}`}>
          <ShopView />
        </div>
        <div className={`absolute inset-0 overflow-y-auto ${activeTab === TABS.ATTRIBUTES ? '' : 'hidden'}`}>
          <AttributesTab />
        </div>
      </div>

      <ToastStack />
    </div>
  )
}
