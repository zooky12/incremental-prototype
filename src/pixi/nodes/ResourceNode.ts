import { Container, Graphics, Text, TextStyle } from 'pixi.js'
import type { PixiBridge } from '@/pixi/bridge/PixiBridge'
import type { ActiveNode } from '@/types/dungeon'
import type { ResourceConfig } from '@/types/config'

// Visual representation of a resource node in the dungeon canvas.
// Emits 'node-clicked' on the bridge when tapped/clicked.
export class ResourceNode extends Container {
  private bg: Graphics
  private label: Text
  private glowRing: Graphics
  private hoverAnim = 0
  nodeId: string

  constructor(
    node: ActiveNode,
    config: ResourceConfig,
    bridge: PixiBridge
  ) {
    super()
    this.nodeId = node.id
    this.x = 0
    this.y = 0

    // Glow ring (behind bg)
    this.glowRing = new Graphics()
    this.addChild(this.glowRing)

    // Main circle
    this.bg = new Graphics()
    this.bg.fill(0x1e4a2e)
    this.bg.stroke({ color: 0x4ade80, width: 2 })
    this.bg.circle(0, 0, 28)
    this.bg.fill()
    this.bg.stroke()
    this.addChild(this.bg)

    // Label
    const style = new TextStyle({ fill: 0x4ade80, fontSize: 10, fontWeight: 'bold' })
    this.label = new Text({ text: config.displayName.substring(0, 6), style })
    this.label.anchor.set(0.5)
    this.addChild(this.label)

    // Interactivity
    this.eventMode = 'static'
    this.cursor = 'pointer'

    this.on('pointerdown', () => {
      if (node.depleted) return
      bridge.emit('node-clicked', {
        nodeId: node.id,
        nodeType: 'resource',
        x: this.x,
        y: this.y,
      })
    })

    this.on('pointerover', () => { this.hoverAnim = 1 })
    this.on('pointerout', () => { this.hoverAnim = 0 })
  }

  setDepleted(depleted: boolean) {
    this.bg.alpha = depleted ? 0.3 : 1
    this.label.alpha = depleted ? 0.3 : 1
    this.eventMode = depleted ? 'none' : 'static'
  }

  tick(delta: number) {
    // Gentle pulse animation
    this.hoverAnim = Math.min(1, this.hoverAnim)
    const pulse = Math.sin(performance.now() / 800) * 0.05
    this.scale.set(1 + pulse + this.hoverAnim * 0.1)

    // Glow ring
    this.glowRing.clear()
    const glowAlpha = 0.15 + pulse * 2
    this.glowRing.fill({ color: 0x4ade80, alpha: glowAlpha })
    this.glowRing.circle(0, 0, 36)
    this.glowRing.fill()
  }
}
