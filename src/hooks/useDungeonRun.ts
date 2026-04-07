import { useEffect, useRef, useCallback } from 'react'
import { useGameStore } from '@/store'
import { useGameLoop } from './useGameLoop'
import type { PixiBridge } from '@/pixi/bridge/PixiBridge'
import type { DungeonScene } from '@/pixi/scenes/DungeonScene'

// Manages the dungeon run lifecycle and wires the PixiBridge
// between PixiJS canvas events and the Zustand store.
export function useDungeonRun(
  bridgeRef: React.RefObject<PixiBridge | null>,
  sceneRef: React.RefObject<DungeonScene | null>
) {
  const startRun = useGameStore(s => s.startRun)
  const endRun = useGameStore(s => s.endRun)
  const clickNode = useGameStore(s => s.clickNode)
  const tickDungeon = useGameStore(s => s.tickDungeon)
  const activeRun = useGameStore(s => s.activeRun)

  // Wire bridge events → store actions
  useEffect(() => {
    const bridge = bridgeRef.current
    if (!bridge) return

    const unsubClick = bridge.on('node-clicked', ({ nodeId, nodeType, x, y }) => {
      const result = clickNode(nodeId)

      // Tell the scene to play FX at node position
      if (sceneRef.current) {
        sceneRef.current.onNodeClicked(nodeId, result)
      }
    })

    const unsubEnd = bridge.on('run-end', () => {
      endRun()
    })

    return () => {
      unsubClick()
      unsubEnd()
    }
  }, [bridgeRef, sceneRef, clickNode, endRun])

  // Sync HP and stability from store → scene on every render
  useEffect(() => {
    if (!sceneRef.current || !activeRun) return
    sceneRef.current.updateStats({
      hp: activeRun.hp,
      stability: activeRun.stability,
      torchTime: activeRun.torchTimeRemaining,
    })
  })

  // Game logic tick
  useGameLoop((delta) => {
    if (activeRun) {
      tickDungeon(delta)
    }
  })

  const beginRun = useCallback((dungeonId: string, depth = 1) => {
    startRun(dungeonId, depth)
  }, [startRun])

  return { beginRun, activeRun }
}
