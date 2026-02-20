/**
 * TDD tests for sessions list cwd filtering behavior.
 *
 * Feature: sessions list defaults to current working directory;
 * --global flag required to list all sessions.
 */

import { describe, expect, it } from "bun:test";
import { $ } from "bun";
import { promises as fs } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { FIXTURE_STORE_ROOT, TESTS_ROOT } from "../../helpers";

// Resolve repo root from tests directory (go up one level)
const REPO_ROOT = dirname(TESTS_ROOT);

// Absolute path to CLI entry point
const CLI_PATH = join(REPO_ROOT, "src/bin/opencode-manager.ts");

type TempStore = {
  tempDir: string;
  storeRoot: string;
  cleanup: () => Promise<void>;
};

async function createTempStore(): Promise<TempStore> {
  const tempDir = await fs.mkdtemp(join(tmpdir(), "oc-manager-test-"));
  const storeRoot = join(tempDir, "store");
  await fs.mkdir(join(storeRoot, "storage", "project"), { recursive: true });
  await fs.mkdir(join(storeRoot, "storage", "session"), { recursive: true });
  return {
    tempDir,
    storeRoot,
    cleanup: () => fs.rm(tempDir, { recursive: true, force: true }),
  };
}

async function writeProject(storeRoot: string, projectId: string, worktree: string): Promise<void> {
  const payload = {
    id: projectId,
    worktree,
    vcs: "git",
    time: { created: 1704067200000 },
  };
  const filePath = join(storeRoot, "storage", "project", `${projectId}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

async function writeSession(
  storeRoot: string,
  projectId: string,
  sessionId: string,
  directory: string,
  title: string
): Promise<void> {
  const payload = {
    id: sessionId,
    projectID: projectId,
    directory,
    title,
    version: "1.0.0",
    time: { created: 1704067200000, updated: 1704153600000 },
  };
  const sessionDir = join(storeRoot, "storage", "session", projectId);
  await fs.mkdir(sessionDir, { recursive: true });
  const filePath = join(sessionDir, `${sessionId}.json`);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
}

describe("sessions list cwd filtering", () => {
  it("filters sessions to current working directory by default", async () => {
    // Create temp store with absolute paths to work from any cwd
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const worktree = join(tempDir, "worktrees", "my-project");
      await fs.mkdir(worktree, { recursive: true });
      await writeProject(storeRoot, "proj_test", worktree);
      await writeSession(storeRoot, "proj_test", "session_one", worktree, "Test session");
      await writeSession(storeRoot, "proj_test", "session_two", worktree, "Another session");

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`.cwd(worktree).quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      // All returned sessions should match cwd
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBeGreaterThan(0);
      for (const session of parsed.data) {
        expect(session.directory).toBe(worktree);
      }
    } finally {
      await cleanup();
    }
  });

  it("returns empty array when cwd project has no sessions", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const worktree = join(tempDir, "worktrees", "empty-project");
      await fs.mkdir(worktree, { recursive: true });
      await writeProject(storeRoot, "proj_empty", worktree);

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`.cwd(worktree).quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(0);
    } finally {
      await cleanup();
    }
  });

  it("errors when cwd is outside any project", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const worktree = join(tempDir, "worktrees", "inside-project");
      const outsideDir = join(tempDir, "outside");
      await fs.mkdir(worktree, { recursive: true });
      await fs.mkdir(outsideDir, { recursive: true });
      await writeProject(storeRoot, "proj_inside", worktree);

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`.cwd(outsideDir).nothrow().quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("current directory");
    } finally {
      await cleanup();
    }
  });

  it("chooses deepest match when cwd is inside nested projects", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const parentDir = join(tempDir, "worktrees", "parent");
      const childDir = join(parentDir, "child");
      await fs.mkdir(childDir, { recursive: true });

      await writeProject(storeRoot, "proj_parent", parentDir);
      await writeProject(storeRoot, "proj_child", childDir);
      await writeSession(storeRoot, "proj_parent", "session_parent", parentDir, "Parent session");
      await writeSession(storeRoot, "proj_child", "session_child", childDir, "Child session");

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`.cwd(childDir).quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      expect(parsed.ok).toBe(true);
      expect(parsed.data.map((session: { sessionId: string }) => session.sessionId)).toEqual(["session_child"]);
    } finally {
      await cleanup();
    }
  });

  it("errors when multiple projects match cwd", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const sharedDir = join(tempDir, "worktrees", "shared");
      await fs.mkdir(sharedDir, { recursive: true });

      await writeProject(storeRoot, "proj_one", sharedDir);
      await writeProject(storeRoot, "proj_two", sharedDir);
      await writeSession(storeRoot, "proj_one", "session_one", sharedDir, "Session one");
      await writeSession(storeRoot, "proj_two", "session_two", sharedDir, "Session two");

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`.cwd(sharedDir).nothrow().quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);

      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("--project");
    } finally {
      await cleanup();
    }
  });

  it("resolves symlinks when matching cwd to projects", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const realDir = join(tempDir, "worktrees", "real");
      const linkDir = join(tempDir, "worktrees", "link");
      await fs.mkdir(realDir, { recursive: true });
      await fs.symlink(realDir, linkDir);

      await writeProject(storeRoot, "proj_real", realDir);
      await writeSession(storeRoot, "proj_real", "session_real", realDir, "Realpath match");

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`.cwd(linkDir).quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      expect(parsed.ok).toBe(true);
      expect(parsed.data.length).toBe(1);
      expect(parsed.data[0].sessionId).toBe("session_real");
    } finally {
      await cleanup();
    }
  });

  it("intersects --search with cwd filtering", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const worktreeA = join(tempDir, "worktrees", "project-a");
      const worktreeB = join(tempDir, "worktrees", "project-b");
      await fs.mkdir(worktreeA, { recursive: true });
      await fs.mkdir(worktreeB, { recursive: true });

      await writeProject(storeRoot, "proj_a", worktreeA);
      await writeProject(storeRoot, "proj_b", worktreeB);
      await writeSession(storeRoot, "proj_a", "session_parser_a", worktreeA, "Parser fix A");
      await writeSession(storeRoot, "proj_b", "session_parser_b", worktreeB, "Parser fix B");

      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json --search parser`.cwd(worktreeA).quiet();
      const result = await Promise.race([
        shellPromise,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
        ),
      ]);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      expect(parsed.ok).toBe(true);
      expect(parsed.data.map((session: { sessionId: string }) => session.sessionId)).toEqual(["session_parser_a"]);
    } finally {
      await cleanup();
    }
  });

  it("--global flag lists all sessions regardless of cwd", async () => {
    // Run from repo root but with --global flag
    const shellPromise = $`bun ${CLI_PATH} sessions list --root ${FIXTURE_STORE_ROOT} --global --format json`.quiet();
    const result = await Promise.race([
      shellPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
      ),
    ]);
    const output = result.stdout.toString();
    const parsed = JSON.parse(output);

    // Should return all sessions (no cwd filter)
    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeArray();
    expect(parsed.data.length).toBe(2); // Fixture has 2 sessions
  });

  it("--project flag overrides cwd filtering", async () => {
    // Run from repo root but explicitly filter by project
    const shellPromise = $`bun ${CLI_PATH} sessions list --root ${FIXTURE_STORE_ROOT} --project proj_present --format json`.quiet();
    const result = await Promise.race([
      shellPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
      ),
    ]);
    const output = result.stdout.toString();
    const parsed = JSON.parse(output);

    expect(parsed.ok).toBe(true);
    expect(parsed.data).toBeArray();
    expect(parsed.data.length).toBe(2);
    for (const session of parsed.data) {
      expect(session.projectId).toBe("proj_present");
    }
  });

  it("rejects --global and --project together", async () => {
    const shellPromise = $`bun ${CLI_PATH} sessions list --root ${FIXTURE_STORE_ROOT} --global --project proj_present --format json`.nothrow().quiet();
    const result = await Promise.race([
      shellPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("CLI command timed out after 30s")), 30000)
      ),
    ]);
    
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr.toString()).toContain("Cannot use --global and --project together");
  });
});
