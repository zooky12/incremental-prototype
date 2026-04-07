import { useEffect, useRef } from 'react'

// Drives the game logic tick via requestAnimationFrame.
// delta is in seconds. Separate from Pixi's ticker so game logic
// can be paused/serialized without affecting visual rendering.
export function useGameLoop(onTick: (delta: number) => void) {
  const callbackRef = useRef(onTick)
  callbackRef.current = onTick

  useEffect(() => {
    let lastTime = performance.now()
    let rafId: number

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1) // cap at 100ms
      lastTime = now
      callbackRef.current(delta)
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [])
}
