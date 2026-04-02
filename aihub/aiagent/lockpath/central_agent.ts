import type { BaseAction, ActionResponse } from "./base_action"
import { z } from "zod"

interface AgentContext {
  apiEndpoint: string
  apiKey: string
  environment?: string
  timeoutMs?: number
}

/**
 * Central Agent: routes calls to registered actions
 */
export class Agent {
  private actions = new Map<string, BaseAction<any, any, AgentContext>>()
  private readonly defaultTimeout = 15000

  register<S, R>(action: BaseAction<S, R, AgentContext>): void {
    if (this.actions.has(action.id)) {
      throw new Error(`Action with id "${action.id}" already registered`)
    }
    this.actions.set(action.id, action)
  }

  unregister(actionId: string): void {
    this.actions.delete(actionId)
  }

  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  hasAction(actionId: string): boolean {
    return this.actions.has(actionId)
  }

  async invoke<R>(
    actionId: string,
    payload: unknown,
    ctx: AgentContext
  ): Promise<ActionResponse<R>> {
    const action = this.actions.get(actionId)
    if (!action) {
      return { ok: false, notice: `Unknown action "${actionId}"`, error: { code: "NOT_FOUND", message: "Action not registered" } }
    }

    try {
      // validate payload using zod schema
      const validatedPayload = action.input.parse(payload)
      const signal = this.createAbortSignal(ctx.timeoutMs ?? this.defaultTimeout)
      return await action.execute({ payload: validatedPayload, context: ctx, signal })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Validation or execution error"
      return { ok: false, notice: "Invocation failed", error: { code: "INVOCATION_ERROR", message, cause: err } }
    }
  }

  private createAbortSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller.signal
  }
}
