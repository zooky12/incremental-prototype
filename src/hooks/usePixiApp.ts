import { useEffect, useRef, useState } from 'react'
import { Application } from 'pixi.js'

// Creates and manages a PixiJS Application tied to a container div.
// Returns { appRef, isReady } — isReady becomes true only after app.init() resolves.
//
// Strict Mode problem: cleanup runs immediately, then the effect runs again.
// Solution: mark the container DOM element itself as initialized.
// The container element persists across cleanup/remount cycles in Strict Mode,
// so this acts as a single-init guard that survives cleanup.
export function usePixiApp(containerRef: React.RefObject<HTMLDivElement | null>) {
  const appRef = useRef<Application | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // If this container already has a Pixi app (Strict Mode second invoke), skip
    if (container.dataset.pixiInitialized === 'true') return
    container.dataset.pixiInitialized = 'true'

    let alive = true
    let canvasAppended = false
    const app = new Application()

    app.init({
      width: container.clientWidth || 800,
      height: container.clientHeight || 600,
      backgroundColor: 0x0d0d12,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    }).then(() => {
      if (!alive) {
        // Cleanup ran — canvas was never appended, destroy without removeView
        app.destroy(false, { children: true, texture: true })
        return
      }

      container.appendChild(app.canvas as HTMLCanvasElement)
      canvasAppended = true

      const ro = new ResizeObserver(() => {
        app.renderer.resize(container.clientWidth, container.clientHeight)
      })
      ro.observe(container)
      ;(app as Application & { _ro?: ResizeObserver })._ro = ro

      appRef.current = app
      setIsReady(true)
    })

    return () => {
      alive = false
      setIsReady(false)
      appRef.current = null
      delete container.dataset.pixiInitialized

      // Only destroy if init() already completed
      if (canvasAppended) {
        const ro = (app as Application & { _ro?: ResizeObserver })._ro
        if (ro) ro.disconnect()
        app.destroy({ removeView: true }, { children: true, texture: true })
      }
      // Otherwise .then() above handles destruction when init resolves
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { appRef, isReady }
}
