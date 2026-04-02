export interface Signal {
  id: string
  type: string
  timestamp: number
  payload: Record<string, any>
  source?: string
  severity?: "low" | "medium" | "high"
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  statusCode?: number
}

/**
 * Simple HTTP client for fetching signals from a signal API
 */
export class SignalApiClient {
  constructor(private baseUrl: string, private apiKey?: string, private timeoutMs: number = 15000) {}

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = { "Content-Type": "application/json" }
    if (this.apiKey) headers["Authorization"] = `Bearer ${this.apiKey}`
    return headers
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs)
    try {
      const res = await fetch(`${this.baseUrl}${path}`, {
        ...options,
        headers: { ...this.getHeaders(), ...(options.headers || {}) },
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (!res.ok) return { success: false, error: `HTTP ${res.status}`, statusCode: res.status }
      const data = (await res.json()) as T
      return { success: true, data, statusCode: res.status }
    } catch (err: any) {
      clearTimeout(timeout)
      return { success: false, error: err.message }
    }
  }

  async fetchAllSignals(): Promise<ApiResponse<Signal[]>> {
    return this.request<Signal[]>("/signals", { method: "GET" })
  }

  async fetchSignalById(id: string): Promise<ApiResponse<Signal>> {
    return this.request<Signal>(`/signals/${encodeURIComponent(id)}`, { method: "GET" })
  }

  async createSignal(signal: Omit<Signal, "id" | "timestamp">): Promise<ApiResponse<Signal>> {
    return this.request<Signal>("/signals", {
      method: "POST",
      body: JSON.stringify({ ...signal }),
    })
  }

  async deleteSignal(id: string): Promise<ApiResponse<null>> {
    return this.request<null>(`/signals/${encodeURIComponent(id)}`, { method: "DELETE" })
  }
}
