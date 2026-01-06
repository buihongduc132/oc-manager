/**
 * Tests for `projects` CLI commands output.
 *
 * Uses fixture store at tests/fixtures/store to verify command output formats.
 */

import { describe, expect, it, beforeEach, afterEach } from "bun:test";
import { $ } from "bun";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
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

describe("projects list --format table", () => {
  it("outputs table with headers", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();

    // Should have header row
    expect(output).toContain("#");
    expect(output).toContain("State");
    expect(output).toContain("Path");
    expect(output).toContain("Project ID");
    expect(output).toContain("Created");
  });

  it("outputs table with header underline", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();
    const lines = output.split("\n");

    // Second line should be header underline (dashes)
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(lines[1]).toMatch(/^-+/);
  });

  it("includes project data rows", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();

    // Should include project IDs
    expect(output).toContain("proj_present");
    expect(output).toContain("proj_missing");
  });

  it("shows correct project count (header + underline + data rows)", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // 1 header + 1 underline + 2 data rows = 4 total lines
    expect(lines.length).toBe(4);
  });

  it("formats state column with visual indicators", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table`.quiet();
    const output = result.stdout.toString();

    // State indicators: checkmark for present, X for missing
    expect(output).toMatch(/✓|✗/);
  });

  it("respects --missing-only filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table --missing-only`.quiet();
    const output = result.stdout.toString();

    // Should only include missing project
    expect(output).toContain("proj_missing");
    expect(output).not.toContain("proj_present");
  });

  it("respects --search filter", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table --search present`.quiet();
    const output = result.stdout.toString();

    // Should only include present project
    expect(output).toContain("proj_present");
    expect(output).not.toContain("proj_missing");
  });

  it("respects --limit option", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format table --limit 1`.quiet();
    const output = result.stdout.toString().trim();
    const lines = output.split("\n");

    // 1 header + 1 underline + 1 data row = 3 total lines
    expect(lines.length).toBe(3);
  });
});

describe("projects delete --dry-run", () => {
  it("outputs dry-run JSON format with paths to delete", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format json --dry-run`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    // JSON output is wrapped in success envelope
    expect(parsed).toHaveProperty("ok", true);
    expect(parsed).toHaveProperty("data");
    expect(parsed.data).toHaveProperty("dryRun", true);
    expect(parsed.data).toHaveProperty("operation", "delete");
    expect(parsed.data).toHaveProperty("resourceType", "project");
    expect(parsed.data).toHaveProperty("count", 1);
    expect(parsed.data).toHaveProperty("paths");
    expect(parsed.data.paths).toBeArray();
    expect(parsed.data.paths.length).toBe(1);
  });

  it("includes correct file path in dry-run output", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format json --dry-run`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.paths[0]).toContain("proj_present.json");
  });

  it("outputs dry-run table format with header", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format table --dry-run`.quiet();
    const output = result.stdout.toString();

    expect(output).toContain("[DRY RUN]");
    expect(output).toContain("delete");
    expect(output).toContain("1 project");
  });

  it("does not actually delete the file", async () => {
    // Run dry-run delete
    await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format json --dry-run`.quiet();

    // Verify file still exists by running projects list
    const listResult = await $`bun src/bin/opencode-manager.ts projects list --root ${FIXTURE_STORE_ROOT} --format json`.quiet();
    const parsed = JSON.parse(listResult.stdout.toString());
    const projectIds = parsed.data.map((p: { projectId: string }) => p.projectId);
    expect(projectIds).toContain("proj_present");
  });

  it("supports prefix matching in dry-run mode", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_pres --root ${FIXTURE_STORE_ROOT} --format json --dry-run`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed.data.paths[0]).toContain("proj_present.json");
  });

  it("returns exit code 3 for non-existent project", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id nonexistent_project --root ${FIXTURE_STORE_ROOT} --format json --dry-run`.quiet().nothrow();
    
    expect(result.exitCode).toBe(3);
  });
});

describe("projects delete --backup-dir", () => {
  let tempDir: string;
  let tempRoot: string;
  let tempBackupDir: string;

  beforeEach(async () => {
    // Create temporary directories for each test
    tempDir = await fs.mkdtemp(join(tmpdir(), "opencode-test-"));
    tempRoot = join(tempDir, "store");
    tempBackupDir = join(tempDir, "backups");

    // Copy fixture store to temp directory
    await fs.cp(FIXTURE_STORE_ROOT, tempRoot, { recursive: true });
    await fs.mkdir(tempBackupDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("creates backup before deleting project", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${tempRoot} --format json --yes --backup-dir ${tempBackupDir}`.quiet();
    
    expect(result.exitCode).toBe(0);

    // Verify backup directory was created (timestamped subdirectory)
    const backupContents = await fs.readdir(tempBackupDir);
    expect(backupContents.length).toBe(1);
    expect(backupContents[0]).toMatch(/^project_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}$/);
  });

  it("backup contains the project file", async () => {
    await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${tempRoot} --format json --yes --backup-dir ${tempBackupDir}`.quiet();

    // Find the backup subdirectory
    const backupContents = await fs.readdir(tempBackupDir);
    const backupSubdir = join(tempBackupDir, backupContents[0]);

    // The backup preserves structure, so look for the file in the relative path
    const backupFile = join(backupSubdir, "storage", "project", "proj_present.json");
    const exists = await fs.access(backupFile).then(() => true).catch(() => false);
    expect(exists).toBe(true);
  });

  it("deletes the original file after backup", async () => {
    const originalFile = join(tempRoot, "storage", "project", "proj_present.json");
    
    // Verify file exists before delete
    const existsBefore = await fs.access(originalFile).then(() => true).catch(() => false);
    expect(existsBefore).toBe(true);

    await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${tempRoot} --format json --yes --backup-dir ${tempBackupDir}`.quiet();

    // Verify file is deleted after backup
    const existsAfter = await fs.access(originalFile).then(() => true).catch(() => false);
    expect(existsAfter).toBe(false);
  });

  it("outputs success message with project ID", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${tempRoot} --format json --yes --quiet --backup-dir ${tempBackupDir}`.quiet();
    const output = result.stdout.toString();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("ok", true);
    expect(parsed.data).toHaveProperty("projectId", "proj_present");
  });

  it("backup preserves directory structure relative to root", async () => {
    await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${tempRoot} --format json --yes --backup-dir ${tempBackupDir}`.quiet();

    // Find the backup subdirectory
    const backupContents = await fs.readdir(tempBackupDir);
    const backupSubdir = join(tempBackupDir, backupContents[0]);

    // Verify the structure: should have storage/project/proj_present.json
    const storageDirExists = await fs.access(join(backupSubdir, "storage")).then(() => true).catch(() => false);
    const projectDirExists = await fs.access(join(backupSubdir, "storage", "project")).then(() => true).catch(() => false);
    
    expect(storageDirExists).toBe(true);
    expect(projectDirExists).toBe(true);
  });

  it("returns exit code 2 when --yes is not provided", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${tempRoot} --format json --backup-dir ${tempBackupDir}`.quiet().nothrow();
    
    expect(result.exitCode).toBe(2);
  });
});

describe("projects delete requires --yes", () => {
  it("returns exit code 2 when --yes is missing", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format json`.quiet().nothrow();
    
    expect(result.exitCode).toBe(2);
  });

  it("error message mentions --yes flag", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format json`.quiet().nothrow();
    // Error output goes to stderr
    const output = result.stderr.toString();

    const parsed = JSON.parse(output);
    expect(parsed).toHaveProperty("ok", false);
    expect(parsed.error).toContain("--yes");
  });

  it("suggests using --dry-run in error message", async () => {
    const result = await $`bun src/bin/opencode-manager.ts projects delete --id proj_present --root ${FIXTURE_STORE_ROOT} --format json`.quiet().nothrow();
    // Error output goes to stderr
    const output = result.stderr.toString();

    const parsed = JSON.parse(output);
    expect(parsed.error).toContain("--dry-run");
  });
});
