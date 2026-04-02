;(async () => {
  const SOLANA_RPC = process.env.SOLANA_RPC || "https://solana.rpc"
  const DEX_API = process.env.DEX_API || "https://dex.api"
  const MINT = process.env.TOKEN_MINT || "MintPubkeyHere"
  const MARKET = process.env.MARKET_PUBKEY || "MarketPubkeyHere"

  const activityAnalyzer = new TokenActivityAnalyzer(SOLANA_RPC)
  const depthAnalyzer = new TokenDepthAnalyzer(DEX_API, MARKET)
  const engine = new ExecutionEngine()
  const signer = new SigningEngine()

  function assertTruthy<T>(val: T | null | undefined, msg: string): T {
    if (val === null || val === undefined) throw new Error(msg)
    return val as T
  }

  async function timed<T>(label: string, fn: () => Promise<T>): Promise<T> {
    const start = Date.now()
    try {
      const result = await fn()
      const ms = Date.now() - start
      console.log(`[step:${label}] ${ms}ms`)
      return result
    } catch (err) {
      const ms = Date.now() - start
      console.error(`[step:${label}] failed in ${ms}ms`, err)
      throw err
    }
  }

  try {
    // 1) Analyze activity
    const records = await timed("activity", async () => {
      const r = await activityAnalyzer.analyzeActivity(MINT, 20)
      if (!Array.isArray(r) || r.length === 0) {
        throw new Error("No activity records returned")
      }
      return r
    })

    // 2) Analyze depth
    const depthMetrics = await timed("depth", async () => {
      const d = await depthAnalyzer.analyze(30)
      return assertTruthy(d, "Depth analysis returned no data")
    })

    // 3) Detect patterns
    const volumesRaw = records.map(r => Number((r as any).amount))
    const volumes = volumesRaw.filter(v => Number.isFinite(v) && v >= 0)
    if (volumes.length === 0) throw new Error("No valid volumes to analyze")

    const patterns = await timed("patterns", async () => {
      const pts = detectVolumePatterns(volumes, 5, 100)
      return Array.isArray(pts) ? pts : []
    })

    // 4) Execute a custom task
    engine.register("report", async (params) => ({
      records: Array.isArray(params.records) ? params.records.length : 0,
      hasPatterns: patterns.length > 0,
      depthSummary: {
        keys: Object.keys(depthMetrics ?? {}),
      },
    }))
    engine.enqueue("task1", "report", { records })
    const taskResults = await timed("tasks", () => engine.runAll())

    // 5) Sign the results
    const payload = JSON.stringify(
      { depthMetrics, patterns, taskResults },
      null,
      2
    )

    const signature = await timed("sign", () => signer.sign(payload))
    const signatureValid = await timed("verify", () => signer.verify(payload, signature))
    if (!signatureValid) throw new Error("Signature verification failed")

    const summary = {
      activityRecords: records.length,
      patternsCount: patterns.length,
      taskResultsCount: taskResults.length,
      signatureValid,
    }

    console.log("[summary]", summary)
    console.log("[output]", { records, depthMetrics, patterns, taskResults })
  } catch (err) {
    console.error("[pipeline:error]", (err as Error)?.message || err)
    process.exitCode = 1
  }
})()
