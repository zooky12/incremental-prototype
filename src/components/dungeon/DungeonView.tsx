import { useRef, useEffect } from 'react'
import { usePixiApp } from '@/hooks/usePixiApp'
import { useDungeonRun } from '@/hooks/useDungeonRun'
import { useActiveRun } from '@/store'
import { DungeonHUD } from './DungeonHUD'
import { CorePanel } from './CorePanel'
import { PixiBridge } from '@/pixi/bridge/PixiBridge'
import { DungeonScene } from '@/pixi/scenes/DungeonScene'
import type { Application as PixiApplication } from 'pixi.js'

export function DungeonView() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { appRef, isReady } = usePixiApp(canvasRef)
  const sceneRef = useRef<DungeonScene | null>(null)
  const bridgeRef = useRef<PixiBridge | null>(null)

  const activeRun = useActiveRun()
  const { beginRun } = useDungeonRun(bridgeRef, sceneRef)

  // Initialize bridge and scene only AFTER app.init() resolves (isReady = true).
  // Also immediately spawn nodes if a run is already active when the scene comes online.
  useEffect(() => {
    if (!isReady) return
    const app = appRef.current
    if (!app || sceneRef.current) return

    const bridge = new PixiBridge()
    const scene = new DungeonScene(app as PixiApplication, bridge)
    bridgeRef.current = bridge
    sceneRef.current = scene

    // If a run was started before the canvas finished initializing, spawn its nodes now
    const currentRun = activeRun
    if (currentRun) {
      scene.spawnNodesFromRun(currentRun)
    }

    return () => {
      scene.destroy()
      bridge.removeAllListeners()
      sceneRef.current = null
      bridgeRef.current = null
    }
    // activeRun intentionally excluded — this effect is for scene creation only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, appRef])

  // Spawn/respawn nodes whenever a NEW run starts (scene already exists at this point)
  useEffect(() => {
    if (!sceneRef.current || !activeRun) return
    sceneRef.current.spawnNodesFromRun(activeRun)
  // Only re-run when a new run starts, not on every tick update
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.startedAt])

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* PixiJS canvas mount point */}
      <div ref={canvasRef} className="absolute inset-0" />

      {/* React HUD overlays (absolute positioned on top of canvas) */}
      <DungeonHUD />
      <CorePanel />

      {/* Start run button when no run is active */}
      {!activeRun && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={() => beginRun('cave_of_roots', 1)}
            className="
              px-8 py-4 rounded-lg text-lg font-bold
              bg-primary/20 hover:bg-primary/30
              text-primary border-2 border-primary/50 hover:border-primary
              shadow-glow transition-all duration-200
            "
          >
            Enter Dungeon
          </button>
        </div>
      )}
    </div>
  )
}
