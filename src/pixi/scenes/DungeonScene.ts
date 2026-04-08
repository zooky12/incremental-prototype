import { Container, Application, Graphics, Ticker, FederatedPointerEvent } from 'pixi.js'
import type { PixiBridge } from '@/pixi/bridge/PixiBridge'
import { ResourceNode } from '@/pixi/nodes/ResourceNode'
import { EnemyNode } from '@/pixi/nodes/EnemyNode'
import { ParticlePool } from '@/pixi/fx/ParticlePool'
import { ScreenShake } from '@/pixi/systems/ScreenShake'
import { getEnemyById, getResourceById, getBalance } from '@/utils/configLoader'
import type { ActiveNode, DungeonRun } from '@/types/dungeon'
import type { ResourceTarget } from '@/pixi/systems/MovementController'

interface NodeClickResult {
  hpLost: number
  materialsGained: Record<string, number>
  killed: boolean
}

export class DungeonScene {
  private root: Container
  private nodesContainer: Container
  private fxContainer: Container
  private bg: Graphics
  private clickLayer: Graphics
  private particles: ParticlePool
  private shake: ScreenShake

  private resourceNodes = new Map<string, ResourceNode>()
  private enemyNodes = new Map<string, EnemyNode>()

  // Prevent double-emitting collision events within one tick
  private pendingDestroy = new Set<string>()

  private ticker: Ticker
  private canvasW: number
  private canvasH: number
  private clickRadius = 40

  constructor(private app: Application, private bridge: PixiBridge) {
    this.canvasW = app.screen.width
    this.canvasH = app.screen.height

    this.root = new Container()
    this.nodesContainer = new Container()
    this.fxContainer = new Container()

    // Z-order: bg → nodesContainer → fxContainer → clickLayer (top)
    // clickLayer must be LAST so it intercepts all pointer events above everything else.
    this.bg = new Graphics()
    this.drawBackground()
    this.root.addChild(this.bg)
    this.root.addChild(this.nodesContainer)
    this.root.addChild(this.fxContainer)

    // Fullscreen transparent click interceptor — sits on top of all nodes.
    // All canvas pointer events route here; onCanvasClick does radius detection.
    this.clickLayer = new Graphics()
    this.clickLayer.eventMode = 'static'
    this.clickLayer.on('pointerdown', this.onCanvasClick.bind(this))
    this.drawClickLayer()
    this.root.addChild(this.clickLayer)

    app.stage.addChild(this.root)

    this.particles = new ParticlePool(this.fxContainer)
    this.shake = new ScreenShake(this.root, getBalance().dungeon.screenShakeDecay)

    this.ticker = new Ticker()
    this.ticker.add(this.tick.bind(this))
    this.ticker.start()

    app.renderer.on('resize', this.onResize.bind(this))
  }

  private drawBackground() {
    this.bg.clear()
    this.bg.fill(0x0d0d12)
    this.bg.rect(0, 0, this.canvasW, this.canvasH)
    this.bg.fill()

    this.bg.stroke({ color: 0x1a1a24, width: 1 })
    const gridSize = 48
    for (let x = 0; x < this.canvasW; x += gridSize) {
      this.bg.moveTo(x, 0); this.bg.lineTo(x, this.canvasH)
    }
    for (let y = 0; y < this.canvasH; y += gridSize) {
      this.bg.moveTo(0, y); this.bg.lineTo(this.canvasW, y)
    }
    this.bg.stroke()
  }

  private drawClickLayer() {
    this.clickLayer.clear()
    this.clickLayer.fill({ color: 0x000000, alpha: 0 })
    this.clickLayer.rect(0, 0, this.canvasW, this.canvasH)
    this.clickLayer.fill()
  }

  setClickRadius(r: number) {
    this.clickRadius = r
  }

  private onCanvasClick(event: FederatedPointerEvent) {
    // Convert screen coords to nodesContainer local space (accounts for ScreenShake on root)
    const local = this.nodesContainer.toLocal({ x: event.globalX, y: event.globalY })
    const r2 = this.clickRadius * this.clickRadius

    for (const [id, rNode] of this.resourceNodes.entries()) {
      if (rNode.isDepletedState) continue
      const dx = rNode.x - local.x
      const dy = rNode.y - local.y
      if (dx * dx + dy * dy <= r2) {
        this.bridge.emit('node-clicked', { nodeId: id, nodeType: 'resource', x: rNode.x, y: rNode.y })
      }
    }

    for (const [id, eNode] of this.enemyNodes.entries()) {
      if (!eNode.visible) continue
      const dx = eNode.x - local.x
      const dy = eNode.y - local.y
      if (dx * dx + dy * dy <= r2) {
        this.bridge.emit('node-clicked', { nodeId: id, nodeType: 'enemy', x: eNode.x, y: eNode.y })
        eNode.flashHit()
      }
    }
  }

  spawnNodesFromRun(run: DungeonRun) {
    this.clearAllNodes()
    this.pendingDestroy.clear()
    for (const node of run.nodes) {
      this.addNode(node)
    }
  }

  addNode(node: ActiveNode) {
    const px = node.x * this.canvasW
    const py = node.y * this.canvasH

    if (node.type === 'resource') {
      if (this.resourceNodes.has(node.id)) return
      const config = getResourceById(node.entityId)
      if (!config) return
      const rNode = new ResourceNode(node, config)
      rNode.x = px
      rNode.y = py
      if (node.depleted) rNode.setDepleted(true)
      this.nodesContainer.addChild(rNode)
      this.resourceNodes.set(node.id, rNode)
    } else {
      if (this.enemyNodes.has(node.id)) return
      const config = getEnemyById(node.entityId)
      if (!config) return
      const eNode = new EnemyNode(node, config, this.canvasW, this.canvasH)
      this.nodesContainer.addChild(eNode)
      this.enemyNodes.set(node.id, eNode)
    }
  }

  syncNodeStates(nodes: ActiveNode[]) {
    for (const node of nodes) {
      if (node.type === 'resource') {
        const rNode = this.resourceNodes.get(node.id)
        if (rNode) {
          rNode.setDepleted(node.depleted)
          if (!node.depleted) this.pendingDestroy.delete(node.id)
        }
      } else {
        const eNode = this.enemyNodes.get(node.id)
        if (eNode && node.depleted && eNode.visible) eNode.setKilled()
      }
    }
  }

  onNodeClicked(nodeId: string, result: NodeClickResult) {
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
      if (result.killed) eNode.setKilled()
    }
  }

  clearAllNodes() {
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
    this.pendingDestroy.clear()
  }

  updateStats(_stats: { hp: number; stability: number; torchTime: number }) {
    // Stats are rendered by React HUD overlay
  }

  private readonly COLLISION_RADIUS_SQ = 40 * 40

  private tick() {
    const delta = this.ticker.deltaMS / 1000

    // Build active resource list for chase_node enemies
    const activeResources: ResourceTarget[] = []
    for (const [id, rNode] of this.resourceNodes.entries()) {
      if (!rNode.isDepletedState) activeResources.push({ id, x: rNode.x, y: rNode.y })
    }

    for (const n of this.resourceNodes.values()) n.tick(delta, this.canvasW, this.canvasH)
    for (const n of this.enemyNodes.values()) n.tick(delta, this.canvasW, this.canvasH, activeResources)

    // Enemy-resource collision
    for (const eNode of this.enemyNodes.values()) {
      if (!eNode.visible) continue
      for (const [rId, rNode] of this.resourceNodes.entries()) {
        if (rNode.isDepletedState) continue
        if (this.pendingDestroy.has(rId)) continue
        const dx = eNode.x - rNode.x
        const dy = eNode.y - rNode.y
        if (dx * dx + dy * dy < this.COLLISION_RADIUS_SQ) {
          this.pendingDestroy.add(rId)
          rNode.setDepleted(true)
          this.bridge.emit('node-destroyed', { nodeId: rId })
        }
      }
    }

    this.particles.tick(delta)
    this.shake.tick(delta)
  }

  private onResize(w: number, h: number) {
    this.canvasW = w
    this.canvasH = h
    this.drawBackground()
    this.drawClickLayer()
  }

  destroy() {
    this.ticker.stop()
    this.ticker.destroy()
    this.clearAllNodes()
    this.particles.destroy()
    this.app.stage?.removeChild(this.root)
    this.root.destroy({ children: true })
  }
}
