/**
 * Simple task executor: registers and runs tasks by name
 */
type Handler = (params: any) => Promise<any>

export interface TaskResult {
  id: string
  result?: any
  error?: string
  durationMs?: number
}

export class ExecutionEngine {
  private handlers: Record<string, Handler> = {}
  private queue: Array<{ id: string; type: string; params: any }> = []

  register(type: string, handler: Handler): void {
    if (this.handlers[type]) {
      throw new Error(`Handler already registered for type: ${type}`)
    }
    this.handlers[type] = handler
  }

  unregister(type: string): void {
    delete this.handlers[type]
  }

  enqueue(id: string, type: string, params: any): void {
    if (!this.handlers[type]) throw new Error(`No handler for ${type}`)
    this.queue.push({ id, type, params })
  }

  async runAll(): Promise<TaskResult[]> {
    const results: TaskResult[] = []
    while (this.queue.length) {
      const task = this.queue.shift()!
      const start = Date.now()
      try {
        const data = await this.handlers[task.type](task.params)
        results.push({ id: task.id, result: data, durationMs: Date.now() - start })
      } catch (err: any) {
        results.push({ id: task.id, error: err.message, durationMs: Date.now() - start })
      }
    }
    return results
  }

  async runNext(): Promise<TaskResult | null> {
    if (!this.queue.length) return null
    const task = this.queue.shift()!
    const start = Date.now()
    try {
      const data = await this.handlers[task.type](task.params)
      return { id: task.id, result: data, durationMs: Date.now() - start }
    } catch (err: any) {
      return { id: task.id, error: err.message, durationMs: Date.now() - start }
    }
  }

  clear(): void {
    this.queue = []
  }

  listHandlers(): string[] {
    return Object.keys(this.handlers)
  }

  queueSize(): number {
    return this.queue.length
  }
}
