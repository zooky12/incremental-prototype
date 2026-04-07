import { EventEmitter } from '@/utils/eventEmitter'
import type { PixiToReactEvents } from './types'

// PixiBridge is the only coupling point between PixiJS and React.
//
// RULES:
//   - Pixi code ONLY emits events on this bridge
//   - React hooks ONLY subscribe to events on this bridge
//   - Zustand store is NEVER imported inside src/pixi/
//   - Pixi objects NEVER enter the Zustand store
//
// Usage:
//   const bridge = new PixiBridge()
//   bridge.on('node-clicked', handler)   // React side
//   bridge.emit('node-clicked', payload) // Pixi side

export class PixiBridge extends EventEmitter<PixiToReactEvents> {
  constructor() {
    super()
  }
}
