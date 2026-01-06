/**
 * Tokens CLI subcommands.
 *
 * Provides commands for viewing token usage statistics at session,
 * project, and global levels.
 */

import { Command, type OptionValues } from "commander"
import { parseGlobalOptions, type GlobalOptions } from "../index"

/**
 * Collect all options from a command and its ancestors.
 * Commander stores global options on the root program, not on subcommands.
 */
function collectOptions(cmd: Command): OptionValues {
  const opts: OptionValues = {}
  let current: Command | null = cmd
  while (current) {
    Object.assign(opts, current.opts())
    current = current.parent
  }
  return opts
}

/**
 * Options specific to the tokens session command.
 */
export interface TokensSessionOptions {
  /** Session ID to show token usage for */
  session: string
}

/**
 * Options specific to the tokens project command.
 */
export interface TokensProjectOptions {
  /** Project ID to show token usage for */
  project: string
}

/**
 * Register tokens subcommands on the given parent command.
 */
export function registerTokensCommands(parent: Command): void {
  const tokens = parent
    .command("tokens")
    .description("View token usage statistics")

  tokens
    .command("session")
    .description("Show token usage for a session")
    .requiredOption("--session <sessionId>", "Session ID to show token usage for")
    .action(function (this: Command) {
      const globalOpts = parseGlobalOptions(collectOptions(this))
      const cmdOpts = this.opts()
      const sessionOpts: TokensSessionOptions = {
        session: String(cmdOpts.session),
      }
      handleTokensSession(globalOpts, sessionOpts)
    })

  tokens
    .command("project")
    .description("Show token usage for a project")
    .requiredOption("--project <projectId>", "Project ID to show token usage for")
    .action(function (this: Command) {
      const globalOpts = parseGlobalOptions(collectOptions(this))
      const cmdOpts = this.opts()
      const projectOpts: TokensProjectOptions = {
        project: String(cmdOpts.project),
      }
      handleTokensProject(globalOpts, projectOpts)
    })

  tokens
    .command("global")
    .description("Show global token usage")
    .action(function (this: Command) {
      const globalOpts = parseGlobalOptions(collectOptions(this))
      handleTokensGlobal(globalOpts)
    })
}

/**
 * Handle the tokens session command.
 */
function handleTokensSession(
  globalOpts: GlobalOptions,
  sessionOpts: TokensSessionOptions
): void {
  console.log("tokens session: not yet implemented")
  console.log("Global options:", globalOpts)
  console.log("Session options:", sessionOpts)
}

/**
 * Handle the tokens project command.
 */
function handleTokensProject(
  globalOpts: GlobalOptions,
  projectOpts: TokensProjectOptions
): void {
  console.log("tokens project: not yet implemented")
  console.log("Global options:", globalOpts)
  console.log("Project options:", projectOpts)
}

/**
 * Handle the tokens global command.
 */
function handleTokensGlobal(globalOpts: GlobalOptions): void {
  console.log("tokens global: not yet implemented")
  console.log("Global options:", globalOpts)
}
