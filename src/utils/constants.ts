// String constants — avoids magic strings throughout the codebase

export const ZONES = {
  MANUAL: 'manual',
  AUTO: 'auto',
  PURGE: 'purge',
  IDLE: 'idle',
} as const

export const TABS = {
  DUNGEON: 'dungeon',
  CRAFTING: 'crafting',
  SHOP: 'shop',
} as const

export const BRIDGE_EVENTS = {
  NODE_CLICKED: 'node-clicked',
  RUN_END: 'run-end',
  SET_HP: 'set-hp',
  SET_STABILITY: 'set-stability',
  SCREEN_SHAKE: 'screen-shake',
} as const

export const NODE_TYPES = {
  RESOURCE: 'resource',
  ENEMY: 'enemy',
} as const

export const PARTICLE_POOL_SIZE = 60
