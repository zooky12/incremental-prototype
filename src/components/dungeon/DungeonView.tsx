import { useRef, useEffect } from 'react'
import { usePixiApp } from '@/hooks/usePixiApp'
import { useDungeonRun } from '@/hooks/useDungeonRun'
import { useActiveRun, useCores } from '@/store'
import { DungeonHUD } from './DungeonHUD'
import { CorePanel } from './CorePanel'
import { PixiBridge } from '@/pixi/bridge/PixiBridge'
import { DungeonScene } from '@/pixi/scenes/DungeonScene'
import { getDungeonById } from '@/utils/configLoader'
import type { Application as PixiApplication } from 'pixi.js'

export function DungeonView() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const { appRef, isReady } = usePixiApp(canvasRef)
  const sceneLocalRef = useRef<DungeonScene | null>(null)

  const activeRun = useActiveRun()
  const cores     = useCores()
  const { initBridge, beginRun, endRun } = useDungeonRun()

  const insideDungeon = activeRun !== null

  // Entry guard logic
  const manualCore   = cores.find(c => c.zone === 'manual')
  const dungeon      = getDungeonById('cave_of_roots')
  const canEnter     = !!manualCore
    && manualCore.stability > 0
    && manualCore.energy >= (dungeon?.energyPerRun ?? 0)

  let disabledReason = ''
  if (!manualCore)                                         disabledReason = 'Add a core to the Manual zone to enter'
  else if (manualCore.stability <= 0)                      disabledReason = 'Dungeon is unstable — recover stability first'
  else if (manualCore.energy < (dungeon?.energyPerRun ?? 0)) disabledReason = 'Dungeon is exhausted — move to Recharge zone'

  // Create bridge + scene after PixiJS initializes, then register event handlers
  useEffect(() => {
    if (!isReady) return
    const app = appRef.current
    if (!app || sceneLocalRef.current) return

    const bridge = new PixiBridge()
    const scene  = new DungeonScene(app as PixiApplication, bridge)
    sceneLocalRef.current = scene

    const cleanupHandlers = initBridge(bridge, scene)

    if (activeRun) scene.spawnNodesFromRun(activeRun)

    return () => {
      cleanupHandlers()
      scene.destroy()
      bridge.removeAllListeners()
      sceneLocalRef.current = null
    }
    // activeRun intentionally excluded — this effect is for scene creation only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, appRef, initBridge])

  // Spawn nodes whenever a NEW run starts (scene already exists)
  useEffect(() => {
    if (!sceneLocalRef.current || !activeRun) return
    sceneLocalRef.current.spawnNodesFromRun(activeRun)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRun?.startedAt])

  return (
    <div className="relative w-full h-full flex flex-col">
      {/* PixiJS canvas mount point */}
      <div ref={canvasRef} className="absolute inset-0" />

      {/* HUD — visible when inside dungeon */}
      {insideDungeon && <DungeonHUD />}

      {/* Core panel — visible when NOT inside dungeon */}
      {!insideDungeon && <CorePanel />}

      {/* Inside: Exit Dungeon button */}
      {insideDungeon && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <button
            onClick={() => endRun()}
            className="
              px-6 py-2.5 rounded-lg text-sm font-bold
              bg-danger/20 hover:bg-danger/30
              text-danger border-2 border-danger/50 hover:border-danger
              transition-all duration-150
            "
          >
            Exit Dungeon
          </button>
        </div>
      )}

      {/* Outside: Enter Dungeon button */}
      {!insideDungeon && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto flex flex-col items-center gap-2">
            <button
              onClick={() => canEnter && beginRun('cave_of_roots', 1)}
              disabled={!canEnter}
              className={`
                px-8 py-4 rounded-lg text-lg font-bold transition-all duration-200
                ${canEnter
                  ? 'bg-primary/20 hover:bg-primary/30 text-primary border-2 border-primary/50 hover:border-primary shadow-glow cursor-pointer'
                  : 'bg-surface/50 text-muted border-2 border-border cursor-not-allowed opacity-60'
                }
              `}
            >
              Enter Dungeon
            </button>
            {!canEnter && disabledReason && (
              <p className="text-xs text-muted">{disabledReason}</p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
