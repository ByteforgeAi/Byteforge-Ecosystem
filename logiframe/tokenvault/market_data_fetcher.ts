export interface TokenDataPoint {
  timestamp: number
  priceUsd: number
  volumeUsd: number
  marketCapUsd: number
}

export interface FetchHistoryOptions {
  limit?: number
  startTime?: number
  endTime?: number
  signal?: AbortSignal
}

export class TokenDataFetcher {
  constructor(private apiBase: string, private apiKey?: string, private timeoutMs: number = 15000) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  /**
   * Fetches an array of TokenDataPoint for the given token symbol
   * Expects endpoint: `${apiBase}/tokens/${symbol}/history`
   */
  async fetchHistory(symbol: string, opts: FetchHistoryOptions = {}): Promise<TokenDataPoint[]> {
    const params = new URLSearchParams()
    if (opts.limit) params.set("limit", String(opts.limit))
    if (opts.startTime) params.set("start", String(opts.startTime))
    if (opts.endTime) params.set("end", String(opts.endTime))

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)

    try {
      const res = await fetch(`${this.apiBase}/tokens/${encodeURIComponent(symbol)}/history?${params.toString()}`, {
        method: "GET",
        headers: this.getHeaders(),
        signal: opts.signal ?? controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) throw new Error(`Failed to fetch history for ${symbol}: ${res.status}`)

      const raw = (await res.json()) as any[]
      return raw.map((r) => ({
        timestamp: (r.time ?? r.timestamp) * 1000,
        priceUsd: Number(r.priceUsd ?? r.price),
        volumeUsd: Number(r.volumeUsd ?? r.volume),
        marketCapUsd: Number(r.marketCapUsd ?? r.marketCap),
      }))
    } finally {
      clearTimeout(timeout)
    }
  }

  /**
   * Utility to fetch the latest data point only
   */
  async fetchLatest(symbol: string): Promise<TokenDataPoint | null> {
    const data = await this.fetchHistory(symbol, { limit: 1 })
    return data.length > 0 ? data[0] : null
  }
}
