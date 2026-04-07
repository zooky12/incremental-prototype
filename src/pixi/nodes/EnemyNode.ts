import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { PixiBridge } from '@/pixi/bridge/PixiBridge'
import type { ActiveNode } from '@/types/dungeon'
import type { EnemyConfig } from '@/types/config'

// Visual representation of an enemy node in the dungeon canvas.
// Emits 'node-clicked' on the bridge when tapped/clicked.
// Wanders based on its movement config.
export class EnemyNode extends Container {
  private bg: Graphics
  private hpBar: Graphics
  private label: Text
  private glowRing: Graphics

  nodeId: string
  private currentHp: number
  private maxHp: number
  private config: EnemyConfig

  // Wander state
  private wanderTargetX = 0
  private wanderTargetY = 0
  private wanderTimer = 0
  private baseX = 0
  private baseY = 0

  constructor(
    node: ActiveNode,
    config: EnemyConfig,
    bridge: PixiBridge,
    canvasW: number,
    canvasH: number
  ) {
    super()
    this.nodeId = node.id
    this.config = config
    this.currentHp = node.hp
    this.maxHp = config.hp
    this.baseX = node.x * canvasW
    this.baseY = node.y * canvasH
    this.x = this.baseX
    this.y = this.baseY
    this.wanderTargetX = this.baseX
    this.wanderTargetY = this.baseY

    // Glow ring
    this.glowRing = new Graphics()
    this.addChild(this.glowRing)

    // Main body
    this.bg = new Graphics()
    this.drawBody()
    this.addChild(this.bg)

    // HP bar
    this.hpBar = new Graphics()
    this.addChild(this.hpBar)
    this.drawHpBar()

    // Label
    const style = new TextStyle({ fill: 0xef4444, fontSize: 9, fontWeight: 'bold' })
    this.label = new Text({ text: config.displayName.substring(0, 8), style })
    this.label.anchor.set(0.5)
    this.label.y = 36
    this.addChild(this.label)

    // Interactivity
    this.eventMode = 'static'
    this.cursor = 'crosshair'

    this.on('pointerdown', () => {
      bridge.emit('node-clicked', {
        nodeId: node.id,
        nodeType: 'enemy',
        x: this.x,
        y: this.y,
      })
      this.flashHit()
    })
  }

  private drawBody() {
    this.bg.clear()
    this.bg.fill(0x4a1a1a)
    this.bg.stroke({ color: 0xef4444, width: 2 })
    this.bg.regularPoly(0, 0, 26, 4, Math.PI / 4)  // diamond shape
    this.bg.fill()
    this.bg.stroke()
  }

  private drawHpBar() {
    this.hpBar.clear()
    const w = 40
    const h = 5
    const filled = (this.currentHp / this.maxHp) * w

    this.hpBar.fill(0x3a0a0a)
    this.hpBar.roundRect(-w / 2, -38, w, h, 2)
    this.hpBar.fill()

    this.hpBar.fill(0xef4444)
    this.hpBar.roundRect(-w / 2, -38, filled, h, 2)
    this.hpBar.fill()
  }

  updateHp(hp: number) {
    this.currentHp = hp
    this.drawHpBar()
  }

  private flashTimer = 0

  private flashHit() {
    this.flashTimer = 0.15
  }

  tick(delta: number, canvasW: number, canvasH: number) {
    // Flash on hit
    if (this.flashTimer > 0) {
      this.flashTimer -= delta
      this.bg.tint = 0xffffff
    } else {
      this.bg.tint = 0xffffff // reset
      this.flashTimer = 0
    }

    // Wander movement
    if (this.config.movement.type === 'wander' || this.config.movement.type === 'patrol') {
      this.wanderTimer -= delta
      if (this.wanderTimer <= 0) {
        const r = (this.config.movement.wanderRadius ?? 0.12) * Math.min(canvasW, canvasH)
        const angle = Math.random() * Math.PI * 2
        this.wanderTargetX = clamp(this.baseX + Math.cos(angle) * r, 30, canvasW - 30)
        this.wanderTargetY = clamp(this.baseY + Math.sin(angle) * r, 30, canvasH - 80)
        this.wanderTimer = 1.5 + Math.random() * 2
      }

      const speed = (this.config.movement.speed ?? 60) * delta
      const dx = this.wanderTargetX - this.x
      const dy = this.wanderTargetY - this.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > 1) {
        this.x += (dx / dist) * Math.min(speed, dist)
        this.y += (dy / dist) * Math.min(speed, dist)
      }
    }

    // Pulsing glow
    this.glowRing.clear()
    const glowAlpha = 0.1 + Math.sin(performance.now() / 500) * 0.08
    this.glowRing.fill({ color: 0xef4444, alpha: glowAlpha })
    this.glowRing.circle(0, 0, 38)
    this.glowRing.fill()
  }

  setKilled() {
    this.visible = false
    this.eventMode = 'none'
  }
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}
