import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useCores, useGameStore, useUnlockedZones } from '@/store'
import { DropZone } from './DropZone'
import { CoreCard } from './CoreCard'
import type { CoreZone } from '@/types/dungeon'
import { useEffectiveBalance } from '@/hooks/useUpgrades'

const ACTIVE_ZONES: Array<{ zone: CoreZone; label: string; description: string; color: string }> = [
  { zone: 'manual', label: 'Manual', description: 'Explore yourself — best yield', color: 'text-accent' },
  { zone: 'auto',   label: 'Auto',   description: 'Runs itself — drains faster',   color: 'text-warning' },
  { zone: 'purge',  label: 'Purge',  description: 'Cleanup run — restores stability', color: 'text-primary' },
]

export function CorePanel() {
  const cores         = useCores()
  const assignCore    = useGameStore(s => s.assignCore)
  const addCore       = useGameStore(s => s.addCore)
  const unlockedZones = useUnlockedZones()
  const balance       = useEffectiveBalance()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    const targetZone = over.id as CoreZone
    if (!unlockedZones.includes(targetZone)) return
    assignCore(active.id as string, targetZone)
  }

  const rechargeRate = balance.dungeon.energyRechargeRate

  return (
    <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
      <div className="bg-surface/90 backdrop-blur rounded-lg border border-border p-3 pointer-events-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-primary uppercase tracking-wider">Dungeon Cores</span>
          <button
            onClick={() => addCore('cave_of_roots')}
            className="text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 rounded px-2 py-0.5 transition-colors"
          >
            + Add Core
          </button>
        </div>

        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="flex gap-2">
            {/* Recharge zone — exhausted cores recharge energy here */}
            <div className="w-28">
              <DropZone
                zone="recharge"
                label="Recharge"
                description={`+${rechargeRate}/s energy`}
                accentColor="text-yellow-400"
              >
                {cores.filter(c => c.zone === 'recharge').map(c => (
                  <CoreCard key={c.id} core={c} />
                ))}
              </DropZone>
            </div>

            <div className="w-px bg-border self-stretch" />

            {/* Active zones */}
            <div className="flex flex-1 gap-2">
              {ACTIVE_ZONES.map(({ zone, label, description, color }) => {
                const isUnlocked = unlockedZones.includes(zone)
                return (
                  <div key={zone} className="relative flex-1">
                    <DropZone
                      zone={zone}
                      label={label}
                      description={description}
                      accentColor={color}
                    >
                      {cores.filter(c => c.zone === zone).map(c => (
                        <CoreCard key={c.id} core={c} />
                      ))}
                    </DropZone>

                    {/* Lock overlay */}
                    {!isUnlocked && (
                      <div className="absolute inset-0 bg-bg/70 backdrop-blur-[1px] rounded flex flex-col items-center justify-center gap-1 pointer-events-none">
                        <span className="text-lg">🔒</span>
                        <span className="text-xs text-muted text-center px-1">Unlock in Attrs tab</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  )
}
