export interface PricePoint {
  timestamp: number
  priceUsd: number
  volumeUsd?: number
}

export interface TrendResult {
  startTime: number
  endTime: number
  trend: "upward" | "downward" | "neutral"
  changePct: number
  avgPrice?: number
  maxPrice?: number
  minPrice?: number
  pointsCount?: number
}

/**
 * Analyze a series of price points to determine overall trend segments
 */
export function analyzePriceTrends(
  points: PricePoint[],
  minSegmentLength: number = 5
): TrendResult[] {
  const results: TrendResult[] = []
  if (points.length < minSegmentLength) return results

  let segStart = 0
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1].priceUsd
    const curr = points[i].priceUsd
    const direction = curr > prev ? 1 : curr < prev ? -1 : 0

    // check if direction changes or segment length reached
    if (
      i - segStart >= minSegmentLength &&
      (i === points.length - 1 ||
        (direction === 1 && points[i + 1].priceUsd < curr) ||
        (direction === -1 && points[i + 1].priceUsd > curr))
    ) {
      const segment = points.slice(segStart, i + 1)
      const start = segment[0]
      const end = segment[segment.length - 1]
      const changePct = ((end.priceUsd - start.priceUsd) / start.priceUsd) * 100

      const prices = segment.map((p) => p.priceUsd)
      const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length
      const maxPrice = Math.max(...prices)
      const minPrice = Math.min(...prices)

      results.push({
        startTime: start.timestamp,
        endTime: end.timestamp,
        trend: changePct > 0 ? "upward" : changePct < 0 ? "downward" : "neutral",
        changePct: Math.round(changePct * 100) / 100,
        avgPrice: Math.round(avgPrice * 100) / 100,
        maxPrice,
        minPrice,
        pointsCount: segment.length,
      })
      segStart = i
    }
  }
  return results
}

/**
 * Utility: get the most recent trend
 */
export function latestTrend(points: PricePoint[], minSegmentLength = 5): TrendResult | null {
  const trends = analyzePriceTrends(points, minSegmentLength)
  return trends.length > 0 ? trends[trends.length - 1] : null
}

/**
 * Utility: summarize overall change in dataset
 */
export function summarizeChange(points: PricePoint[]): number {
  if (points.length < 2) return 0
  const start = points[0].priceUsd
  const end = points[points.length - 1].priceUsd
  return Math.round(((end - start) / start) * 10000) / 100
}
