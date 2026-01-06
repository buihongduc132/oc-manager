/**
 * Tests for `sessions list` CLI command output.
 *
 * Uses fixture store at tests/fixtures/store to verify command output formats.
 */

import { describe, expect, it } from "bun:test";
import { $ } from "bun";
import { FIXTURE_STORE_ROOT } from "../../helpers";

describe("sessions list --format json", () => {
  it("outputs valid JSON with success envelope", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("ok", true);
    expect(parsed).toHaveProperty("data");
    expect(parsed.data).toBeArray();
  });

  it("includes correct session count", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(2);
  });

  it("includes session fields in JSON output", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    for (const session of parsed.data) {
      expect(session).toHaveProperty("sessionId");
      expect(session).toHaveProperty("projectId");
      expect(session).toHaveProperty("title");
      expect(session).toHaveProperty("directory");
      expect(session).toHaveProperty("filePath");
    }
  });

  it("serializes Date fields as ISO strings", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    for (const session of parsed.data) {
      if (session.createdAt) {
        // ISO date string format check
        expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
      if (session.updatedAt) {
        expect(session.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    }
  });

  it("includes meta with limit info", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("meta");
    expect(parsed.meta).toHaveProperty("limit");
  });

  it("respects --project filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json --project proj_present`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(2);
    for (const session of parsed.data) {
      expect(session.projectId).toBe("proj_present");
    }
  });

  it("respects --search filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json --search parser`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(1);
    expect(parsed.data[0].sessionId).toBe("session_parser_fix");
  });

  it("respects --limit option", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json --limit 1`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(1);
  });
});

describe("sessions list --format ndjson", () => {
  it("outputs valid NDJSON (one JSON object per line)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("includes correct session count (one per line)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(2);
  });

  it("includes session fields in each NDJSON line", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    for (const line of lines) {
      const session = JSON.parse(line);
      expect(session).toHaveProperty("sessionId");
      expect(session).toHaveProperty("projectId");
      expect(session).toHaveProperty("title");
      expect(session).toHaveProperty("directory");
      expect(session).toHaveProperty("filePath");
    }
  });

  it("serializes Date fields as ISO strings", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    for (const line of lines) {
      const session = JSON.parse(line);
      if (session.createdAt) {
        // ISO date string format check
        expect(session.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
      if (session.updatedAt) {
        expect(session.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    }
  });

  it("does not include envelope wrapper (raw records only)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // First line should be a session, not an envelope
    const firstLine = JSON.parse(lines[0]);
    expect(firstLine).not.toHaveProperty("ok");
    expect(firstLine).not.toHaveProperty("data");
    expect(firstLine).toHaveProperty("sessionId");
  });

  it("respects --project filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson --project proj_present`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(2);
    for (const line of lines) {
      const session = JSON.parse(line);
      expect(session.projectId).toBe("proj_present");
    }
  });

  it("respects --search filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson --search parser`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(1);
    const session = JSON.parse(lines[0]);
    expect(session.sessionId).toBe("session_parser_fix");
  });

  it("respects --limit option", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format ndjson --limit 1`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(1);
  });
});

describe("sessions list --format table", () => {
  it("outputs table with headers", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();

    // Should have header row
    expect(output).toContain("#");
    expect(output).toContain("Title");
    expect(output).toContain("Session ID");
    expect(output).toContain("Project ID");
  });

  it("outputs table with header underline", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();
    const lines = output.split("\n");

    // Second line should be header underline (dashes)
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[1]).toMatch(/^-+/);
  });

  it("includes session data rows", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();

    // Should include session titles
    expect(output).toContain("Add unit tests");
    expect(output).toContain("Fix bug in parser");
  });

  it("shows correct session count (header + underline + data rows)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // 1 header + 1 underline + 2 data rows = 4 total lines
    expect(lines.length).toBe(4);
  });

  it("respects --project filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table --project proj_present`.quiet();
    const output = result.stdout.toString();

    // Should include sessions from proj_present
    expect(output).toContain("Add unit tests");
    expect(output).toContain("Fix bug in parser");
  });

  it("respects --search filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table --search parser`.quiet();
    const output = result.stdout.toString();

    // Should only include parser session
    expect(output).toContain("Fix bug in parser");
    expect(output).not.toContain("Add unit tests");
  });

  it("respects --limit option", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format table --limit 1`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // 1 header + 1 underline + 1 data row = 3 total lines
    expect(lines.length).toBe(3);
  });

  it("sorts by updated date descending by default", async () => {
    const result = await $`bun src/bin/opencode-manager.ts sessions list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    // session_add_tests has later updatedAt (1704326400000) than session_parser_fix (1704153600000)
    expect(parsed.data[0].sessionId).toBe("session_add_tests");
    expect(parsed.data[1].sessionId).toBe("session_parser_fix");
  });
});
