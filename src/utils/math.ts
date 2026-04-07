export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value))

export const lerp = (a: number, b: number, t: number): number =>
  a + (b - a) * clamp(t, 0, 1)

export const rollChance = (chance: number): boolean =>
  Math.random() < chance

/** Roll a drop table, returns all items that dropped */
export function rollDropTable(
  table: Array<{ resourceId: string; chance: number; quantity: number }>
): Record<string, number> {
  const result: Record<string, number> = {}
  for (const entry of table) {
    if (rollChance(entry.chance)) {
      result[entry.resourceId] = (result[entry.resourceId] ?? 0) + entry.quantity
    }
  }
  return result
}

export function formatNumber(n: number): string {
  if (n < 1_000) return n.toFixed(0)
  if (n < 1_000_000) return (n / 1_000).toFixed(1) + 'k'
  if (n < 1_000_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  return (n / 1_000_000_000).toFixed(1) + 'B'
}

/** Resolve a dot-path string into a nested object value */
export function resolvePath(obj: Record<string, unknown>, path: string): number {
  const parts = path.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return 0
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'number' ? current : 0
}

/** Set a dot-path on a nested object (mutates) */
export function setPath(obj: Record<string, unknown>, path: string, value: number): void {
  const parts = path.split('.')
  let current: Record<string, unknown> = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (typeof current[parts[i]] !== 'object') {
      current[parts[i]] = {}
    }
    current = current[parts[i]] as Record<string, unknown>
  }
  current[parts[parts.length - 1]] = value
}

/** Normalize angle to [0, 2*PI] */
export const normalizeAngle = (angle: number): number =>
  ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
