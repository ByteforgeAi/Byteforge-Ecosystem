export interface VolumePoint {
  timestamp: number
  volumeUsd: number
}

export interface SpikeEvent {
  timestamp: number
  volume: number
  spikeRatio: number
  avgWindow?: number
  windowStart?: number
  windowEnd?: number
}

/**
 * Detects spikes in trading volume compared to a rolling average window
 */
export function detectVolumeSpikes(
  points: VolumePoint[],
  windowSize: number = 10,
  spikeThreshold: number = 2.0
): SpikeEvent[] {
  const events: SpikeEvent[] = []
  const volumes = points.map((p) => p.volumeUsd)

  for (let i = windowSize; i < volumes.length; i++) {
    const window = volumes.slice(i - windowSize, i)
    const avg = window.reduce((sum, v) => sum + v, 0) / (window.length || 1)
    const curr = volumes[i]
    const ratio = avg > 0 ? curr / avg : Infinity

    if (ratio >= spikeThreshold) {
      events.push({
        timestamp: points[i].timestamp,
        volume: curr,
        spikeRatio: Math.round(ratio * 100) / 100,
        avgWindow: Math.round(avg * 100) / 100,
        windowStart: points[i - windowSize].timestamp,
        windowEnd: points[i - 1].timestamp,
      })
    }
  }
  return events
}

/**
 * Returns the latest detected spike event or null
 */
export function latestVolumeSpike(
  points: VolumePoint[],
  windowSize = 10,
  spikeThreshold = 2.0
): SpikeEvent | null {
  const events = detectVolumeSpikes(points, windowSize, spikeThreshold)
  return events.length > 0 ? events[events.length - 1] : null
}

/**
 * Calculates the average volume across all points
 */
export function averageVolume(points: VolumePoint[]): number {
  if (points.length === 0) return 0
  const sum = points.reduce((acc, p) => acc + p.volumeUsd, 0)
  return Math.round((sum / points.length) * 100) / 100
}
