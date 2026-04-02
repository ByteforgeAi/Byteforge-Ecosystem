/**
 * Analyze on-chain orderbook depth for a given market
 */
export interface Order {
  price: number
  size: number
}

export interface DepthMetrics {
  averageBidDepth: number
  averageAskDepth: number
  spread: number
  midPrice?: number
  bidAskImbalance?: number
  vwapBid?: number
  vwapAsk?: number
}

export interface TokenDepthAnalyzerOptions {
  timeoutMs?: number
  retries?: number
}

interface OrderbookResponse {
  bids: Order[]
  asks: Order[]
}

export class TokenDepthAnalyzer {
  private readonly timeoutMs: number
  private readonly retries: number

  constructor(
    private rpcEndpoint: string,
    private marketId: string,
    opts: TokenDepthAnalyzerOptions = {}
  ) {
    this.timeoutMs = opts.timeoutMs ?? 15000
    this.retries = Math.max(1, opts.retries ?? 1)
  }

  private async fetchWithTimeout(input: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      return await fetch(input, { ...(init || {}), signal: controller.signal })
    } finally {
      clearTimeout(timer)
    }
  }

  private isValidOrder(o: any): o is Order {
    return o && Number.isFinite(o.price) && Number.isFinite(o.size)
  }

  async fetchOrderbook(depth = 50): Promise<{ bids: Order[]; asks: Order[] }> {
    const url = `${this.rpcEndpoint}/orderbook/${this.marketId}?depth=${depth}`
    let lastErr: unknown = null

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const res = await this.fetchWithTimeout(url, { method: "GET" })
        if (!res.ok) throw new Error(`Orderbook fetch failed: ${res.status} ${res.statusText}`)
        const raw = (await res.json()) as OrderbookResponse

        const bids = Array.isArray(raw.bids) ? raw.bids.filter(this.isValidOrder) : []
        const asks = Array.isArray(raw.asks) ? raw.asks.filter(this.isValidOrder) : []

        return { bids, asks }
      } catch (e) {
        lastErr = e
        if (attempt === this.retries - 1) break
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  private averageSize(arr: Order[]): number {
    if (arr.length === 0) return 0
    const sum = arr.reduce((s, o) => s + o.size, 0)
    return sum / arr.length
  }

  private vwap(orders: Order[]): number {
    if (orders.length === 0) return 0
    const notional = orders.reduce((s, o) => s + o.price * o.size, 0)
    const qty = orders.reduce((s, o) => s + o.size, 0)
    return qty > 0 ? notional / qty : 0
  }

  async analyze(depth = 50): Promise<DepthMetrics> {
    const { bids, asks } = await this.fetchOrderbook(depth)

    // Ensure best prices (assuming arrays are sorted best-first by the API)
    const bestBid = bids[0]?.price ?? 0
    const bestAsk = asks[0]?.price ?? 0
    const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0
    const midPrice = spread > 0 ? (bestAsk + bestBid) / 2 : 0

    const averageBidDepth = this.averageSize(bids)
    const averageAskDepth = this.averageSize(asks)

    const totalBid = bids.reduce((s, o) => s + o.size, 0)
    const totalAsk = asks.reduce((s, o) => s + o.size, 0)
    const denom = totalBid + totalAsk
    const bidAskImbalance = denom > 0 ? (totalBid - totalAsk) / denom : 0

    const vwapBid = this.vwap(bids)
    const vwapAsk = this.vwap(asks)

    return {
      averageBidDepth,
      averageAskDepth,
      spread,
      midPrice,
      bidAskImbalance,
      vwapBid,
      vwapAsk,
    }
  }
}
