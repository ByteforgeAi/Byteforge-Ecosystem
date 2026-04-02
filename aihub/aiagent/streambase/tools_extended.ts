import { toolkitBuilder } from "@/ai/core"
import { FETCH_POOL_DATA_KEY } from "@/ai/modules/liquidity/pool-fetcher/key"
import { ANALYZE_POOL_HEALTH_KEY } from "@/ai/modules/liquidity/health-checker/key"
import { FetchPoolDataAction } from "@/ai/modules/liquidity/pool-fetcher/action"
import { AnalyzePoolHealthAction } from "@/ai/modules/liquidity/health-checker/action"

type Toolkit = ReturnType<typeof toolkitBuilder>

/**
 * Extended toolkit exposing liquidity-related actions:
 * – fetch raw pool data
 * – run health / risk analysis on a liquidity pool
 * – support dynamic extension with more modules
 */
export const EXTENDED_LIQUIDITY_TOOLS: Record<string, Toolkit> = Object.freeze({
  [`liquidityscan-${FETCH_POOL_DATA_KEY}`]: toolkitBuilder(new FetchPoolDataAction()),
  [`poolhealth-${ANALYZE_POOL_HEALTH_KEY}`]: toolkitBuilder(new AnalyzePoolHealthAction()),
})

/**
 * Registry for managing extended liquidity toolkits
 */
export class ExtendedLiquidityRegistry {
  private tools: Record<string, Toolkit>

  constructor(initial: Record<string, Toolkit> = EXTENDED_LIQUIDITY_TOOLS) {
    this.tools = { ...initial }
  }

  getKeys(): string[] {
    return Object.keys(this.tools)
  }

  getTool(key: string): Toolkit | undefined {
    return this.tools[key]
  }

  addTool(key: string, toolkit: Toolkit): void {
    if (this.tools[key]) {
      throw new Error(`Liquidity tool with key "${key}" already exists`)
    }
    this.tools[key] = toolkit
  }

  removeTool(key: string): void {
    delete this.tools[key]
  }

  hasTool(key: string): boolean {
    return Object.prototype.hasOwnProperty.call(this.tools, key)
  }

  clear(): void {
    this.tools = {}
  }
}

/**
 * Utility: create a mutable clone of the default toolset
 */
export function cloneExtendedLiquidityTools(): Record<string, Toolkit> {
  return { ...EXTENDED_LIQUIDITY_TOOLS }
}
