/**
 * Detect volume-based patterns in a series of activity amounts
 */
export interface PatternMatch {
  index: number
  window: number
  average: number
  max?: number
  min?: number
  stddev?: number
}

function calcStdDev(values: number[]): number {
  if (values.length === 0) return 0
  const mean = values.reduce((a, b) => a + b, 0) / values.length
  const variance =
    values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length
  return Math.sqrt(variance)
}

export function detectVolumePatterns(
  volumes: number[],
  windowSize: number,
  threshold: number
): PatternMatch[] {
  const matches: PatternMatch[] = []
  for (let i = 0; i + windowSize <= volumes.length; i++) {
    const slice = volumes.slice(i, i + windowSize)
    const avg = slice.reduce((a, b) => a + b, 0) / windowSize
    if (avg >= threshold) {
      matches.push({
        index: i,
        window: windowSize,
        average: Math.round(avg * 100) / 100,
        max: Math.max(...slice),
        min: Math.min(...slice),
        stddev: Math.round(calcStdDev(slice) * 100) / 100,
      })
    }
  }
  return matches
}

/**
 * Utility: returns the strongest match (highest average)
 */
export function strongestPattern(matches: PatternMatch[]): PatternMatch | null {
  if (matches.length === 0) return null
  return matches.reduce((a, b) => (b.average > a.average ? b : a))
}

/**
 * Utility: checks if any match exceeds an extreme threshold
 */
export function hasExtremePattern(
  matches: PatternMatch[],
  extremeThreshold: number
): boolean {
  return matches.some((m) => (m.max ?? 0) >= extremeThreshold)
}
