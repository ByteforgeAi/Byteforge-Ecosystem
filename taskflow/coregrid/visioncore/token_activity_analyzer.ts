/**
 * Analyze on-chain token activity: fetches recent activity and summarizes transfers
 */

type JsonRpcMethod =
  | "getSignaturesForAddress"
  | "getTransaction"

interface JsonRpcRequest {
  jsonrpc: "2.0"
  id: number
  method: JsonRpcMethod
  params: any[]
}

interface JsonRpcResponse<T> {
  jsonrpc: "2.0"
  id: number
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

export interface ActivityRecord {
  timestamp: number
  signature: string
  source: string
  destination: string
  amount: number
}

export interface TokenActivityAnalyzerOptions {
  timeoutMs?: number
  retries?: number
  concurrency?: number
}

type SignatureInfo = {
  signature: string
  blockTime?: number | null
}

type ParsedTokenBalance = {
  accountIndex: number
  mint: string
  owner?: string | null
  uiTokenAmount: {
    uiAmount?: number | null
    uiAmountString?: string
    amount?: string
    decimals?: number
  }
}

type TransactionMeta = {
  preTokenBalances?: ParsedTokenBalance[]
  postTokenBalances?: ParsedTokenBalance[]
}

type ParsedTransaction = {
  blockTime?: number | null
  meta?: TransactionMeta | null
}

export class TokenActivityAnalyzer {
  private idCounter = 1
  private readonly timeoutMs: number
  private readonly retries: number
  private readonly concurrency: number

  constructor(private rpcEndpoint: string, opts: TokenActivityAnalyzerOptions = {}) {
    this.timeoutMs = opts.timeoutMs ?? 15000
    this.retries = opts.retries ?? 1
    this.concurrency = Math.max(1, opts.concurrency ?? 4)
  }

  private nextId(): number {
    return this.idCounter++
  }

  private async rpcCall<T>(method: JsonRpcMethod, params: any[]): Promise<T> {
    let lastErr: unknown = null
    for (let attempt = 0; attempt < this.retries; attempt++) {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.timeoutMs)
      try {
        const payload: JsonRpcRequest = {
          jsonrpc: "2.0",
          id: this.nextId(),
          method,
          params,
        }
        const res = await fetch(this.rpcEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        })
        clearTimeout(timer)
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status}: ${await res.text()}`)
          continue
        }
        const json = (await res.json()) as JsonRpcResponse<T>
        if (json.error) {
          lastErr = new Error(`RPC ${json.error.code}: ${json.error.message}`)
          continue
        }
        if (json.result === undefined) {
          lastErr = new Error("RPC result is undefined")
          continue
        }
        return json.result
      } catch (e) {
        lastErr = e
      } finally {
        clearTimeout(timer)
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
  }

  /**
   * Fetch recent signatures via JSON-RPC getSignaturesForAddress
   */
  async fetchRecentSignatures(mint: string, limit = 100): Promise<SignatureInfo[]> {
    const params = [
      mint,
      {
        limit,
        maxSupportedTransactionVersion: 0,
      },
    ]
    return this.rpcCall<SignatureInfo[]>("getSignaturesForAddress", params)
  }

  private numberFromUiAmount(x: {
    uiAmount?: number | null
    uiAmountString?: string
    amount?: string
    decimals?: number
  }): number {
    if (typeof x.uiAmount === "number") return x.uiAmount
    if (x.uiAmountString) return Number(x.uiAmountString)
    if (x.amount != null && typeof x.decimals === "number") {
      const n = Number(x.amount)
      const d = x.decimals
      return d > 0 ? n / 10 ** d : n
    }
    return 0
  }

  private pickOwner(b: ParsedTokenBalance | undefined): string {
    if (!b) return "unknown"
    return b.owner ?? "unknown"
  }

  private extractTransfers(tx: ParsedTransaction, sig: string): ActivityRecord[] {
    const meta = tx.meta ?? {}
    const pre = meta.preTokenBalances ?? []
    const post = meta.postTokenBalances ?? []
    const out: ActivityRecord[] = []

    // Index pre balances by accountIndex for stable pairing
    const preByIndex = new Map<number, ParsedTokenBalance>()
    for (const pb of pre) {
      preByIndex.set(pb.accountIndex, pb)
    }

    const ts = (tx.blockTime ?? 0) * 1000

    for (const p of post) {
      const q =
        preByIndex.get(p.accountIndex) ||
        pre.find((b) => b.owner === p.owner && b.mint === p.mint)

      const pAmt = this.numberFromUiAmount(p.uiTokenAmount)
      const qAmt = q ? this.numberFromUiAmount(q.uiTokenAmount) : 0
      const delta = pAmt - qAmt

      if (delta !== 0) {
        out.push({
          timestamp: ts,
          signature: sig,
          source: this.pickOwner(q),
          destination: this.pickOwner(p),
          amount: Math.abs(delta),
        })
      }
    }

    return out
  }

  /**
   * Analyze activity for a given mint:
   * - fetch recent signatures
   * - fetch each transaction (jsonParsed)
   * - compute token transfer deltas per owner
   */
  async analyzeActivity(mint: string, limit = 50): Promise<ActivityRecord[]> {
    const sigInfos = await this.fetchRecentSignatures(mint, limit)
    const sigs = sigInfos.slice(0, limit).map((s) => s.signature)

    const results: ActivityRecord[] = []
    const queue = [...sigs]

    const worker = async () => {
      while (queue.length) {
        const sig = queue.shift() as string
        try {
          const tx = await this.rpcCall<ParsedTransaction>("getTransaction", [
            sig,
            { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 },
          ])
          results.push(...this.extractTransfers(tx, sig))
        } catch {
          // skip failed transaction fetch
        }
      }
    }

    const workers = Array.from({ length: this.concurrency }, () => worker())
    await Promise.all(workers)

    return results.sort((a, b) => a.timestamp - b.timestamp)
  }

  /**
   * Summarize transfers by address
   */
  summarize(records: ActivityRecord[]): {
    total: number
    bySource: Record<string, number>
    byDestination: Record<string, number>
  } {
    const bySource: Record<string, number> = {}
    const byDestination: Record<string, number> = {}
    let total = 0

    for (const r of records) {
      total += r.amount
      bySource[r.source] = (bySource[r.source] ?? 0) + r.amount
      byDestination[r.destination] = (byDestination[r.destination] ?? 0) + r.amount
    }

    return { total, bySource, byDestination }
  }
}
