/**
 * Tests for `projects list` CLI command output.
 *
 * Uses fixture store at tests/fixtures/store to verify command output formats.
 */

import { describe, expect, it } from "bun:test";
import { $ } from "bun";
import { FIXTURE_STORE_ROOT } from "../../helpers";

describe("projects list --format json", () => {
  it("outputs valid JSON with success envelope", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("ok", true);
    expect(parsed).toHaveProperty("data");
    expect(parsed.data).toBeArray();
  });

  it("includes correct project count", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(2);
  });

  it("includes project fields in JSON output", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    for (const project of parsed.data) {
      expect(project).toHaveProperty("projectId");
      expect(project).toHaveProperty("worktree");
      expect(project).toHaveProperty("state");
      expect(project).toHaveProperty("index");
      expect(project).toHaveProperty("bucket");
      expect(project).toHaveProperty("filePath");
    }
  });

  it("serializes Date fields as ISO strings", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    for (const project of parsed.data) {
      if (project.createdAt) {
        // ISO date string format check
        expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    }
  });

  it("includes meta with limit info", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("meta");
    expect(parsed.meta).toHaveProperty("limit");
  });

  it("respects --missing-only filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json --missing-only`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(1);
    expect(parsed.data[0].projectId).toBe("proj_missing");
    expect(parsed.data[0].state).toBe("missing");
  });

  it("respects --search filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json --search present`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(1);
    expect(parsed.data[0].projectId).toBe("proj_present");
  });

  it("respects --limit option", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json --limit 1`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.length).toBe(1);
  });
});

describe("projects list --format ndjson", () => {
  it("outputs valid NDJSON (one JSON object per line)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // Each line should be valid JSON
    for (const line of lines) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });

  it("includes correct project count (one per line)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(2);
  });

  it("includes project fields in each NDJSON line", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    for (const line of lines) {
      const project = JSON.parse(line);
      expect(project).toHaveProperty("projectId");
      expect(project).toHaveProperty("worktree");
      expect(project).toHaveProperty("state");
      expect(project).toHaveProperty("index");
      expect(project).toHaveProperty("bucket");
      expect(project).toHaveProperty("filePath");
    }
  });

  it("serializes Date fields as ISO strings", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    for (const line of lines) {
      const project = JSON.parse(line);
      if (project.createdAt) {
        // ISO date string format check
        expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      }
    }
  });

  it("does not include envelope wrapper (raw records only)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // First line should be a project, not an envelope
    const firstLine = JSON.parse(lines[0]);
    expect(firstLine).not.toHaveProperty("ok");
    expect(firstLine).not.toHaveProperty("data");
    expect(firstLine).toHaveProperty("projectId");
  });

  it("respects --missing-only filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson --missing-only`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(1);
    const project = JSON.parse(lines[0]);
    expect(project.projectId).toBe("proj_missing");
    expect(project.state).toBe("missing");
  });

  it("respects --search filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson --search present`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(1);
    const project = JSON.parse(lines[0]);
    expect(project.projectId).toBe("proj_present");
  });

  it("respects --limit option", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format ndjson --limit 1`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    expect(lines.length).toBe(1);
  });
});
