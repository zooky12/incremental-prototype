import { useCallback } from 'react'
import { useCraftingSession } from '@/hooks/useCraftingSession'
import { ProgressBar } from '@/components/shared/ProgressBar'
import { getRecipeById } from '@/utils/configLoader'
import { showToast } from '@/components/shared/ToastStack'

export function PourMiniGame() {
  const { session, beginPour, releasePour, cancelCraft } = useCraftingSession()

  const handlePointerDown = useCallback(() => {
    beginPour()
  }, [beginPour])

  const handlePointerUp = useCallback(() => {
    const result = releasePour()
    if (result === 'success') {
      showToast('Potion crafted!', 'success')
    } else if (result === 'fail') {
      showToast('Pour failed...', 'fail')
    }
  }, [releasePour])

  if (!session) return null

  const recipe = getRecipeById(session.recipeId)
  const window = recipe?.pourWindow

  return (
    <div className="fixed inset-0 flex items-center justify-center z-40 bg-bg/80 backdrop-blur">
      <div className="bg-surface border border-border rounded-xl p-6 w-80 flex flex-col gap-4 shadow-2xl">
        <div className="text-center">
          <div className="text-primary font-bold text-lg">Brewing...</div>
          <div className="text-muted text-sm">{recipe?.outputId.replace(/_/g, ' ')}</div>
        </div>

        {/* Pour progress bar with target window indicator */}
        <div className="relative">
          <ProgressBar
            value={session.pourProgress}
            color="bg-primary"
            height={24}
            glow
          />
          {/* Target window overlay */}
          {window && (
            <div
              className="absolute top-0 bottom-0 bg-accent/30 border-l-2 border-r-2 border-accent pointer-events-none"
              style={{
                left: `${window.start * 100}%`,
                width: `${(window.end - window.start) * 100}%`,
              }}
            />
          )}
          <div className="text-center text-xs text-muted mt-1">
            {window ? 'Release in the green zone' : 'Release anytime'}
          </div>
        </div>

        {/* Hold to pour button */}
        <button
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="
            py-4 rounded-lg font-bold text-lg select-none touch-none
            bg-primary/20 hover:bg-primary/30 active:bg-primary/40
            text-primary border-2 border-primary/50
            transition-colors duration-100
          "
        >
          Hold to Pour
        </button>

        <button
          onClick={cancelCraft}
          className="text-muted text-sm hover:text-text transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
