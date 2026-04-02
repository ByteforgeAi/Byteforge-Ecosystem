export interface LaunchConfig {
  contractName: string
  parameters: Record<string, any>
  deployEndpoint: string
  apiKey?: string
  network?: string
  retries?: number
  timeoutMs?: number
}

export interface LaunchResult {
  success: boolean
  address?: string
  transactionHash?: string
  error?: string
  rawResponse?: unknown
}

export class LaunchNode {
  constructor(private config: LaunchConfig) {}

  async deploy(): Promise<LaunchResult> {
    const { deployEndpoint, apiKey, contractName, parameters, retries = 1, timeoutMs = 15000 } = this.config

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), timeoutMs)

        const res = await fetch(deployEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          },
          body: JSON.stringify({ contractName, parameters }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!res.ok) {
          const text = await res.text()
          if (attempt < retries - 1) continue
          return { success: false, error: `HTTP ${res.status}: ${text}` }
        }

        const json = await res.json()
        return {
          success: true,
          address: json.contractAddress,
          transactionHash: json.txHash,
          rawResponse: json,
        }
      } catch (err: any) {
        if (attempt < retries - 1) continue
        return { success: false, error: err?.message ?? "Unknown error" }
      }
    }

    return { success: false, error: "Max retries exceeded" }
  }
}
