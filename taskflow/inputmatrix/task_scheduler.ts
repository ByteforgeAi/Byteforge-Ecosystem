import type { TaskFormInput } from "./taskFormSchemas"
import { TaskFormSchema } from "./taskFormSchemas"
import { ExecutionEngine } from "./execution_engine"

/**
 * Processes a Typeform webhook payload to schedule a new task
 */
export async function handleTypeformSubmission(
  raw: unknown,
  engine: ExecutionEngine = new ExecutionEngine()
): Promise<{ success: boolean; message: string }> {
  const parsed = TaskFormSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      success: false,
      message: `Validation error: ${parsed.error.issues
        .map((i) => i.message)
        .join("; ")}`,
    }
  }

  const { taskName, taskType, parameters, scheduleCron } = parsed.data as TaskFormInput

  try {
    // Register a dummy handler if not present
    if (!engine["handlers"]?.[taskType]) {
      engine.register(taskType, async (params) => {
        return { echo: params }
      })
    }

    // Enqueue the task
    engine.enqueue(taskName, taskType, parameters)

    // Optionally: persist schedule (e.g. cron)
    const scheduled = scheduleCron
      ? ` with cron "${scheduleCron}"`
      : ""

    return {
      success: true,
      message: `Task "${taskName}" of type "${taskType}" scheduled${scheduled}`,
    }
  } catch (err: any) {
    return { success: false, message: `Task scheduling failed: ${err.message}` }
  }
}
