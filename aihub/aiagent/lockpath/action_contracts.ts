import { z } from "zod"

/**
 * Base types for any action
 */
export type ActionSchema = z.ZodObject<z.ZodRawShape>

export interface ActionError {
  code: string
  message: string
  cause?: unknown
}

export interface ActionResponse<T> {
  ok: boolean
  notice: string
  data?: T
  error?: ActionError
}

export type ActionExecuteArgs<S extends ActionSchema, Ctx> = {
  payload: z.infer<S>
  context: Ctx
  signal?: AbortSignal
}

export interface BaseAction<S extends ActionSchema, R, Ctx = unknown> {
  id: string
  summary: string
  input: S
  version?: string
  tags?: string[]
  execute(args: ActionExecuteArgs<S, Ctx>): Promise<ActionResponse<R>>
}

/**
 * Utility: validate arbitrary payload against an action schema
 */
export function parsePayload<S extends ActionSchema>(schema: S, payload: unknown): z.infer<S> {
  return schema.parse(payload)
}

/**
 * Utility: standard success response
 */
export function success<T>(notice: string, data?: T): ActionResponse<T> {
  return { ok: true, notice, data }
}

/**
 * Utility: standard error response
 */
export function failure<T = never>(notice: string, error: ActionError): ActionResponse<T> {
  return { ok: false, notice, error }
}

/**
 * Helper to run an action with built-in payload validation and error safety
 */
export async function runAction<S extends ActionSchema, R, Ctx>(
  action: BaseAction<S, R, Ctx>,
  args: Omit<ActionExecuteArgs<S, Ctx>, "payload"> & { payload: unknown }
): Promise<ActionResponse<R>> {
  try {
    const validated = parsePayload(action.input, args.payload)
    return await action.execute({ ...args, payload: validated })
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error"
    return failure("Action execution failed", { code: "ACTION_ERROR", message, cause: err })
  }
}

/**
 * Type guard for success responses
 */
export function isOk<T>(resp: ActionResponse<T>): resp is ActionResponse<T> & { ok: true; data: T } {
  return resp.ok === true
}
