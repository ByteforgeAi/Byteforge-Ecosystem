import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Toolkit exposing liquidity-related actions:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – extended utilities for stability and market signal evaluation
 */
export const LIQUIDITY_ANALYSIS_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Extendable registry for liquidity tools
 */
export class LiquidityToolRegistry {
  private registry: Record<string, Toolkit>

  constructor(initial: Record<string, Toolkit> = LIQUIDITY_ANALYSIS_TOOLS) {
    this.registry = { ...initial }
  }

  listKeys(): string[] {
    return Object.keys(this.registry)
  }

  get(key: string): Toolkit | undefined {
    return this.registry[key]
  }

  register(key: string, toolkit: Toolkit): void {
    if (this.registry[key]) {
      throw new Error(`Toolkit with key "${key}" already registered`)
    }
    this.registry[key] = toolkit
  }

  unregister(key: string): void {
    delete this.registry[key]
  }
}

/**
 * Utility: check if a liquidity tool exists
 */
export function hasLiquidityTool(key: string): boolean {
  return Object.prototype.hasOwnProperty.call(LIQUIDITY_ANALYSIS_TOOLS, key)
}
