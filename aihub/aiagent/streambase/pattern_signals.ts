import fetch from "node-fetch"

/*------------------------------------------------------
 * Types
 *----------------------------------------------------*/

interface Candle {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
}

export type CandlestickPattern =
  | "Hammer"
  | "ShootingStar"
  | "BullishEngulfing"
  | "BearishEngulfing"
  | "Doji"

export interface PatternSignal {
  timestamp: number
  pattern: CandlestickPattern
  confidence: number
}

/*------------------------------------------------------
 * Detector
 *----------------------------------------------------*/

export class CandlestickPatternDetector {
  constructor(private readonly apiUrl: string) {}

  /* Fetch recent OHLC candles */
  async fetchCandles(symbol: string, limit = 100): Promise<Candle[]> {
    const res = await fetch(`${this.apiUrl}/markets/${symbol}/candles?limit=${limit}`, {
      timeout: 10_000,
    })
    if (!res.ok) {
      throw new Error(`Failed to fetch candles ${res.status}: ${res.statusText}`)
    }
    const data = (await res.json()) as Candle[]
    return data.filter(this.isValidCandle)
  }

  /* ------------------------- Pattern helpers ---------------------- */

  private isHammer(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const lowerWick = Math.min(c.open, c.close) - c.low
    const range = c.high - c.low || 1
    const ratio = body > 0 ? lowerWick / body : 0
    return ratio > 2 && body / range < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isShootingStar(c: Candle): number {
    const body = Math.abs(c.close - c.open)
    const upperWick = c.high - Math.max(c.open, c.close)
    const range = c.high - c.low || 1
    const ratio = body > 0 ? upperWick / body : 0
    return ratio > 2 && body / range < 0.3 ? Math.min(ratio / 3, 1) : 0
  }

  private isBullishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close > curr.open &&
      prev.close < prev.open &&
      curr.close > prev.open &&
      curr.open < prev.close
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isBearishEngulfing(prev: Candle, curr: Candle): number {
    const cond =
      curr.close < curr.open &&
      prev.close > prev.open &&
      curr.open > prev.close &&
      curr.close < prev.open
    if (!cond) return 0
    const bodyPrev = Math.abs(prev.close - prev.open)
    const bodyCurr = Math.abs(curr.close - curr.open)
    return bodyPrev > 0 ? Math.min(bodyCurr / bodyPrev, 1) : 0.8
  }

  private isDoji(c: Candle): number {
    const range = c.high - c.low
    const body = Math.abs(c.close - c.open)
    const ratio = range > 0 ? body / range : 1
    return ratio < 0.1 ? 1 - ratio * 10 : 0
  }

  /* ------------------------- Validation & Utils ---------------------- */

  private isValidCandle = (c: Candle): boolean => {
    return (
      Number.isFinite(c.timestamp) &&
      Number.isFinite(c.open) &&
      Number.isFinite(c.high) &&
      Number.isFinite(c.low) &&
      Number.isFinite(c.close) &&
      c.high >= Math.max(c.open, c.close) &&
      c.low <= Math.min(c.open, c.close)
    )
  }

  private sma(values: number[], period: number): number[] {
    if (period <= 0) throw new Error("SMA period must be > 0")
    const out: number[] = []
    let sum = 0
    for (let i = 0; i < values.length; i++) {
      sum += values[i]
      if (i >= period) sum -= values[i - period]
      if (i >= period - 1) out.push(sum / period)
    }
    return out
  }

  private pushSignal(
    acc: PatternSignal[],
    next: PatternSignal,
    minConfidence: number
  ): void {
    if (next.confidence >= minConfidence) acc.push(next)
  }

  /* ------------------------- Public API ---------------------- */

  /**
   * Detects candlestick patterns across a candle series
   */
  detectPatterns(
    candles: Candle[],
    options?: { minConfidence?: number }
  ): PatternSignal[] {
    const minConfidence = options?.minConfidence ?? 0.5
    const signals: PatternSignal[] = []

    for (let i = 0; i < candles.length; i++) {
      const c = candles[i]
      const prev = i > 0 ? candles[i - 1] : undefined

      // Single-candle patterns
      const hammer = this.isHammer(c)
      if (hammer > 0) {
        this.pushSignal(signals, { timestamp: c.timestamp, pattern: "Hammer", confidence: hammer }, minConfidence)
      }

      const shooting = this.isShootingStar(c)
      if (shooting > 0) {
        this.pushSignal(signals, { timestamp: c.timestamp, pattern: "ShootingStar", confidence: shooting }, minConfidence)
      }

      const doji = this.isDoji(c)
      if (doji > 0) {
        this.pushSignal(signals, { timestamp: c.timestamp, pattern: "Doji", confidence: doji }, minConfidence)
      }

      // Two-candle patterns
      if (prev) {
        const bull = this.isBullishEngulfing(prev, c)
        if (bull > 0) {
          this.pushSignal(signals, { timestamp: c.timestamp, pattern: "BullishEngulfing", confidence: bull }, minConfidence)
        }

        const bear = this.isBearishEngulfing(prev, c)
        if (bear > 0) {
          this.pushSignal(signals, { timestamp: c.timestamp, pattern: "BearishEngulfing", confidence: bear }, minConfidence)
        }
      }
    }

    return signals
  }

  /**
   * Provides latest signals with optional trend filter based on SMA
   */
  latestSignals(
    candles: Candle[],
    options?: { lookback?: number; minConfidence?: number; trendPeriod?: number }
  ): PatternSignal[] {
    const lookback = options?.lookback ?? 50
    const minConfidence = options?.minConfidence ?? 0.5
    const trendPeriod = options?.trendPeriod ?? 10

    const slice = candles.slice(-lookback)
    const closes = slice.map(c => c.close)
    const trend = this.sma(closes, Math.min(trendPeriod, closes.length))
    const isUptrend = trend.length > 1 ? trend[trend.length - 1] > trend[trend.length - 2] : false

    const signals = this.detectPatterns(slice, { minConfidence })

    // Optional post-filter: if uptrend, prefer bullish patterns; if downtrend, prefer bearish
    return signals.filter(s => {
      if (isUptrend) {
        return s.pattern === "Hammer" || s.pattern === "BullishEngulfing" || s.pattern === "Doji"
      } else {
        return s.pattern === "ShootingStar" || s.pattern === "BearishEngulfing" || s.pattern === "Doji"
      }
    })
  }

  /**
   * High-level helper: fetch + detect in one call
   */
  async analyzeSymbol(
    symbol: string,
    options?: { limit?: number; minConfidence?: number; lookback?: number; trendPeriod?: number }
  ): Promise<PatternSignal[]> {
    const candles = await this.fetchCandles(symbol, options?.limit ?? 150)
    return this.latestSignals(candles, {
      lookback: options?.lookback ?? 80,
      minConfidence: options?.minConfidence ?? 0.6,
      trendPeriod: options?.trendPeriod ?? 14,
    })
  }
}
