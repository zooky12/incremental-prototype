import type { MovementConfig, MovementType } from '@/types/config'

// Passed by DungeonScene to nodes using chase_node movement.
// Only non-depleted resource positions should be included.
export interface ResourceTarget {
  id: string
  x: number
  y: number
}

// Canvas bounds padding — must match DungeonScene spawn/collision assumptions.
const PAD_LR  = 30
const PAD_TOP = 30
const PAD_BOT = 110

const DEFAULTS = {
  speed:         60,
  idleTime:       2,
  patrolTurnRate: 1.2,
} as const

export class MovementController {
  private type:           MovementType
  private speed:          number
  private idleTime:       number
  private patrolTurnRate: number

  // --- wander state ---
  private wanderTargetX   = 0
  private wanderTargetY   = 0
  private wanderArrived   = true  // start as arrived so first tick picks a target
  private wanderIdleTimer = 0

  // --- patrol state ---
  private patrolAngle = Math.random() * Math.PI * 2

  // --- chase_node state ---
  private chaseTargetId:  string | null = null
  private chaseIdleTimer  = 0

  constructor(config: MovementConfig, startX: number, startY: number) {
    this.type           = config.type
    this.speed          = config.speed          ?? DEFAULTS.speed
    this.idleTime       = config.idleTime       ?? DEFAULTS.idleTime
    this.patrolTurnRate = config.patrolTurnRate ?? DEFAULTS.patrolTurnRate

    this.wanderTargetX = startX
    this.wanderTargetY = startY
  }

  /**
   * Returns the new absolute {x, y} position for this frame.
   * @param delta     Frame time in seconds
   * @param resources Active (non-depleted) resource positions — only needed for chase_node
   */
  tick(
    delta: number,
    x: number,
    y: number,
    canvasW: number,
    canvasH: number,
    resources: ResourceTarget[] = []
  ): { x: number; y: number } {
    switch (this.type) {
      case 'static':     return { x, y }
      case 'wander':     return this.tickWander(delta, x, y, canvasW, canvasH)
      case 'patrol':     return this.tickPatrol(delta, x, y, canvasW, canvasH)
      case 'chase_node': return this.tickChase(delta, x, y, resources)
      default:           return { x, y }
    }
  }

  // ------------------------------------------------------------------ wander
  private tickWander(
    delta: number,
    x: number,
    y: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    if (this.wanderArrived) {
      this.wanderIdleTimer -= delta
      if (this.wanderIdleTimer > 0) return { x, y }
      // Idle over — pick next destination and start moving
      this.wanderArrived = false
      this.pickWanderTarget(canvasW, canvasH)
    }

    const dx   = this.wanderTargetX - x
    const dy   = this.wanderTargetY - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = this.speed * delta

    if (dist <= step + 1) {
      // Arrived at target
      this.wanderArrived   = true
      this.wanderIdleTimer = this.idleTime > 0 ? Math.random() * this.idleTime : 0
      return { x: this.wanderTargetX, y: this.wanderTargetY }
    }

    return {
      x: x + (dx / dist) * step,
      y: y + (dy / dist) * step,
    }
  }

  private pickWanderTarget(canvasW: number, canvasH: number) {
    this.wanderTargetX = PAD_LR  + Math.random() * (canvasW - PAD_LR  * 2)
    this.wanderTargetY = PAD_TOP + Math.random() * (canvasH - PAD_TOP - PAD_BOT)
  }

  // ------------------------------------------------------------------ patrol
  // Continuous motion with sinusoidally-varying heading. Reflects off bounds.
  private tickPatrol(
    delta: number,
    x: number,
    y: number,
    canvasW: number,
    canvasH: number
  ): { x: number; y: number } {
    // Drift the heading using a slow sinusoidal modulation
    this.patrolAngle += Math.sin(performance.now() / 1000) * this.patrolTurnRate * delta

    const step = this.speed * delta
    let nx = x + Math.cos(this.patrolAngle) * step
    let ny = y + Math.sin(this.patrolAngle) * step

    const minX = PAD_LR
    const maxX = canvasW - PAD_LR
    const minY = PAD_TOP
    const maxY = canvasH - PAD_BOT

    // Reflect off horizontal bounds
    if (nx < minX) {
      nx = minX
      this.patrolAngle = Math.PI - this.patrolAngle
    } else if (nx > maxX) {
      nx = maxX
      this.patrolAngle = Math.PI - this.patrolAngle
    }

    // Reflect off vertical bounds
    if (ny < minY) {
      ny = minY
      this.patrolAngle = -this.patrolAngle
    } else if (ny > maxY) {
      ny = maxY
      this.patrolAngle = -this.patrolAngle
    }

    return { x: nx, y: ny }
  }

  // ---------------------------------------------------------------- chase_node
  private tickChase(
    delta: number,
    x: number,
    y: number,
    resources: ResourceTarget[]
  ): { x: number; y: number } {
    // Verify current target is still alive
    if (this.chaseTargetId !== null) {
      const alive = resources.some(r => r.id === this.chaseTargetId)
      if (!alive) {
        this.chaseTargetId  = null
        this.chaseIdleTimer = this.idleTime > 0 ? Math.random() * this.idleTime : 0
      }
    }

    // Idle between targets
    if (this.chaseTargetId === null) {
      if (this.chaseIdleTimer > 0) {
        this.chaseIdleTimer -= delta
        return { x, y }
      }
      // Find nearest active resource
      let nearest: ResourceTarget | null = null
      let nearestDist = Infinity
      for (const r of resources) {
        const dx = r.x - x
        const dy = r.y - y
        const d  = dx * dx + dy * dy
        if (d < nearestDist) { nearestDist = d; nearest = r }
      }
      if (nearest === null) return { x, y }  // no resources — stay put
      this.chaseTargetId = nearest.id
    }

    const target = resources.find(r => r.id === this.chaseTargetId)
    if (!target) return { x, y }

    const dx   = target.x - x
    const dy   = target.y - y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const step = this.speed * delta

    if (dist <= step + 1) return { x: target.x, y: target.y }

    return {
      x: x + (dx / dist) * step,
      y: y + (dy / dist) * step,
    }
  }
}
