/**
 * Tests for table output formatter.
 */

import { describe, expect, it } from "bun:test"
import {
  truncate,
  pad,
  formatCell,
  formatRow,
  formatHeader,
  formatHeaderUnderline,
  formatTable,
  formatDateForTable,
  formatProjectState,
  projectListColumns,
  projectListColumnsCompact,
  formatProjectsTable,
  sessionListColumns,
  sessionListColumnsCompact,
  formatSessionsTable,
  formatChatRole,
  formatTokenCount,
  chatListColumns,
  chatListColumnsCompact,
  formatChatTable,
  type ColumnDefinition,
} from "../../../src/cli/formatters/table"
import type { ChatMessage, ProjectRecord, SessionRecord } from "../../../src/lib/opencode-data"

// ========================
// Helper Test Data
// ========================

interface TestRecord {
  id: number
  name: string
  status: string
}

const testColumns: ColumnDefinition<TestRecord>[] = [
  { header: "ID", width: 4, align: "right", accessor: (r) => r.id },
  { header: "Name", width: 10, align: "left", accessor: (r) => r.name },
  { header: "Status", width: 8, align: "center", accessor: (r) => r.status },
]

const testData: TestRecord[] = [
  { id: 1, name: "Alpha", status: "active" },
  { id: 2, name: "Beta", status: "pending" },
  { id: 123, name: "LongNameThatExceedsWidth", status: "done" },
]

// ========================
// truncate tests
// ========================

describe("truncate", () => {
  it("should return text unchanged if within width", () => {
    expect(truncate("hello", 10)).toBe("hello")
  })

  it("should return text unchanged if exactly at width", () => {
    expect(truncate("hello", 5)).toBe("hello")
  })

  it("should truncate and add suffix if text exceeds width", () => {
    expect(truncate("hello world", 8)).toBe("hello w…")
  })

  it("should use custom suffix", () => {
    expect(truncate("hello world", 8, "...")).toBe("hello...")
  })

  it("should handle width smaller than suffix", () => {
    expect(truncate("hello", 2, "...")).toBe("..")
  })

  it("should handle empty string", () => {
    expect(truncate("", 5)).toBe("")
  })
})

// ========================
// pad tests
// ========================

describe("pad", () => {
  it("should pad left-aligned text", () => {
    expect(pad("hi", 5, "left")).toBe("hi   ")
  })

  it("should pad right-aligned text", () => {
    expect(pad("hi", 5, "right")).toBe("   hi")
  })

  it("should pad center-aligned text", () => {
    expect(pad("hi", 6, "center")).toBe("  hi  ")
  })

  it("should handle odd padding for center alignment", () => {
    expect(pad("hi", 5, "center")).toBe(" hi  ")
  })

  it("should return text unchanged if at or over width", () => {
    expect(pad("hello", 5, "left")).toBe("hello")
    expect(pad("hello", 3, "left")).toBe("hello")
  })

  it("should default to left alignment", () => {
    expect(pad("hi", 5)).toBe("hi   ")
  })
})

// ========================
// formatCell tests
// ========================

describe("formatCell", () => {
  it("should format string value", () => {
    expect(formatCell("test", 6, "left")).toBe("test  ")
  })

  it("should format number value", () => {
    expect(formatCell(42, 5, "right")).toBe("   42")
  })

  it("should format null as empty string", () => {
    expect(formatCell(null, 5, "left")).toBe("     ")
  })

  it("should format undefined as empty string", () => {
    expect(formatCell(undefined, 5, "left")).toBe("     ")
  })

  it("should truncate and pad", () => {
    expect(formatCell("hello world", 8, "left")).toBe("hello w…")
  })
})

// ========================
// formatRow tests
// ========================

describe("formatRow", () => {
  it("should format a row with multiple columns", () => {
    const row: TestRecord = { id: 1, name: "Test", status: "ok" }
    const result = formatRow(row, testColumns)
    // ID (4, right) + sep (2) + Name (10, left) + sep (2) + Status (8, center="   ok   ")
    expect(result).toBe("   1  Test           ok   ")
  })

  it("should use custom separator", () => {
    const row: TestRecord = { id: 1, name: "Test", status: "ok" }
    const result = formatRow(row, testColumns, { separator: " | " })
    expect(result).toBe("   1 | Test       |    ok   ")
  })

  it("should truncate long values", () => {
    const row: TestRecord = { id: 999, name: "VeryLongName", status: "active" }
    const result = formatRow(row, testColumns)
    // Name should be truncated to 10 chars with "…"
    expect(result).toBe(" 999  VeryLongN…   active ")
  })
})

// ========================
// formatHeader tests
// ========================

describe("formatHeader", () => {
  it("should format header row", () => {
    const result = formatHeader(testColumns)
    // ID (4, right) + sep (2) + Name (10, left) + sep (2) + Status (8, center=" Status ")
    expect(result).toBe("  ID  Name         Status ")
  })

  it("should use custom separator", () => {
    const result = formatHeader(testColumns, { separator: " | " })
    expect(result).toBe("  ID | Name       |  Status ")
  })
})

// ========================
// formatHeaderUnderline tests
// ========================

describe("formatHeaderUnderline", () => {
  it("should create underline matching column widths", () => {
    const result = formatHeaderUnderline(testColumns)
    expect(result).toBe("----  ----------  --------")
  })

  it("should use custom underline character", () => {
    const result = formatHeaderUnderline(testColumns, { headerUnderline: "=" })
    expect(result).toBe("====  ==========  ========")
  })
})

// ========================
// formatTable tests
// ========================

describe("formatTable", () => {
  it("should format complete table with headers", () => {
    const result = formatTable(testData.slice(0, 2), testColumns)
    const lines = result.split("\n")
    expect(lines.length).toBe(4) // header + underline + 2 data rows
    expect(lines[0]).toBe("  ID  Name         Status ")
    expect(lines[1]).toBe("----  ----------  --------")
    expect(lines[2]).toBe("   1  Alpha        active ")
    expect(lines[3]).toBe("   2  Beta        pending ")
  })

  it("should format table without headers", () => {
    const result = formatTable(testData.slice(0, 1), testColumns, { showHeaders: false })
    const lines = result.split("\n")
    expect(lines.length).toBe(1)
    expect(lines[0]).toBe("   1  Alpha        active ")
  })

  it("should format table without underline", () => {
    const result = formatTable(testData.slice(0, 1), testColumns, { showUnderline: false })
    const lines = result.split("\n")
    expect(lines.length).toBe(2) // header + 1 data row
    expect(lines[0]).toBe("  ID  Name         Status ")
    expect(lines[1]).toBe("   1  Alpha        active ")
  })

  it("should format empty table", () => {
    const result = formatTable([], testColumns)
    const lines = result.split("\n")
    expect(lines.length).toBe(2) // header + underline only
  })
})

// ========================
// formatDateForTable tests
// ========================

describe("formatDateForTable", () => {
  it("should format date as YYYY-MM-DD HH:MM", () => {
    const date = new Date("2024-01-15T10:30:45.000Z")
    expect(formatDateForTable(date)).toBe("2024-01-15 10:30")
  })

  it("should return dash for null", () => {
    expect(formatDateForTable(null)).toBe("-")
  })

  it("should return dash for undefined", () => {
    expect(formatDateForTable(undefined)).toBe("-")
  })
})

// ========================
// formatProjectState tests
// ========================

describe("formatProjectState", () => {
  it("should format present state with checkmark", () => {
    expect(formatProjectState("present")).toBe("✓")
  })

  it("should format missing state with X", () => {
    expect(formatProjectState("missing")).toBe("✗")
  })

  it("should format unknown state with question mark", () => {
    expect(formatProjectState("unknown")).toBe("?")
  })
})

// ========================
// projectListColumns tests
// ========================

describe("projectListColumns", () => {
  const mockProject: ProjectRecord = {
    index: 1,
    bucket: "project",
    filePath: "/path/to/project.json",
    projectId: "proj-abc123",
    worktree: "/home/user/projects/my-project",
    vcs: "git",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    state: "present",
  }

  it("should have correct column count", () => {
    expect(projectListColumns.length).toBe(5)
  })

  it("should have index column", () => {
    const col = projectListColumns.find((c) => c.header === "#")
    expect(col).toBeDefined()
    expect(col!.accessor(mockProject)).toBe(1)
    expect(col!.align).toBe("right")
  })

  it("should have state column with formatter", () => {
    const col = projectListColumns.find((c) => c.header === "State")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    const state = col!.accessor(mockProject)
    expect(col!.format!(state)).toBe("✓")
  })

  it("should have path column", () => {
    const col = projectListColumns.find((c) => c.header === "Path")
    expect(col).toBeDefined()
    expect(col!.accessor(mockProject)).toBe("/home/user/projects/my-project")
  })

  it("should have projectId column", () => {
    const col = projectListColumns.find((c) => c.header === "Project ID")
    expect(col).toBeDefined()
    expect(col!.accessor(mockProject)).toBe("proj-abc123")
  })

  it("should have created column with date formatter", () => {
    const col = projectListColumns.find((c) => c.header === "Created")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    const date = col!.accessor(mockProject)
    expect(col!.format!(date)).toBe("2024-01-15 10:30")
  })
})

// ========================
// formatProjectsTable tests
// ========================

describe("formatProjectsTable", () => {
  const mockProjects: ProjectRecord[] = [
    {
      index: 1,
      bucket: "project",
      filePath: "/path/to/project1.json",
      projectId: "proj-abc123",
      worktree: "/home/user/projects/my-project",
      vcs: "git",
      createdAt: new Date("2024-01-15T10:30:00.000Z"),
      state: "present",
    },
    {
      index: 2,
      bucket: "project",
      filePath: "/path/to/project2.json",
      projectId: "proj-def456",
      worktree: "/home/user/work/another-project",
      vcs: null,
      createdAt: null,
      state: "missing",
    },
  ]

  it("should format projects table with headers", () => {
    const result = formatProjectsTable(mockProjects)
    const lines = result.split("\n")
    expect(lines.length).toBe(4) // header + underline + 2 rows
    expect(lines[0]).toContain("#")
    expect(lines[0]).toContain("State")
    expect(lines[0]).toContain("Path")
  })

  it("should format projects with correct state symbols", () => {
    const result = formatProjectsTable(mockProjects)
    expect(result).toContain("✓") // present
    expect(result).toContain("✗") // missing
  })

  it("should use compact columns when specified", () => {
    const result = formatProjectsTable(mockProjects, { compact: true })
    const lines = result.split("\n")
    // Compact header should be shorter (no "Created" column)
    expect(lines[0]).not.toContain("Created")
  })

  it("should format empty projects list", () => {
    const result = formatProjectsTable([])
    const lines = result.split("\n")
    expect(lines.length).toBe(2) // header + underline only
  })
})

// ========================
// sessionListColumns tests
// ========================

describe("sessionListColumns", () => {
  const mockSession: SessionRecord = {
    index: 1,
    filePath: "/path/to/session.json",
    sessionId: "sess-abc123",
    projectId: "proj-xyz789",
    directory: "/home/user/projects/my-project",
    title: "Implement feature X",
    version: "1.0.0",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    updatedAt: new Date("2024-01-16T14:45:00.000Z"),
  }

  it("should have correct column count", () => {
    expect(sessionListColumns.length).toBe(6)
  })

  it("should have index column", () => {
    const col = sessionListColumns.find((c) => c.header === "#")
    expect(col).toBeDefined()
    expect(col!.accessor(mockSession)).toBe(1)
    expect(col!.align).toBe("right")
  })

  it("should have title column", () => {
    const col = sessionListColumns.find((c) => c.header === "Title")
    expect(col).toBeDefined()
    expect(col!.accessor(mockSession)).toBe("Implement feature X")
    expect(col!.width).toBe(40)
  })

  it("should have sessionId column", () => {
    const col = sessionListColumns.find((c) => c.header === "Session ID")
    expect(col).toBeDefined()
    expect(col!.accessor(mockSession)).toBe("sess-abc123")
  })

  it("should have projectId column", () => {
    const col = sessionListColumns.find((c) => c.header === "Project ID")
    expect(col).toBeDefined()
    expect(col!.accessor(mockSession)).toBe("proj-xyz789")
  })

  it("should have updated column with date formatter", () => {
    const col = sessionListColumns.find((c) => c.header === "Updated")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    const date = col!.accessor(mockSession)
    expect(col!.format!(date)).toBe("2024-01-16 14:45")
  })

  it("should have created column with date formatter", () => {
    const col = sessionListColumns.find((c) => c.header === "Created")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    const date = col!.accessor(mockSession)
    expect(col!.format!(date)).toBe("2024-01-15 10:30")
  })
})

// ========================
// sessionListColumnsCompact tests
// ========================

describe("sessionListColumnsCompact", () => {
  const mockSession: SessionRecord = {
    index: 2,
    filePath: "/path/to/session.json",
    sessionId: "sess-def456",
    projectId: "proj-abc123",
    directory: "/home/user/work/another-project",
    title: "Fix bug in authentication",
    version: "1.0.0",
    createdAt: new Date("2024-01-10T08:00:00.000Z"),
    updatedAt: new Date("2024-01-12T16:30:00.000Z"),
  }

  it("should have fewer columns than full version", () => {
    expect(sessionListColumnsCompact.length).toBeLessThan(sessionListColumns.length)
    expect(sessionListColumnsCompact.length).toBe(4)
  })

  it("should not have projectId column", () => {
    const col = sessionListColumnsCompact.find((c) => c.header === "Project ID")
    expect(col).toBeUndefined()
  })

  it("should not have created column", () => {
    const col = sessionListColumnsCompact.find((c) => c.header === "Created")
    expect(col).toBeUndefined()
  })

  it("should have narrower title column", () => {
    const col = sessionListColumnsCompact.find((c) => c.header === "Title")
    expect(col).toBeDefined()
    expect(col!.width).toBe(30)
  })

  it("should have narrower sessionId column", () => {
    const col = sessionListColumnsCompact.find((c) => c.header === "Session ID")
    expect(col).toBeDefined()
    expect(col!.width).toBe(20)
  })
})

// ========================
// formatSessionsTable tests
// ========================

describe("formatSessionsTable", () => {
  const mockSessions: SessionRecord[] = [
    {
      index: 1,
      filePath: "/path/to/session1.json",
      sessionId: "sess-abc123",
      projectId: "proj-xyz789",
      directory: "/home/user/projects/my-project",
      title: "Implement feature X",
      version: "1.0.0",
      createdAt: new Date("2024-01-15T10:30:00.000Z"),
      updatedAt: new Date("2024-01-16T14:45:00.000Z"),
    },
    {
      index: 2,
      filePath: "/path/to/session2.json",
      sessionId: "sess-def456",
      projectId: "proj-abc123",
      directory: "/home/user/work/another-project",
      title: "Fix critical bug in authentication module",
      version: "1.0.0",
      createdAt: new Date("2024-01-10T08:00:00.000Z"),
      updatedAt: null,
    },
  ]

  it("should format sessions table with headers", () => {
    const result = formatSessionsTable(mockSessions)
    const lines = result.split("\n")
    expect(lines.length).toBe(4) // header + underline + 2 rows
    expect(lines[0]).toContain("#")
    expect(lines[0]).toContain("Title")
    expect(lines[0]).toContain("Session ID")
    expect(lines[0]).toContain("Project ID")
    expect(lines[0]).toContain("Updated")
    expect(lines[0]).toContain("Created")
  })

  it("should truncate long titles", () => {
    const result = formatSessionsTable(mockSessions)
    // Second session has a long title that should be truncated (40 char column width)
    // "Fix critical bug in authentication module" is 41 chars, gets truncated
    expect(result).toContain("Fix critical bug in authentication modu…")
  })

  it("should format null dates as dash", () => {
    const result = formatSessionsTable(mockSessions)
    // Second session has null updatedAt
    expect(result).toContain("-")
  })

  it("should use compact columns when specified", () => {
    const result = formatSessionsTable(mockSessions, { compact: true })
    const lines = result.split("\n")
    // Compact header should not have "Project ID" or "Created" columns
    expect(lines[0]).not.toContain("Project ID")
    expect(lines[0]).not.toContain("Created")
    expect(lines[0]).toContain("Title")
    expect(lines[0]).toContain("Session ID")
    expect(lines[0]).toContain("Updated")
  })

  it("should format empty sessions list", () => {
    const result = formatSessionsTable([])
    const lines = result.split("\n")
    expect(lines.length).toBe(2) // header + underline only
  })

  it("should handle custom separator", () => {
    const result = formatSessionsTable(mockSessions, { separator: " | " })
    expect(result).toContain(" | ")
  })
})

// ========================
// formatChatRole tests
// ========================

describe("formatChatRole", () => {
  it("should format user role as U", () => {
    expect(formatChatRole("user")).toBe("U")
  })

  it("should format assistant role as A", () => {
    expect(formatChatRole("assistant")).toBe("A")
  })

  it("should format unknown role as ?", () => {
    expect(formatChatRole("unknown")).toBe("?")
  })
})

// ========================
// formatTokenCount tests
// ========================

describe("formatTokenCount", () => {
  it("should format null as dash", () => {
    expect(formatTokenCount(null)).toBe("-")
  })

  it("should format undefined as dash", () => {
    expect(formatTokenCount(undefined)).toBe("-")
  })

  it("should format zero as dash", () => {
    expect(formatTokenCount(0)).toBe("-")
  })

  it("should format small numbers as-is", () => {
    expect(formatTokenCount(123)).toBe("123")
    expect(formatTokenCount(999)).toBe("999")
  })

  it("should format thousands with K suffix", () => {
    expect(formatTokenCount(1000)).toBe("1.0K")
    expect(formatTokenCount(1500)).toBe("1.5K")
    expect(formatTokenCount(12345)).toBe("12.3K")
  })
})

// ========================
// chatListColumns tests
// ========================

describe("chatListColumns", () => {
  const mockMessage: ChatMessage & { index: number } = {
    index: 1,
    sessionId: "sess-abc123",
    messageId: "msg-xyz789",
    role: "assistant",
    createdAt: new Date("2024-01-15T10:30:00.000Z"),
    parentId: "msg-parent",
    tokens: {
      input: 1000,
      output: 500,
      reasoning: 200,
      cacheRead: 100,
      cacheWrite: 50,
      total: 1850,
    },
    parts: null,
    previewText: "Here is the implementation...",
    totalChars: null,
  }

  it("should have correct column count", () => {
    expect(chatListColumns.length).toBe(6)
  })

  it("should have index column", () => {
    const col = chatListColumns.find((c) => c.header === "#")
    expect(col).toBeDefined()
    expect(col!.accessor(mockMessage)).toBe(1)
    expect(col!.align).toBe("right")
  })

  it("should have role column with formatter", () => {
    const col = chatListColumns.find((c) => c.header === "Role")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    const role = col!.accessor(mockMessage)
    expect(col!.format!(role)).toBe("A")
  })

  it("should have messageId column", () => {
    const col = chatListColumns.find((c) => c.header === "Message ID")
    expect(col).toBeDefined()
    expect(col!.accessor(mockMessage)).toBe("msg-xyz789")
  })

  it("should have preview column", () => {
    const col = chatListColumns.find((c) => c.header === "Preview")
    expect(col).toBeDefined()
    expect(col!.accessor(mockMessage)).toBe("Here is the implementation...")
    expect(col!.width).toBe(40)
  })

  it("should have tokens column with formatter", () => {
    const col = chatListColumns.find((c) => c.header === "Tokens")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    expect(col!.align).toBe("right")
    const tokens = col!.accessor(mockMessage)
    expect(col!.format!(tokens)).toBe("1.9K")
  })

  it("should have created column with date formatter", () => {
    const col = chatListColumns.find((c) => c.header === "Created")
    expect(col).toBeDefined()
    expect(col!.format).toBeDefined()
    const date = col!.accessor(mockMessage)
    expect(col!.format!(date)).toBe("2024-01-15 10:30")
  })

  it("should handle user messages without tokens", () => {
    const userMessage: ChatMessage & { index: number } = {
      ...mockMessage,
      index: 2,
      role: "user",
      tokens: undefined,
    }
    const roleCol = chatListColumns.find((c) => c.header === "Role")
    const tokensCol = chatListColumns.find((c) => c.header === "Tokens")
    expect(roleCol!.format!(roleCol!.accessor(userMessage))).toBe("U")
    expect(tokensCol!.format!(tokensCol!.accessor(userMessage))).toBe("-")
  })
})

// ========================
// chatListColumnsCompact tests
// ========================

describe("chatListColumnsCompact", () => {
  const mockMessage: ChatMessage & { index: number } = {
    index: 3,
    sessionId: "sess-abc123",
    messageId: "msg-def456",
    role: "user",
    createdAt: new Date("2024-01-15T09:00:00.000Z"),
    tokens: undefined,
    parts: null,
    previewText: "Can you help me with this code?",
    totalChars: null,
  }

  it("should have fewer columns than full version", () => {
    expect(chatListColumnsCompact.length).toBeLessThan(chatListColumns.length)
    expect(chatListColumnsCompact.length).toBe(4)
  })

  it("should not have messageId column", () => {
    const col = chatListColumnsCompact.find((c) => c.header === "Message ID")
    expect(col).toBeUndefined()
  })

  it("should not have created column", () => {
    const col = chatListColumnsCompact.find((c) => c.header === "Created")
    expect(col).toBeUndefined()
  })

  it("should have narrower role column (R)", () => {
    const col = chatListColumnsCompact.find((c) => c.header === "R")
    expect(col).toBeDefined()
    expect(col!.width).toBe(1)
  })

  it("should have wider preview column", () => {
    const col = chatListColumnsCompact.find((c) => c.header === "Preview")
    expect(col).toBeDefined()
    expect(col!.width).toBe(50)
  })
})

// ========================
// formatChatTable tests
// ========================

describe("formatChatTable", () => {
  const mockMessages: (ChatMessage & { index: number })[] = [
    {
      index: 1,
      sessionId: "sess-abc123",
      messageId: "msg-001",
      role: "user",
      createdAt: new Date("2024-01-15T10:00:00.000Z"),
      tokens: undefined,
      parts: null,
      previewText: "How do I implement a REST API?",
      totalChars: null,
    },
    {
      index: 2,
      sessionId: "sess-abc123",
      messageId: "msg-002",
      role: "assistant",
      createdAt: new Date("2024-01-15T10:01:00.000Z"),
      tokens: {
        input: 500,
        output: 1200,
        reasoning: 300,
        cacheRead: 0,
        cacheWrite: 0,
        total: 2000,
      },
      parts: null,
      previewText: "I can help you implement a REST API. Here are the steps...",
      totalChars: null,
    },
  ]

  it("should format chat table with headers", () => {
    const result = formatChatTable(mockMessages)
    const lines = result.split("\n")
    expect(lines.length).toBe(4) // header + underline + 2 rows
    expect(lines[0]).toContain("#")
    expect(lines[0]).toContain("Role")
    expect(lines[0]).toContain("Message ID")
    expect(lines[0]).toContain("Preview")
    expect(lines[0]).toContain("Tokens")
    expect(lines[0]).toContain("Created")
  })

  it("should format roles correctly", () => {
    const result = formatChatTable(mockMessages)
    expect(result).toContain(" U ") // user role
    expect(result).toContain(" A ") // assistant role
  })

  it("should format tokens correctly", () => {
    const result = formatChatTable(mockMessages)
    expect(result).toContain("2.0K") // assistant tokens
    expect(result).toContain("-") // user has no tokens
  })

  it("should truncate long previews", () => {
    const result = formatChatTable(mockMessages)
    // Second message has a long preview that should be truncated (40 char column width)
    // "I can help you implement a REST API. Here are the steps..." is 58 chars
    expect(result).toContain("I can help you implement a REST API. He…")
  })

  it("should use compact columns when specified", () => {
    const result = formatChatTable(mockMessages, { compact: true })
    const lines = result.split("\n")
    // Compact header should not have "Message ID" or "Created" columns
    expect(lines[0]).not.toContain("Message ID")
    expect(lines[0]).not.toContain("Created")
    expect(lines[0]).toContain("Preview")
    expect(lines[0]).toContain("Tokens")
  })

  it("should format empty chat list", () => {
    const result = formatChatTable([])
    const lines = result.split("\n")
    expect(lines.length).toBe(2) // header + underline only
  })

  it("should handle custom separator", () => {
    const result = formatChatTable(mockMessages, { separator: " | " })
    expect(result).toContain(" | ")
  })
})
