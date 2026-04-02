import { exec } from "child_process"

/**
 * Execute a shell command and return stdout or throw on error
 * @param command Shell command to run (e.g., "ls -la")
 * @param timeoutMs Optional timeout in milliseconds
 * @param cwd Optional working directory
 */
export function execCommand(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = exec(
      command,
      { timeout: timeoutMs, cwd },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Command failed: ${stderr || error.message}`))
        }
        resolve(stdout.trim())
      }
    )

    proc.on("error", (err) => {
      reject(new Error(`Process error: ${err.message}`))
    })
  })
}

/**
 * Execute a shell command and return both stdout and stderr
 */
export async function execCommandWithOutput(
  command: string,
  timeoutMs: number = 30_000,
  cwd?: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const proc = exec(
      command,
      { timeout: timeoutMs, cwd },
      (error, stdout, stderr) => {
        if (error) {
          return reject(new Error(`Command failed: ${stderr || error.message}`))
        }
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() })
      }
    )

    proc.on("error", (err) => {
      reject(new Error(`Process error: ${err.message}`))
    })
  })
}

/**
 * Execute a series of shell commands sequentially
 */
export async function execCommandsSequential(
  commands: string[],
  timeoutMs: number = 30_000,
  cwd?: string
): Promise<string[]> {
  const outputs: string[] = []
  for (const cmd of commands) {
    const out = await execCommand(cmd, timeoutMs, cwd)
    outputs.push(out)
  }
  return outputs
}
