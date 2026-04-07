import { formatNumber } from '@/utils/math'

interface NumberDisplayProps {
  value: number
  label?: string
  icon?: string
  className?: string
}

export function NumberDisplay({ value, label, icon, className = '' }: NumberDisplayProps) {
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {icon && <span>{icon}</span>}
      <span className="font-mono text-primary font-bold">{formatNumber(value)}</span>
      {label && <span className="text-muted text-xs">{label}</span>}
    </div>
  )
}
