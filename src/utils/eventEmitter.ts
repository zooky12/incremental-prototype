// Tiny typed EventEmitter — no external dependency
// Used by PixiBridge as the event bus between Pixi and React

type Handler<T = unknown> = (payload: T) => void

export class EventEmitter<EventMap extends Record<string, unknown> = Record<string, unknown>> {
  private listeners: Partial<{ [K in keyof EventMap]: Array<Handler<EventMap[K]>> }> = {}

  on<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): () => void {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event]!.push(handler)
    // Return unsubscribe function
    return () => this.off(event, handler)
  }

  off<K extends keyof EventMap>(event: K, handler: Handler<EventMap[K]>): void {
    const handlers = this.listeners[event]
    if (!handlers) return
    this.listeners[event] = handlers.filter(h => h !== handler) as typeof handlers
  }

  emit<K extends keyof EventMap>(event: K, payload: EventMap[K]): void {
    const handlers = this.listeners[event]
    if (!handlers) return
    for (const handler of handlers) {
      handler(payload)
    }
  }

  removeAllListeners(): void {
    this.listeners = {}
  }
}
