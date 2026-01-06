/**
 * Chat CLI subcommands.
 *
 * Provides commands for listing, showing, and searching chat messages
 * across OpenCode sessions.
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
 * Options specific to the chat list command.
 */
export interface ChatListOptions {
  /** Session ID to list messages from */
  session: string
  /** Include message parts in output */
  includeParts: boolean
}

/**
 * Options specific to the chat show command.
 */
export interface ChatShowOptions {
  /** Session ID containing the message */
  session: string
  /** Message ID to show */
  message?: string
  /** Message index (1-based) to show */
  index?: number
}

/**
 * Options specific to the chat search command.
 */
export interface ChatSearchOptions {
  /** Search query */
  query: string
  /** Filter by project ID */
  project?: string
}

/**
 * Register chat subcommands on the given parent command.
 */
export function registerChatCommands(parent: Command): void {
  const chat = parent
    .command("chat")
    .description("View and search chat messages")

  chat
    .command("list")
    .description("List messages in a session")
    .requiredOption("--session <sessionId>", "Session ID to list messages from")
    .option("--include-parts", "Include message parts in output", false)
    .action(function (this: Command) {
      const globalOpts = parseGlobalOptions(collectOptions(this))
      const cmdOpts = this.opts()
      const listOpts: ChatListOptions = {
        session: String(cmdOpts.session),
        includeParts: Boolean(cmdOpts.includeParts),
      }
      handleChatList(globalOpts, listOpts)
    })

  chat
    .command("show")
    .description("Show a specific message")
    .requiredOption("--session <sessionId>", "Session ID containing the message")
    .option("-m, --message <messageId>", "Message ID to show")
    .option("-i, --index <number>", "Message index (1-based) to show")
    .action(function (this: Command) {
      const globalOpts = parseGlobalOptions(collectOptions(this))
      const cmdOpts = this.opts()
      const showOpts: ChatShowOptions = {
        session: String(cmdOpts.session),
        message: cmdOpts.message as string | undefined,
        index: cmdOpts.index ? parseInt(String(cmdOpts.index), 10) : undefined,
      }
      handleChatShow(globalOpts, showOpts)
    })

  chat
    .command("search")
    .description("Search chat content across sessions")
    .requiredOption("-q, --query <query>", "Search query")
    .option("-p, --project <projectId>", "Filter by project ID")
    .action(function (this: Command) {
      const globalOpts = parseGlobalOptions(collectOptions(this))
      const cmdOpts = this.opts()
      const searchOpts: ChatSearchOptions = {
        query: String(cmdOpts.query),
        project: cmdOpts.project as string | undefined,
      }
      handleChatSearch(globalOpts, searchOpts)
    })
}

/**
 * Handle the chat list command.
 */
function handleChatList(
  globalOpts: GlobalOptions,
  listOpts: ChatListOptions
): void {
  console.log("chat list: not yet implemented")
  console.log("Global options:", globalOpts)
  console.log("List options:", listOpts)
}

/**
 * Handle the chat show command.
 */
function handleChatShow(
  globalOpts: GlobalOptions,
  showOpts: ChatShowOptions
): void {
  console.log("chat show: not yet implemented")
  console.log("Global options:", globalOpts)
  console.log("Show options:", showOpts)
}

/**
 * Handle the chat search command.
 */
function handleChatSearch(
  globalOpts: GlobalOptions,
  searchOpts: ChatSearchOptions
): void {
  console.log("chat search: not yet implemented")
  console.log("Global options:", globalOpts)
  console.log("Search options:", searchOpts)
}
