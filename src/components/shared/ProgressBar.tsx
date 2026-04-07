interface ProgressBarProps {
  value: number       // 0–1
  color?: string      // Tailwind bg class or CSS color
  bgColor?: string
  height?: number
  label?: string
  showPercent?: boolean
  className?: string
  glow?: boolean
}

export function ProgressBar({
  value,
  color = 'bg-accent',
  bgColor = 'bg-surface-2',
  height = 8,
  label,
  showPercent = false,
  className = '',
  glow = false,
}: ProgressBarProps) {
  const pct = Math.max(0, Math.min(1, value)) * 100

  return (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      {label && (
        <div className="flex justify-between text-xs text-muted">
          <span>{label}</span>
          {showPercent && <span>{Math.round(pct)}%</span>}
        </div>
      )}
      <div
        className={`w-full rounded-full overflow-hidden ${bgColor}`}
        style={{ height }}
      >
        <div
          className={`h-full rounded-full transition-all duration-100 ${color} ${glow ? 'shadow-glow' : ''}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
