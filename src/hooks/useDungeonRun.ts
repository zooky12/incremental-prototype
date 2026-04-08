import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store'
import { useGameLoop } from './useGameLoop'
import { usePlayerAttributes } from './usePlayerAttributes'
import type { PixiBridge } from '@/pixi/bridge/PixiBridge'
import type { DungeonScene } from '@/pixi/scenes/DungeonScene'

export function useDungeonRun() {
  const startRun    = useGameStore(s => s.startRun)
  const endRun      = useGameStore(s => s.endRun)
  const clickNode   = useGameStore(s => s.clickNode)
  const destroyNode = useGameStore(s => s.destroyNode)
  const tickDungeon = useGameStore(s => s.tickDungeon)
  const activeRun   = useGameStore(s => s.activeRun)

  const attrs = usePlayerAttributes()

  // Keep fresh refs for values used inside stable callbacks
  const attrsRef      = useRef(attrs);      attrsRef.current      = attrs
  const clickNodeRef  = useRef(clickNode);  clickNodeRef.current  = clickNode
  const destroyNodeRef = useRef(destroyNode); destroyNodeRef.current = destroyNode
  const endRunRef     = useRef(endRun);     endRunRef.current     = endRun
  const sceneRef      = useRef<DungeonScene | null>(null)

  // Called by DungeonView after bridge + scene are created.
  // Registers all bridge event handlers and returns a cleanup function.
  const initBridge = useCallback((bridge: PixiBridge, scene: DungeonScene): (() => void) => {
    sceneRef.current = scene

    const unsubClick = bridge.on('node-clicked', ({ nodeId }) => {
      const a = attrsRef.current
      const result = clickNodeRef.current(
        nodeId,
        a['player.clickDamage'] ?? 1,
        a['player.armor'] ?? 0
      )
      scene.onNodeClicked(nodeId, result)
    })

    const unsubDestroy = bridge.on('node-destroyed', ({ nodeId }) => {
      destroyNodeRef.current(nodeId)
    })

    const unsubEnd = bridge.on('run-end', () => {
      endRunRef.current()
    })

    return () => {
      unsubClick()
      unsubDestroy()
      unsubEnd()
      sceneRef.current = null
    }
  }, []) // stable — all values read via refs

  // Update click radius on scene whenever attribute changes
  useEffect(() => {
    sceneRef.current?.setClickRadius(attrs['player.clickRadius'] ?? 40)
  }, [attrs])

  // Sync node states and clear scene on run end — runs every render
  useEffect(() => {
    const scene = sceneRef.current
    if (!scene) return
    if (!activeRun) {
      scene.clearAllNodes()
      return
    }
    scene.syncNodeStates(activeRun.nodes)
    scene.updateStats({
      hp: activeRun.hp,
      stability: 100,  // stability no longer changes mid-run; HUD reads from core directly
      torchTime: activeRun.torchTimeRemaining,
    })
  })

  // Sync newly spawned nodes (continuous spawning) to the Pixi scene
  const prevNodeCountRef = useRef(0)
  const nodeCount = activeRun?.nodes.length ?? 0

  useEffect(() => {
    const scene = sceneRef.current
    if (!scene || !activeRun) return
    const prev = prevNodeCountRef.current
    if (activeRun.nodes.length > prev) {
      activeRun.nodes.slice(prev).forEach(node => scene.addNode(node))
    }
    prevNodeCountRef.current = activeRun.nodes.length
  }, [nodeCount, activeRun])

  // Reset node count tracker when run ends
  useEffect(() => {
    if (!activeRun) prevNodeCountRef.current = 0
  }, [activeRun])

  // Game logic tick — always runs so recharge ticks even outside a run
  useGameLoop((delta) => {
    tickDungeon(delta)
  })

  const beginRun = useCallback((dungeonId: string, depth = 1) => {
    const a = attrsRef.current
    startRun(dungeonId, depth, a['player.maxHp'] ?? 10, a['player.torchDuration'] ?? 10)
  }, [startRun])

  return { initBridge, beginRun, activeRun, endRun, sceneRef }
}
