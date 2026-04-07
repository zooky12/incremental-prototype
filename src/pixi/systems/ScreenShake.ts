import type { Container } from 'pixi.js'

// Applies a decaying offset to a container for screen shake effect.
export class ScreenShake {
  private intensity = 0
  private decay: number
  private target: Container

  constructor(target: Container, decay = 0.88) {
    this.target = target
    this.decay = decay
  }

  shake(intensity: number) {
    this.intensity = Math.max(this.intensity, intensity)
  }

  tick(_delta: number) {
    if (this.intensity < 0.1) {
      this.target.x = 0
      this.target.y = 0
      this.intensity = 0
      return
    }

    const dx = (Math.random() - 0.5) * this.intensity * 2
    const dy = (Math.random() - 0.5) * this.intensity * 2
    this.target.x = dx
    this.target.y = dy
    this.intensity *= this.decay
  }
}
