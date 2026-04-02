import { z } from "zod"

/**
 * Schema for scheduling a new task via Typeform submission
 */
export const TaskFormSchema = z.object({
  taskName: z.string().min(3, "Task name too short").max(100, "Task name too long"),
  taskType: z.enum(["anomalyScan", "tokenAnalytics", "whaleMonitor", "customJob"]),
  parameters: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .refine((obj) => Object.keys(obj).length > 0, "Parameters must include at least one key"),
  scheduleCron: z
    .string()
    .regex(
      /^(\*|[0-5]?\d) (\*|[01]?\d|2[0-3]) (\*|[1-9]|[12]\d|3[01]) (\*|[1-9]|1[0-2]) (\*|[0-6])$/,
      "Invalid cron expression"
    )
    .optional(),
  description: z.string().max(300).optional(),
})

export type TaskFormInput = z.infer<typeof TaskFormSchema>

/**
 * Utility: validate and return either parsed input or error messages
 */
export function validateTaskForm(input: unknown): { valid: true; data: TaskFormInput } | { valid: false; errors: string[] } {
  const parsed = TaskFormSchema.safeParse(input)
  if (parsed.success) {
    return { valid: true, data: parsed.data }
  }
  return {
    valid: false,
    errors: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`),
  }
}
