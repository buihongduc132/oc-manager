/**
 * Edge case tests for sessions list cwd filtering.
 *
 * These tests expose bugs in the current implementation:
 * 1. Symlink resolution - cwd is symlink, project worktree is real path
 * 2. Path prefix collision - short worktree path matching longer cwd prefix
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

async function runCliWithTimeout(promise: Promise<any>, ms = 30000) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`CLI command timed out after ${ms}ms`)), ms)
    ),
  ]);
}

describe("sessions list cwd filtering - symlink resolution", () => {
  // NOTE: process.cwd() automatically resolves symlinks to the real path.
  // This means the key bug case is: project registered with symlink path,
  // but user runs from directory (which process.cwd() resolves to real path).

  it("matches project when cwd is a symlink to the project worktree (cwd resolves, worktree is real)", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      // Create real directory and a symlink pointing to it
      const realDir = join(tempDir, "real-project");
      const linkDir = join(tempDir, "link-project");
      await fs.mkdir(realDir, { recursive: true });
      await fs.symlink(realDir, linkDir);

      // Project is registered with the REAL path
      await writeProject(storeRoot, "proj_real", realDir);
      await writeSession(storeRoot, "proj_real", "session_in_real", realDir, "Session in real dir");

      // User runs command from the SYMLINK path
      // process.cwd() resolves to realDir automatically, so this should work
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(linkDir)
        .quiet();
      const result = await runCliWithTimeout(shellPromise);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      // This should pass because process.cwd() resolves symlinks
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(1);
      expect(parsed.data[0].sessionId).toBe("session_in_real");
    } finally {
      await cleanup();
    }
  });

  it("BUG: matches project when worktree is a symlink and cwd is the real path", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      // Create real directory and a symlink pointing to it
      const realDir = join(tempDir, "real-project");
      const linkDir = join(tempDir, "link-project");
      await fs.mkdir(realDir, { recursive: true });
      await fs.symlink(realDir, linkDir);

      // Project is registered with the SYMLINK path (happens when project was added via symlink)
      await writeProject(storeRoot, "proj_link", linkDir);
      await writeSession(storeRoot, "proj_link", "session_in_link", realDir, "Session via symlink");

      // User runs command from the directory (process.cwd() returns realDir because it resolves)
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(realDir)
        .quiet();
      const result = await runCliWithTimeout(shellPromise);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      // BUG: Currently fails because:
      // - process.cwd() returns realDir (resolved)
      // - worktree is linkDir (unresolved symlink)
      // - realDir !== linkDir and !realDir.startsWith(linkDir + "/")
      // 
      // FIX NEEDED: Resolve worktree paths with fs.realpath() before comparison
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(1);
      expect(parsed.data[0].sessionId).toBe("session_in_link");
    } finally {
      await cleanup();
    }
  });
});

describe("sessions list cwd filtering - path prefix collision", () => {
  it("does NOT match project when worktree is a prefix but not a parent directory", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      // Create two directories where one is a prefix of the other's name
      // e.g., /tmp/test/pro and /tmp/test/project
      const shortDir = join(tempDir, "pro");
      const longDir = join(tempDir, "project");
      await fs.mkdir(shortDir, { recursive: true });
      await fs.mkdir(longDir, { recursive: true });

      // Project registered with SHORT path
      await writeProject(storeRoot, "proj_short", shortDir);
      await writeSession(storeRoot, "proj_short", "session_short", shortDir, "Short project");

      // User runs from LONG path (which is NOT inside shortDir)
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(longDir)
        .nothrow()
        .quiet();
      const result = await runCliWithTimeout(shellPromise);

      // BUG: Current code does `cwd.startsWith(worktree + "/")` 
      // which would be "/tmp/test/project".startsWith("/tmp/test/pro/")
      // This is actually correct! The "/" ensures we don't have prefix collision.
      // Let me verify this test is correct...
      
      // Actually, this should correctly error because longDir is NOT inside shortDir
      // The "/" in the startsWith check prevents false matches
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr.toString()).toContain("No project found");
    } finally {
      await cleanup();
    }
  });

  it("correctly handles worktree paths with trailing slashes", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const worktree = join(tempDir, "my-project");
      const subDir = join(worktree, "subdir");
      await fs.mkdir(subDir, { recursive: true });

      // Register project with trailing slash (edge case)
      await writeProject(storeRoot, "proj_trailing", worktree + "/");
      await writeSession(storeRoot, "proj_trailing", "session_trailing", worktree, "Trailing slash");

      // Run from subdirectory
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(subDir)
        .quiet();
      const result = await runCliWithTimeout(shellPromise);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      // Should still match despite trailing slash in worktree
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(1);
    } finally {
      await cleanup();
    }
  });

  it("handles cwd with trailing slash correctly", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      const worktree = join(tempDir, "my-project");
      await fs.mkdir(worktree, { recursive: true });

      await writeProject(storeRoot, "proj_normal", worktree);
      await writeSession(storeRoot, "proj_normal", "session_normal", worktree, "Normal project");

      // The shell promise cwd() doesn't add trailing slash, but let's test
      // by running directly in the worktree
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(worktree)
        .quiet();
      const result = await runCliWithTimeout(shellPromise);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(1);
    } finally {
      await cleanup();
    }
  });
});

describe("sessions list cwd filtering - nested symlink scenarios", () => {
  it("handles symlink chain cwd (process.cwd resolves to real)", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      // Create chain: link1 -> link2 -> realDir
      const realDir = join(tempDir, "real-deep-project");
      const link2 = join(tempDir, "link2");
      const link1 = join(tempDir, "link1");
      
      await fs.mkdir(realDir, { recursive: true });
      await fs.symlink(realDir, link2);
      await fs.symlink(link2, link1);

      // Project registered with real path
      await writeProject(storeRoot, "proj_chain", realDir);
      await writeSession(storeRoot, "proj_chain", "session_chain", realDir, "Chain project");

      // Run from link1 (process.cwd() resolves all the way to realDir)
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(link1)
        .quiet();
      const result = await runCliWithTimeout(shellPromise);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      // This should pass because process.cwd() resolves the full chain to realDir
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(1);
      expect(parsed.data[0].sessionId).toBe("session_chain");
    } finally {
      await cleanup();
    }
  });

  it("BUG: handles project registered via symlink chain", async () => {
    const { tempDir, storeRoot, cleanup } = await createTempStore();
    try {
      // Create chain: link1 -> link2 -> realDir
      const realDir = join(tempDir, "real-deep-project");
      const link2 = join(tempDir, "link2");
      const link1 = join(tempDir, "link1");
      
      await fs.mkdir(realDir, { recursive: true });
      await fs.symlink(realDir, link2);
      await fs.symlink(link2, link1);

      // Project registered with symlink path (link1)
      await writeProject(storeRoot, "proj_via_link", link1);
      await writeSession(storeRoot, "proj_via_link", "session_via_link", realDir, "Via link chain");

      // Run from realDir (process.cwd() returns realDir)
      const shellPromise = $`bun ${CLI_PATH} sessions list --root ${storeRoot} --format json`
        .cwd(realDir)
        .quiet();
      const result = await runCliWithTimeout(shellPromise);
      const output = result.stdout.toString();
      const parsed = JSON.parse(output);

      // BUG: Currently fails - worktree (link1) doesn't match cwd (realDir)
      // FIX: Resolve worktree symlinks with fs.realpath()
      expect(parsed.ok).toBe(true);
      expect(parsed.data).toBeArray();
      expect(parsed.data.length).toBe(1);
      expect(parsed.data[0].sessionId).toBe("session_via_link");
    } finally {
      await cleanup();
    }
  });
});
