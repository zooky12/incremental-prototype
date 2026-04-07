import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useCores, useGameStore } from '@/store'
import { DropZone } from './DropZone'
import { CoreCard } from './CoreCard'
import type { CoreZone } from '@/types/dungeon'

const ZONES: Array<{ zone: CoreZone; label: string; description: string; color: string }> = [
  { zone: 'manual', label: 'Manual', description: 'Explore yourself — best yield', color: 'text-accent' },
  { zone: 'auto',   label: 'Auto',   description: 'Runs itself — drains faster', color: 'text-warning' },
  { zone: 'purge',  label: 'Purge',  description: 'Cleanup run — restores stability', color: 'text-primary' },
]

export function CorePanel() {
  const cores = useCores()
  const assignCore = useGameStore(s => s.assignCore)
  const addCore = useGameStore(s => s.addCore)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over) return
    assignCore(active.id as string, over.id as CoreZone)
  }

  return (
    <div className="absolute bottom-3 left-3 right-3">
      <div className="bg-surface/90 backdrop-blur rounded-lg border border-border p-3">
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
            {/* Idle zone (holding area) */}
            <div className="flex flex-col gap-2 w-28">
              <div className="text-xs text-muted text-center">Idle</div>
              {cores.filter(c => c.zone === 'idle').map(c => (
                <CoreCard key={c.id} core={c} />
              ))}
            </div>

            <div className="w-px bg-border self-stretch" />

            {/* Active zones */}
            <div className="flex flex-1 gap-2">
              {ZONES.map(({ zone, label, description, color }) => (
                <DropZone
                  key={zone}
                  zone={zone}
                  label={label}
                  description={description}
                  accentColor={color}
                >
                  {cores.filter(c => c.zone === zone).map(c => (
                    <CoreCard key={c.id} core={c} />
                  ))}
                </DropZone>
              ))}
            </div>
          </div>
        </DndContext>
      </div>
    </div>
  )
}
