import { useDroppable } from '@dnd-kit/core'
import type { CoreZone } from '@/types/dungeon'

interface DropZoneProps {
  zone: CoreZone
  label: string
  description: string
  children?: React.ReactNode
  accentColor: string
}

export function DropZone({ zone, label, description, children, accentColor }: DropZoneProps) {
  const { isOver, setNodeRef } = useDroppable({ id: zone })

  return (
    <div
      ref={setNodeRef}
      className={`
        flex-1 flex flex-col gap-2 p-3 rounded-lg border transition-all duration-150
        ${isOver ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-border bg-surface'}
      `}
    >
      <div className="text-center">
        <div className={`text-sm font-bold ${accentColor}`}>{label}</div>
        <div className="text-xs text-muted">{description}</div>
      </div>
      <div className="flex flex-col gap-2 min-h-12">
        {children}
      </div>
    </div>
  )
}
