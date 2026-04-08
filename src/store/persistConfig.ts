import type { GameState } from '@/types/game'
import type { PersistOptions } from 'zustand/middleware'
import { getDungeonById } from '@/utils/configLoader'

// Fields excluded from persistence — these reset on page load
type PersistedState = Omit<GameState, 'activeRun' | 'session' | 'runBuffs'>

export const persistConfig: PersistOptions<GameState, PersistedState> = {
  name: 'alchemy-empire-save',
  version: 3,

  partialize: (state) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { activeRun, session, runBuffs, ...persisted } = state
    return persisted as PersistedState
  },

  migrate: (persistedState, version) => {
    const state = persistedState as GameState

    // v2 → v3: backfill DungeonCore.energy and rename 'idle' zone to 'recharge'
    if (version < 3 && Array.isArray(state.cores)) {
      state.cores = state.cores.map((c: any) => {
        const dungeon = getDungeonById(c.dungeonId)
        const maxEnergy = dungeon?.maxEnergy ?? 100
        return {
          ...c,
          energy: c.energy ?? maxEnergy,
          zone: c.zone === 'idle' ? 'recharge' : c.zone,
        }
      })
    }

    return state
  },
}
