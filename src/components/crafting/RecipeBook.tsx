import { useDiscoveredRecipes, useMaterials, useGameStore } from '@/store'
import { getRecipes, getRecipeById } from '@/utils/configLoader'
import { useCraftingSession } from '@/hooks/useCraftingSession'

export function RecipeBook() {
  const discoveredRecipes = useDiscoveredRecipes()
  const materials = useMaterials()
  const { initiateCraft } = useCraftingSession()
  const canAfford = useGameStore(s => s.canAfford)

  const allRecipes = getRecipes()
  const visible = allRecipes.filter(r => discoveredRecipes.includes(r.id))

  return (
    <div className="flex flex-col gap-2 overflow-y-auto flex-1">
      {visible.length === 0 && (
        <div className="text-muted text-sm text-center py-8">
          No recipes discovered yet. Gather materials from the dungeon.
        </div>
      )}
      {visible.map(recipe => {
        const cost: Record<string, number> = {}
        for (const ing of recipe.ingredients) {
          cost[ing.itemId] = (cost[ing.itemId] ?? 0) + ing.quantity
        }
        const affordable = canAfford(cost)

        return (
          <div
            key={recipe.id}
            className={`
              p-3 rounded-lg border transition-all
              ${affordable ? 'border-border hover:border-primary/50 cursor-pointer' : 'border-border/50 opacity-60'}
              bg-surface-2
            `}
            onClick={() => affordable && initiateCraft(recipe.id)}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-text">
                {recipe.outputId.replace(/_/g, ' ')}
              </span>
              <span className="text-xs text-muted">×{recipe.outputQuantity}</span>
            </div>

            {/* Ingredients */}
            <div className="flex flex-wrap gap-2 mt-2">
              {recipe.ingredients.map(ing => {
                const have = materials[ing.itemId] ?? 0
                const hasEnough = have >= ing.quantity
                return (
                  <span
                    key={ing.itemId}
                    className={`text-xs px-2 py-0.5 rounded border ${
                      hasEnough ? 'border-accent/40 text-accent bg-accent/10' : 'border-danger/40 text-danger bg-danger/10'
                    }`}
                  >
                    {ing.itemId.replace(/_/g, ' ')} ×{ing.quantity} ({have})
                  </span>
                )
              })}
            </div>

            {recipe.pourWindow ? (
              <div className="text-xs text-warning mt-1">Requires pour timing</div>
            ) : (
              <div className="text-xs text-muted mt-1">Auto-craft</div>
            )}
          </div>
        )
      })}
    </div>
  )
}
