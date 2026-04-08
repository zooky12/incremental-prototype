import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { ActiveNode } from '@/types/dungeon'
import type { ResourceConfig } from '@/types/config'
import { MovementController } from '@/pixi/systems/MovementController'
import type { ResourceTarget } from '@/pixi/systems/MovementController'

// Visual representation of a resource node in the dungeon canvas.
// Clicks are handled by DungeonScene's click layer — no bridge import needed here.
export class ResourceNode extends Container {
  private bg: Graphics
  private nameLabel: Text
  private glowRing: Graphics
  private hoverAnim = 0
  private _depleted = false
  private movement: MovementController

  nodeId: string

  constructor(node: ActiveNode, config: ResourceConfig) {
    super()
    this.nodeId = node.id
    // Position is set externally by DungeonScene after construction;
    // MovementController is initialised at (0,0) and updated on first tick.
    this.movement = new MovementController(config.movement, 0, 0)

    this.glowRing = new Graphics()
    this.addChild(this.glowRing)

    this.bg = new Graphics()
    this.bg.fill(0x1e4a2e)
    this.bg.stroke({ color: 0x4ade80, width: 2 })
    this.bg.circle(0, 0, 28)
    this.bg.fill()
    this.bg.stroke()
    this.addChild(this.bg)

    const style = new TextStyle({ fill: 0x4ade80, fontSize: 10, fontWeight: 'bold' })
    this.nameLabel = new Text({ text: config.displayName.substring(0, 6), style })
    this.nameLabel.anchor.set(0.5)
    this.addChild(this.nameLabel)
  }

  get isDepletedState() {
    return this._depleted
  }

  setDepleted(depleted: boolean) {
    this._depleted = depleted
    this.bg.alpha = depleted ? 0.3 : 1
    this.nameLabel.alpha = depleted ? 0.3 : 1
    this.glowRing.alpha = depleted ? 0.3 : 1
  }

  tick(delta: number, canvasW = 0, canvasH = 0, resources: ResourceTarget[] = []) {
    if (this._depleted) return

    const pos = this.movement.tick(delta, this.x, this.y, canvasW, canvasH, resources)
    this.x = pos.x
    this.y = pos.y

    const pulse = Math.sin(performance.now() / 800) * 0.05
    this.scale.set(1 + pulse + this.hoverAnim * 0.1)

    this.glowRing.clear()
    const glowAlpha = 0.15 + pulse * 2
    this.glowRing.fill({ color: 0x4ade80, alpha: glowAlpha })
    this.glowRing.circle(0, 0, 36)
    this.glowRing.fill()
  }
}
