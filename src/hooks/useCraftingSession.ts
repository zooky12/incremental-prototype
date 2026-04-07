import { useCallback, useRef } from 'react'
import { useGameStore } from '@/store'
import { getRecipeById } from '@/utils/configLoader'
import { clamp, rollChance } from '@/utils/math'
import { useEffectiveBalance } from './useUpgrades'

// Manages the pour mini-game timing using performance.now() for accuracy
// regardless of frame rate.
export function useCraftingSession() {
  const balance = useEffectiveBalance()
  const session = useGameStore(s => s.session)
  const startCraft = useGameStore(s => s.startCraft)
  const updatePourProgress = useGameStore(s => s.updatePourProgress)
  const commitPour = useGameStore(s => s.commitPour)
  const cancelCraft = useGameStore(s => s.cancelCraft)
  const addPotion = useGameStore(s => s.addPotion)
  const spendMaterials = useGameStore(s => s.spendMaterials)
  const saveApprenticePattern = useGameStore(s => s.saveApprenticePattern)
  const canAfford = useGameStore(s => s.canAfford)

  const pourStartRef = useRef<number | null>(null)
  const rafRef = useRef<number | null>(null)

  const pourDuration = balance.crafting.basePourWindowSeconds

  const beginPour = useCallback(() => {
    if (!session) return
    pourStartRef.current = performance.now()

    const animate = () => {
      if (pourStartRef.current === null) return
      const elapsed = (performance.now() - pourStartRef.current) / 1000
      const progress = clamp(elapsed / pourDuration, 0, 1)
      updatePourProgress(progress)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }
    rafRef.current = requestAnimationFrame(animate)
  }, [session, pourDuration, updatePourProgress])

  const releasePour = useCallback((): 'success' | 'fail' | 'no-session' => {
    if (!session || pourStartRef.current === null) return 'no-session'

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    const elapsed = (performance.now() - pourStartRef.current) / 1000
    const pourValue = clamp(elapsed / pourDuration, 0, 1)
    pourStartRef.current = null

    const recipe = getRecipeById(session.recipeId)
    if (!recipe) { cancelCraft(); return 'no-session' }

    // Check if player has ingredients
    const cost: Record<string, number> = {}
    for (const ing of recipe.ingredients) {
      cost[ing.itemId] = (cost[ing.itemId] ?? 0) + ing.quantity
    }
    if (!canAfford(cost)) { cancelCraft(); return 'fail' }

    // Evaluate pour window
    const window = recipe.pourWindow
    let success = true
    if (window) {
      success = pourValue >= window.start && pourValue <= window.end
    }

    // Apply base failure chance on top
    if (success && rollChance(balance.crafting.baseFailureChance)) {
      success = false
    }

    commitPour(pourValue)

    if (success) {
      spendMaterials(cost)
      addPotion(recipe.outputId, recipe.outputQuantity)
      saveApprenticePattern(recipe.recipeId, pourValue)
      return 'success'
    }

    return 'fail'
  }, [session, pourDuration, balance, commitPour, cancelCraft, spendMaterials, addPotion, saveApprenticePattern, canAfford])

  const initiateCraft = useCallback((recipeId: string) => {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return false
    startCraft(recipeId, recipe.outputId)
    return true
  }, [startCraft])

  return {
    session,
    initiateCraft,
    beginPour,
    releasePour,
    cancelCraft,
  }
}
