import { Container, Application, Graphics, Ticker } from 'pixi.js'
import type { PixiBridge } from '@/pixi/bridge/PixiBridge'
import { ResourceNode } from '@/pixi/nodes/ResourceNode'
import { EnemyNode } from '@/pixi/nodes/EnemyNode'
import { ParticlePool } from '@/pixi/fx/ParticlePool'
import { ScreenShake } from '@/pixi/systems/ScreenShake'
import { getEnemyById, getResourceById, getBalance } from '@/utils/configLoader'
import type { DungeonRun } from '@/types/dungeon'

interface NodeClickResult {
  hpLost: number
  materialsGained: Record<string, number>
  killed: boolean
}

// Root scene for the dungeon canvas.
// Owned by DungeonView.tsx — created in a useEffect after the PixiJS app is ready.
// Communicates with React ONLY via PixiBridge events.
export class DungeonScene {
  private root: Container
  private nodesContainer: Container
  private fxContainer: Container
  private bg: Graphics
  private particles: ParticlePool
  private shake: ScreenShake

  private resourceNodes = new Map<string, ResourceNode>()
  private enemyNodes = new Map<string, EnemyNode>()

  private ticker: Ticker
  private canvasW: number
  private canvasH: number

  constructor(private app: Application, private bridge: PixiBridge) {
    this.canvasW = app.screen.width
    this.canvasH = app.screen.height

    // Scene graph
    this.root = new Container()
    this.nodesContainer = new Container()
    this.fxContainer = new Container()

    // Background
    this.bg = new Graphics()
    this.drawBackground()
    this.root.addChild(this.bg)
    this.root.addChild(this.nodesContainer)
    this.root.addChild(this.fxContainer)
    app.stage.addChild(this.root)

    this.particles = new ParticlePool(this.fxContainer)
    this.shake = new ScreenShake(this.root, getBalance().dungeon.screenShakeDecay)

    // Tick loop
    this.ticker = new Ticker()
    this.ticker.add(this.tick.bind(this))
    this.ticker.start()

    // Resize handling
    app.renderer.on('resize', this.onResize.bind(this))
  }

  private drawBackground() {
    this.bg.clear()
    this.bg.fill(0x0d0d12)
    this.bg.rect(0, 0, this.canvasW, this.canvasH)
    this.bg.fill()

    // Subtle grid lines
    this.bg.stroke({ color: 0x1a1a24, width: 1 })
    const gridSize = 48
    for (let x = 0; x < this.canvasW; x += gridSize) {
      this.bg.moveTo(x, 0)
      this.bg.lineTo(x, this.canvasH)
    }
    for (let y = 0; y < this.canvasH; y += gridSize) {
      this.bg.moveTo(0, y)
      this.bg.lineTo(this.canvasW, y)
    }
    this.bg.stroke()
  }

  spawnNodesFromRun(run: DungeonRun) {
    this.clearNodes()

    for (const node of run.nodes) {
      const px = node.x * this.canvasW
      const py = node.y * this.canvasH

      if (node.type === 'resource') {
        const config = getResourceById(node.entityId)
        if (!config) continue
        const resourceNode = new ResourceNode(node, config, this.bridge)
        resourceNode.x = px
        resourceNode.y = py
        this.nodesContainer.addChild(resourceNode)
        this.resourceNodes.set(node.id, resourceNode)
      } else {
        const config = getEnemyById(node.entityId)
        if (!config) continue
        const enemyNode = new EnemyNode(node, config, this.bridge, this.canvasW, this.canvasH)
        // EnemyNode positions itself from normalized coords in constructor
        this.nodesContainer.addChild(enemyNode)
        this.enemyNodes.set(node.id, enemyNode)
      }
    }
  }

  onNodeClicked(nodeId: string, result: NodeClickResult) {
    // Find node position for FX
    const rNode = this.resourceNodes.get(nodeId)
    const eNode = this.enemyNodes.get(nodeId)

    if (rNode) {
      this.particles.burst(rNode.x, rNode.y, 0x4ade80, 6)
      this.shake.shake(getBalance().dungeon.screenShakeIntensity * 0.4)
      if (result.killed) rNode.setDepleted(true)
    }

    if (eNode) {
      this.particles.burst(eNode.x, eNode.y, 0xef4444, 10)
      this.shake.shake(getBalance().dungeon.screenShakeIntensity)
      if (result.killed) {
        eNode.setKilled()
      }
    }
  }

  despawnNode(nodeId: string) {
    const rNode = this.resourceNodes.get(nodeId)
    if (rNode) rNode.setDepleted(true)

    const eNode = this.enemyNodes.get(nodeId)
    if (eNode) eNode.setKilled()
  }

  respawnNode(nodeId: string) {
    const rNode = this.resourceNodes.get(nodeId)
    if (rNode) rNode.setDepleted(false)
  }

  updateStats(_stats: { hp: number; stability: number; torchTime: number }) {
    // Stats are rendered by React HUD overlay — no Pixi update needed here.
    // This method exists for future Pixi-side stat visualization if needed.
  }

  private clearNodes() {
    for (const n of this.resourceNodes.values()) {
      this.nodesContainer.removeChild(n)
      n.destroy()
    }
    for (const n of this.enemyNodes.values()) {
      this.nodesContainer.removeChild(n)
      n.destroy()
    }
    this.resourceNodes.clear()
    this.enemyNodes.clear()
  }

  private tick() {
    const delta = this.ticker.deltaMS / 1000

    for (const n of this.resourceNodes.values()) n.tick(delta)
    for (const n of this.enemyNodes.values()) n.tick(delta, this.canvasW, this.canvasH)
    this.particles.tick(delta)
    this.shake.tick(delta)
  }

  private onResize(w: number, h: number) {
    this.canvasW = w
    this.canvasH = h
    this.drawBackground()
  }

  destroy() {
    this.ticker.stop()
    this.ticker.destroy()
    this.clearNodes()
    this.particles.destroy()
    this.app.stage.removeChild(this.root)
    this.root.destroy({ children: true })
  }
}
