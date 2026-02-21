import { spawn } from "node:child_process"

/**
 * Copy text to the system clipboard.
 * Uses pbcopy on macOS and xclip on Linux.
 *
 * @param text The text to copy to clipboard
 * @returns Promise that resolves when copy is complete, rejects on error
 */
export function copyToClipboard(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const isDarwin = process.platform === "darwin"
    const isLinux = process.platform === "linux"
    const displayValue = process.env.DISPLAY?.trim()
    const waylandValue = process.env.WAYLAND_DISPLAY?.trim()
    const hasDisplay = Boolean(displayValue || waylandValue)
    if (isLinux && !hasDisplay) {
      reject(new Error("Clipboard not available (no display)"))
      return
    }

    const command = isDarwin ? "pbcopy" : "xclip"
    const args = isDarwin ? [] : ["-selection", "clipboard"]
    const proc = spawn(command, args, { stdio: ["pipe", "ignore", "ignore"] })
    proc.unref()
    const timeout = setTimeout(() => {
      proc.kill("SIGKILL")
      reject(new Error(`${command} timed out`))
    }, 2000)

    proc.on("error", (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    proc.on("close", (code) => {
      clearTimeout(timeout)
      if (code === 0) {
        resolve()
      } else {
        const suffix = code === null ? "unknown" : String(code)
        reject(new Error(`${command} exited with code ${suffix}`))
      }
    })

    proc.stdin?.write(text)
    proc.stdin?.end()
  })
}

/**
 * Copy text to clipboard, logging errors to console.
 * This is a fire-and-forget version for use in contexts where
 * error handling is not critical.
 *
 * @param text The text to copy to clipboard
 */
export function copyToClipboardSync(text: string): void {
  copyToClipboard(text).catch((error) => {
    console.error("Failed to copy to clipboard:", error)
  })
}
