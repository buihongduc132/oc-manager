/**
 * CLI Smoke Tests
 *
 * Verifies that the CLI boots correctly and produces expected help output.
 * Note: The main entry point routes to TUI by default; CLI subcommands
 * are accessed via `projects`, `sessions`, `chat`, `tokens` subcommands.
 */

import { describe, expect, it } from "bun:test";
import { $ } from "bun";

describe("CLI smoke tests", () => {
  it("displays projects subcommand help", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts projects --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("projects");
    expect(output).toContain("list");
    expect(output).toContain("delete");
  });

  it("displays sessions subcommand help", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts sessions --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("sessions");
    expect(output).toContain("list");
    expect(output).toContain("delete");
    expect(output).toContain("rename");
    expect(output).toContain("move");
    expect(output).toContain("copy");
  });

  it("displays chat subcommand help", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts chat --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("chat");
    expect(output).toContain("list");
    expect(output).toContain("show");
    expect(output).toContain("search");
  });

  it("displays tokens subcommand help", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts tokens --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("tokens");
    expect(output).toContain("session");
    expect(output).toContain("project");
    expect(output).toContain("global");
  });

  it("displays nested subcommand help for projects list", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts projects list --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("list");
    expect(output).toContain("--missing-only");
    expect(output).toContain("--search");
  });

  it("displays nested subcommand help for sessions list", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts sessions list --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("list");
    expect(output).toContain("--project");
    expect(output).toContain("--search");
  });

  it("displays nested subcommand help for chat show", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts chat show --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("show");
    expect(output).toContain("--session");
    expect(output).toContain("--message");
    expect(output).toContain("--index");
  });

  it("displays nested subcommand help for tokens session", async () => {
    const result =
      await $`bun src/bin/opencode-manager.ts tokens session --help`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("session");
    expect(output).toContain("--session");
  });
});
