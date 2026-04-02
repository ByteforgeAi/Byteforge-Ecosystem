import type { TokenMetrics } from "./tokenAnalysisCalculator"

export interface IframeConfig {
  containerId: string
  srcUrl: string
  metrics: TokenMetrics
  refreshIntervalMs?: number
  allowFullscreen?: boolean
  sandbox?: string
  className?: string
}

export class TokenAnalysisIframe {
  private iframeEl: HTMLIFrameElement | null = null
  private refreshTimer: number | null = null

  constructor(private config: IframeConfig) {}

  init(): void {
    const container = document.getElementById(this.config.containerId)
    if (!container) throw new Error("Container not found: " + this.config.containerId)

    const iframe = document.createElement("iframe")
    iframe.src = this.config.srcUrl
    iframe.width = "100%"
    iframe.height = "100%"
    iframe.setAttribute("frameBorder", "0")

    if (this.config.allowFullscreen) {
      iframe.setAttribute("allowFullscreen", "true")
    }
    if (this.config.sandbox) {
      iframe.setAttribute("sandbox", this.config.sandbox)
    }
    if (this.config.className) {
      iframe.className = this.config.className
    }

    iframe.onload = () => this.postMetrics()
    container.appendChild(iframe)
    this.iframeEl = iframe

    if (this.config.refreshIntervalMs) {
      this.refreshTimer = window.setInterval(() => this.postMetrics(), this.config.refreshIntervalMs)
    }
  }

  private postMetrics(): void {
    if (!this.iframeEl?.contentWindow) return
    this.iframeEl.contentWindow.postMessage(
      { type: "TOKEN_ANALYSIS_METRICS", payload: this.config.metrics, ts: Date.now() },
      "*"
    )
    console.debug("Posted metrics to iframe:", this.config.metrics)
  }

  updateMetrics(metrics: TokenMetrics): void {
    this.config.metrics = metrics
    this.postMetrics()
  }

  destroy(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer)
      this.refreshTimer = null
    }
    if (this.iframeEl) {
      this.iframeEl.remove()
      this.iframeEl = null
    }
  }
}
