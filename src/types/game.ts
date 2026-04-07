import type { ResourceSlice } from '@/store/resourceSlice'
import type { DungeonSlice } from '@/store/dungeonSlice'
import type { CraftingSlice } from '@/store/craftingSlice'
import type { ShopSlice } from '@/store/shopSlice'
import type { AttributeSlice } from '@/store/attributeSlice'

// Combined game state — intersection of all slice types.
// Slice files use `StateCreator<GameState, [], [], XSlice>` so GameState
// must include all slice fields AND methods.
export type GameState = ResourceSlice & DungeonSlice & CraftingSlice & ShopSlice & AttributeSlice
