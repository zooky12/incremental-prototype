import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { ActiveNode } from '@/types/dungeon'
import type { EnemyConfig } from '@/types/config'
import { MovementController } from '@/pixi/systems/MovementController'
import type { ResourceTarget } from '@/pixi/systems/MovementController'

// Visual representation of an enemy node in the dungeon canvas.
// Clicks are handled by DungeonScene's click layer — no bridge import needed here.
export class EnemyNode extends Container {
  private bg: Graphics
  private hpBar: Graphics
  private nameLabel: Text
  private glowRing: Graphics

  nodeId: string
  private currentHp: number
  private maxHp: number
  private movement: MovementController

  private flashTimer = 0

  constructor(node: ActiveNode, config: EnemyConfig, canvasW: number, canvasH: number) {
    super()
    this.nodeId = node.id
    this.currentHp = node.hp
    this.maxHp = config.hp
    this.x = node.x * canvasW
    this.y = node.y * canvasH
    this.movement = new MovementController(config.movement, this.x, this.y)

    this.glowRing = new Graphics()
    this.addChild(this.glowRing)

    this.bg = new Graphics()
    this.drawBody()
    this.addChild(this.bg)

    this.hpBar = new Graphics()
    this.addChild(this.hpBar)
    this.drawHpBar()

    const style = new TextStyle({ fill: 0xef4444, fontSize: 9, fontWeight: 'bold' })
    this.nameLabel = new Text({ text: config.displayName.substring(0, 8), style })
    this.nameLabel.anchor.set(0.5)
    this.nameLabel.y = 36
    this.addChild(this.nameLabel)
  }

  private drawBody() {
    this.bg.clear()
    this.bg.fill(0x4a1a1a)
    this.bg.stroke({ color: 0xef4444, width: 2 })
    this.bg.regularPoly(0, 0, 26, 4, Math.PI / 4)
    this.bg.fill()
    this.bg.stroke()
  }

  private drawHpBar() {
    this.hpBar.clear()
    const w = 40; const h = 5
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

  flashHit() {
    this.flashTimer = 0.15
  }

  tick(delta: number, canvasW: number, canvasH: number, resources: ResourceTarget[] = []) {
    // Flash on hit
    if (this.flashTimer > 0) {
      this.flashTimer -= delta
      this.bg.tint = 0xffffff
      this.bg.alpha = 0.5 + 0.5 * (this.flashTimer / 0.15)
    } else {
      this.bg.tint = 0xffffff
      this.bg.alpha = 1
      this.flashTimer = 0
    }

    // Movement
    const pos = this.movement.tick(delta, this.x, this.y, canvasW, canvasH, resources)
    this.x = pos.x
    this.y = pos.y

    // Pulsing glow
    this.glowRing.clear()
    const glowAlpha = 0.1 + Math.sin(performance.now() / 500) * 0.08
    this.glowRing.fill({ color: 0xef4444, alpha: glowAlpha })
    this.glowRing.circle(0, 0, 38)
    this.glowRing.fill()
  }

  setKilled() {
    this.visible = false
  }
}
