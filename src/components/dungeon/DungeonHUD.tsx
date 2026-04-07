import { useActiveRun } from '@/store'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { useEffectiveBalance } from '@/hooks/useUpgrades'

export function DungeonHUD() {
  const run = useActiveRun()
  const balance = useEffectiveBalance()

  if (!run) return null

  const hpPct = run.hp / run.maxHp
  const torchPct = run.torchTimeRemaining / balance.dungeon.torchDurationSeconds
  const stabilityPct = run.stability / balance.dungeon.maxStability

  return (
    <div className="absolute top-3 left-3 right-3 flex flex-col gap-2 pointer-events-none">
      <div className="flex gap-3">
        {/* HP */}
        <div className="flex-1 bg-surface/80 backdrop-blur rounded p-2">
          <ProgressBar
            value={hpPct}
            label={`HP ${Math.ceil(run.hp)}/${run.maxHp}`}
            color="bg-danger"
            height={10}
            glow={hpPct < 0.25}
          />
        </div>

        {/* Torch */}
        <div className="flex-1 bg-surface/80 backdrop-blur rounded p-2">
          <ProgressBar
            value={torchPct}
            label={`Torch ${Math.ceil(run.torchTimeRemaining)}s`}
            color="bg-primary"
            height={10}
            glow={torchPct < 0.2}
          />
        </div>

        {/* Stability */}
        <div className="flex-1 bg-surface/80 backdrop-blur rounded p-2">
          <ProgressBar
            value={stabilityPct}
            label={`Stability ${Math.ceil(run.stability)}%`}
            color={stabilityPct > 0.5 ? 'bg-accent' : stabilityPct > 0.25 ? 'bg-warning' : 'bg-danger'}
            height={10}
            glow={stabilityPct < 0.2}
          />
        </div>
      </div>
    </div>
  )
}
