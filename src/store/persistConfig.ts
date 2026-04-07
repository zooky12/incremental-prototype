import type { GameState } from '@/types/game'
import type { PersistOptions } from 'zustand/middleware'

// Fields excluded from persistence — these reset on page load
type PersistedState = Omit<GameState, 'activeRun' | 'session'>

export const persistConfig: PersistOptions<GameState, PersistedState> = {
  name: 'alchemy-empire-save',
  version: 1,

  partialize: (state) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { activeRun, session, ...persisted } = state
    return persisted as PersistedState
  },

  migrate: (persistedState, version) => {
    // Future schema migrations go here
    // e.g., if (version === 0) { ... rename fields ... }
    return persistedState as GameState
  },
}
