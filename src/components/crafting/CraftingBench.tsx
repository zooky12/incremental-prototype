import { useMaterials, usePotions } from '@/store'
import { RecipeBook } from './RecipeBook'
import { PourMiniGame } from './PourMiniGame'
import { useCraftingSession as useSession } from '@/hooks/useCraftingSession'
import { NumberDisplay } from '@/components/shared/NumberDisplay'

export function CraftingBench() {
  const materials = useMaterials()
  const potions = usePotions()
  const { session } = useSession()

  return (
    <div className="flex h-full gap-4 p-4">
      {/* Left: inventory */}
      <div className="w-48 flex flex-col gap-3">
        <div className="text-xs font-bold text-primary uppercase tracking-wider">Materials</div>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {Object.entries(materials).filter(([, qty]) => qty > 0).length === 0 ? (
            <div className="text-muted text-xs">None yet — explore the dungeon!</div>
          ) : (
            Object.entries(materials)
              .filter(([, qty]) => qty > 0)
              .map(([id, qty]) => (
                <div key={id} className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-xs text-text truncate">{id.replace(/_/g, ' ')}</span>
                  <NumberDisplay value={qty} className="ml-2" />
                </div>
              ))
          )}
        </div>

        <div className="h-px bg-border" />

        <div className="text-xs font-bold text-primary uppercase tracking-wider">Potions</div>
        <div className="flex flex-col gap-1 overflow-y-auto">
          {Object.entries(potions).filter(([, qty]) => qty > 0).length === 0 ? (
            <div className="text-muted text-xs">No potions yet.</div>
          ) : (
            Object.entries(potions)
              .filter(([, qty]) => qty > 0)
              .map(([id, qty]) => (
                <div key={id} className="flex justify-between items-center py-1 border-b border-border/30">
                  <span className="text-xs text-text truncate">{id.replace(/_/g, ' ')}</span>
                  <NumberDisplay value={qty} className="ml-2" />
                </div>
              ))
          )}
        </div>
      </div>

      <div className="w-px bg-border" />

      {/* Right: recipe book */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="text-xs font-bold text-primary uppercase tracking-wider">Known Recipes</div>
        <RecipeBook />
      </div>

      {/* Pour mini-game overlay */}
      {session && <PourMiniGame />}
    </div>
  )
}
