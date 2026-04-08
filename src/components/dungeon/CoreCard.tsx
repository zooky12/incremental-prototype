import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import type { DungeonCore } from '@/types/dungeon'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { getDungeonById } from '@/utils/configLoader'

interface CoreCardProps {
  core: DungeonCore
}

export function CoreCard({ core }: CoreCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: core.id,
    data: { core },
  })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  const dungeon      = getDungeonById(core.dungeonId)
  const maxEnergy    = dungeon?.maxEnergy ?? 100
  const stabilityPct = core.stability / 100
  const energyPct    = core.energy / maxEnergy

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        p-2 rounded border cursor-grab select-none transition-all
        ${isDragging ? 'opacity-50 scale-105 border-primary shadow-glow z-50' : 'border-border bg-surface-2 hover:border-primary/50'}
      `}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-bold text-text truncate">{core.displayName}</span>
        <span className="text-xs text-muted ml-1">{core.zone}</span>
      </div>
      <ProgressBar
        value={stabilityPct}
        color={stabilityPct > 0.5 ? 'bg-accent' : stabilityPct > 0.25 ? 'bg-warning' : 'bg-danger'}
        height={4}
      />
      <div className="mt-1">
        <ProgressBar
          value={energyPct}
          color="bg-yellow-400"
          height={4}
        />
      </div>
    </div>
  )
}
