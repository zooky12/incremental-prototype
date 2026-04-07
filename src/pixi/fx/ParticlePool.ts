import { Graphics, Container } from 'pixi.js'
import { PARTICLE_POOL_SIZE } from '@/utils/constants'

interface Particle {
  gfx: Graphics
  vx: number
  vy: number
  life: number
  maxLife: number
  active: boolean
}

// Object-pooled particle system — pre-allocates to avoid GC pressure
// during intense clicking sessions.
export class ParticlePool {
  private pool: Particle[] = []
  private container: Container

  constructor(container: Container) {
    this.container = container

    for (let i = 0; i < PARTICLE_POOL_SIZE; i++) {
      const gfx = new Graphics()
      gfx.visible = false
      container.addChild(gfx)
      this.pool.push({ gfx, vx: 0, vy: 0, life: 0, maxLife: 1, active: false })
    }
  }

  burst(x: number, y: number, color: number, count = 8) {
    for (let i = 0; i < count; i++) {
      const p = this.acquire()
      if (!p) break

      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5
      const speed = 60 + Math.random() * 80
      p.vx = Math.cos(angle) * speed
      p.vy = Math.sin(angle) * speed
      p.life = 0
      p.maxLife = 0.4 + Math.random() * 0.3
      p.active = true

      p.gfx.clear()
      p.gfx.fill(color)
      p.gfx.circle(0, 0, 3 + Math.random() * 3)
      p.gfx.fill()
      p.gfx.x = x
      p.gfx.y = y
      p.gfx.visible = true
      p.gfx.alpha = 1
    }
  }

  tick(delta: number) {
    for (const p of this.pool) {
      if (!p.active) continue

      p.life += delta
      const t = p.life / p.maxLife

      if (t >= 1) {
        this.release(p)
        continue
      }

      p.gfx.x += p.vx * delta
      p.gfx.y += p.vy * delta
      p.vy += 120 * delta // gravity
      p.gfx.alpha = 1 - t
      p.gfx.scale.set(1 - t * 0.5)
    }
  }

  private acquire(): Particle | null {
    return this.pool.find(p => !p.active) ?? null
  }

  private release(p: Particle) {
    p.active = false
    p.gfx.visible = false
  }

  destroy() {
    for (const p of this.pool) {
      this.container.removeChild(p.gfx)
      p.gfx.destroy()
    }
  }
}
