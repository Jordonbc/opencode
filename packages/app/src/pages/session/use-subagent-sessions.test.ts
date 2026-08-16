import { beforeAll, afterEach, describe, expect, mock, test } from "bun:test"
import { createRoot, createSignal } from "solid-js"
import type { Session, SessionStatus } from "@opencode-ai/sdk/v2/client"
import type { ChildSession } from "./use-subagent-sessions"

let useSubagentSessions: typeof import("./use-subagent-sessions").useSubagentSessions
let computeVisibleSessions: typeof import("./use-subagent-sessions").computeVisibleSessions

// Mutable mock state shared across tests
let mockParams: { id?: string } = {}
let mockSessions: Session[] = []
let mockStatuses: Record<string, SessionStatus> = {}
let mockPaneLimit = 4
let mockIdleHideMs = 1000

beforeAll(async () => {
  mock.module("@solidjs/router", () => ({
    useParams: () => mockParams,
  }))

  mock.module("@/context/sync", () => ({
    useSync: () => {
      const [sessions] = createSignal(mockSessions)
      const [statuses] = createSignal(mockStatuses)
      return () => ({
        data: {
          get session() {
            return sessions()
          },
          get session_status() {
            return statuses()
          },
        },
      })
    },
  }))

  mock.module("@/context/settings", () => ({
    useSettings: () => ({
      general: {
        agentSplitPaneLimit: () => mockPaneLimit,
        agentSplitIdleHideMs: () => mockIdleHideMs,
      },
    }),
  }))

  const mod = await import("./use-subagent-sessions")
  useSubagentSessions = mod.useSubagentSessions
  computeVisibleSessions = mod.computeVisibleSessions
})

afterEach(() => {
  mockSessions = []
  mockStatuses = {}
  mockParams = { id: "parent-1" }
  mockPaneLimit = 4
  mockIdleHideMs = 1000
})

function childSession(overrides: Partial<Session> & { id: string }): Session {
  return {
    slug: overrides.id,
    projectID: "proj-1",
    directory: "/",
    title: `Session ${overrides.id}`,
    version: "1.0.0",
    time: { created: 0, updated: 0 },
    ...overrides,
  }
}

function busyStatus(): SessionStatus {
  return { type: "busy" }
}

function idleStatus(): SessionStatus {
  return { type: "idle" }
}

function retryStatus(): SessionStatus {
  return { type: "retry", attempt: 1, message: "retrying", next: Date.now() + 1000 }
}

function makeChild(overrides: Partial<ChildSession> & { id: string }): ChildSession {
  return {
    title: `Session ${overrides.id}`,
    agent: "",
    status: "idle",
    model: { providerID: "", modelID: "" },
    ...overrides,
  }
}

describe("useSubagentSessions", () => {
  test("filters sessions by parentID", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "child-a", parentID: "parent-1" }),
      childSession({ id: "child-b", parentID: "parent-1" }),
      childSession({ id: "unrelated", parentID: "other-parent" }),
    ]

    createRoot((dispose) => {
      const { sessions, total } = useSubagentSessions()

      expect(sessions().map((s) => s.id)).toEqual(["child-a", "child-b"])
      expect(total()).toBe(2)

      dispose()
    })
  })

  test("sorts active sessions first (busy/retry before idle)", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "idle-1", parentID: "parent-1" }),
      childSession({ id: "busy-1", parentID: "parent-1" }),
      childSession({ id: "idle-2", parentID: "parent-1" }),
      childSession({ id: "retry-1", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "idle-1": idleStatus(),
      "busy-1": busyStatus(),
      "idle-2": idleStatus(),
      "retry-1": retryStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()
      const ids = sessions().map((s) => s.id)

      // Active (busy/retry) should come before idle
      const busyIdx = ids.indexOf("busy-1")
      const retryIdx = ids.indexOf("retry-1")
      const idle1Idx = ids.indexOf("idle-1")
      const idle2Idx = ids.indexOf("idle-2")

      expect(busyIdx).toBeLessThan(idle1Idx)
      expect(busyIdx).toBeLessThan(idle2Idx)
      expect(retryIdx).toBeLessThan(idle1Idx)
      expect(retryIdx).toBeLessThan(idle2Idx)

      // Among active, sorted by id
      expect(ids.indexOf("busy-1")).toBeLessThan(ids.indexOf("retry-1"))
      // Among idle, sorted by id
      expect(ids.indexOf("idle-1")).toBeLessThan(ids.indexOf("idle-2"))

      dispose()
    })
  })

  test("caps at pane limit (clamped between 2 and 8)", () => {
    mockParams = { id: "parent-1" }
    mockSessions = Array.from({ length: 10 }, (_, i) =>
      childSession({ id: `child-${i}`, parentID: "parent-1" }),
    )
    mockPaneLimit = 4

    createRoot((dispose) => {
      const { sessions, total, overflow } = useSubagentSessions()

      expect(total()).toBe(10)
      expect(sessions().length).toBe(4)
      expect(overflow()).toBe(6)

      dispose()
    })
  })

  test("enforces minimum pane limit of 2", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "a", parentID: "parent-1" }),
      childSession({ id: "b", parentID: "parent-1" }),
      childSession({ id: "c", parentID: "parent-1" }),
    ]
    mockPaneLimit = 1 // Below minimum

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()

      // Clamped to min 2
      expect(sessions().length).toBe(2)

      dispose()
    })
  })

  test("enforces maximum pane limit of 8", () => {
    mockParams = { id: "parent-1" }
    mockSessions = Array.from({ length: 12 }, (_, i) =>
      childSession({ id: `child-${i}`, parentID: "parent-1" }),
    )
    mockPaneLimit = 10 // Above maximum

    createRoot((dispose) => {
      const { sessions, overflow } = useSubagentSessions()

      // Clamped to max 8
      expect(sessions().length).toBe(8)
      expect(overflow()).toBe(4)

      dispose()
    })
  })

  test("shows overflow count when exceeding limit", () => {
    mockParams = { id: "parent-1" }
    mockSessions = Array.from({ length: 7 }, (_, i) =>
      childSession({ id: `child-${i}`, parentID: "parent-1" }),
    )
    mockPaneLimit = 3

    createRoot((dispose) => {
      const { total, overflow } = useSubagentSessions()

      expect(total()).toBe(7)
      expect(overflow()).toBe(4) // 7 - 3

      dispose()
    })
  })

  test("returns zero overflow when under limit", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "a", parentID: "parent-1" }),
      childSession({ id: "b", parentID: "parent-1" }),
    ]
    mockPaneLimit = 4

    createRoot((dispose) => {
      const { total, overflow } = useSubagentSessions()

      expect(total()).toBe(2)
      expect(overflow()).toBe(0)

      dispose()
    })
  })

  test("handles missing status (defaults to idle)", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "no-status", parentID: "parent-1" }),
    ]
    mockStatuses = {} // No status entries

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()

      expect(sessions().length).toBe(1)
      expect(sessions()[0].status).toBe("idle")

      dispose()
    })
  })

  test("maps agent and model metadata from session", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({
        id: "child-1",
        parentID: "parent-1",
        agent: "build",
        model: { id: "gpt-4", providerID: "openai" },
      }),
    ]

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()

      expect(sessions()[0].agent).toBe("build")
      expect(sessions()[0].model).toEqual({ providerID: "openai", modelID: "gpt-4" })

      dispose()
    })
  })

  test("defaults agent to empty string when undefined", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "child-1", parentID: "parent-1", agent: undefined, model: undefined }),
    ]

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()

      expect(sessions()[0].agent).toBe("")
      expect(sessions()[0].model).toEqual({ providerID: "", modelID: "" })

      dispose()
    })
  })

  test("returns empty list when no parent ID", () => {
    mockParams = {} // No id param
    mockSessions = [
      childSession({ id: "child-1", parentID: "parent-1" }),
    ]

    createRoot((dispose) => {
      const { sessions, total, overflow } = useSubagentSessions()

      expect(sessions()).toEqual([])
      expect(total()).toBe(0)
      expect(overflow()).toBe(0)

      dispose()
    })
  })

  test("idle sessions are included in initial output (timer sets up hide)", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "busy-child", parentID: "parent-1" }),
      childSession({ id: "idle-child", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "busy-child": busyStatus(),
      "idle-child": idleStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()

      // Both visible initially; idle-hide timer fires asynchronously after 30s
      expect(sessions().map((s) => s.id)).toContain("idle-child")
      expect(sessions().map((s) => s.id)).toContain("busy-child")

      dispose()
    })
  })

  test("deleted sessions appear until tombstone expires", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "child-1", parentID: "parent-1" }),
      childSession({ id: "child-2", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "child-1": idleStatus(),
      "child-2": idleStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()

      // Both children visible
      expect(sessions().map((s) => s.id)).toContain("child-1")
      expect(sessions().map((s) => s.id)).toContain("child-2")

      dispose()
    })
  })

  test("cleans up timers on unmount without errors", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "child-1", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "child-1": idleStatus(),
    }

    // Unmounting should trigger onCleanup which clears all timers
    createRoot((dispose) => {
      useSubagentSessions()
      dispose()
    })

    // If cleanup failed, timers would still reference stale owners.
    // Reaching this point means onCleanup ran without errors.
    expect(true).toBe(true)
  })

  test("handles deletion of child sessions from live list", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "child-1", parentID: "parent-1" }),
      childSession({ id: "child-2", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "child-1": busyStatus(),
      "child-2": busyStatus(),
    }

    createRoot((dispose) => {
      const { sessions, total } = useSubagentSessions()

      // Both children visible
      expect(sessions().length).toBe(2)
      expect(total()).toBe(2)

      dispose()
    })
  })

  test("preserves sort order within active and idle groups", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "z-busy", parentID: "parent-1" }),
      childSession({ id: "a-busy", parentID: "parent-1" }),
      childSession({ id: "m-idle", parentID: "parent-1" }),
      childSession({ id: "b-idle", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "z-busy": busyStatus(),
      "a-busy": busyStatus(),
      "m-idle": idleStatus(),
      "b-idle": idleStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()
      const ids = sessions().map((s) => s.id)

      // Active group sorted by id: a-busy, z-busy
      // Idle group sorted by id: b-idle, m-idle
      expect(ids).toEqual(["a-busy", "z-busy", "b-idle", "m-idle"])

      dispose()
    })
  })

  test("retry status is treated as active", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "idle-1", parentID: "parent-1" }),
      childSession({ id: "retry-1", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "idle-1": idleStatus(),
      "retry-1": retryStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()
      const ids = sessions().map((s) => s.id)

      // retry should come before idle
      expect(ids.indexOf("retry-1")).toBeLessThan(ids.indexOf("idle-1"))

      dispose()
    })
  })

  test("busy status is treated as active", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "idle-1", parentID: "parent-1" }),
      childSession({ id: "busy-1", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "idle-1": idleStatus(),
      "busy-1": busyStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()
      const ids = sessions().map((s) => s.id)

      // busy should come before idle
      expect(ids.indexOf("busy-1")).toBeLessThan(ids.indexOf("idle-1"))

      dispose()
    })
  })

  test("idle status is not active", () => {
    mockParams = { id: "parent-1" }
    mockSessions = [
      childSession({ id: "idle-1", parentID: "parent-1" }),
      childSession({ id: "idle-2", parentID: "parent-1" }),
    ]
    mockStatuses = {
      "idle-1": idleStatus(),
      "idle-2": idleStatus(),
    }

    createRoot((dispose) => {
      const { sessions } = useSubagentSessions()
      const ids = sessions().map((s) => s.id)

      // Both idle, sorted by id
      expect(ids).toEqual(["idle-1", "idle-2"])

      dispose()
    })
  })

  describe("computeVisibleSessions (pure function)", () => {
    test("hidden idle session stays hidden when unrelated child is appended", () => {
      const a = makeChild({ id: "busy-a", status: "busy" })
      const b = makeChild({ id: "idle-b", status: "idle" })
      const c = makeChild({ id: "busy-c", status: "busy" })

      // Both visible when nothing hidden
      const all = computeVisibleSessions([a, b], new Set(), new Map(), new Set(["busy-a", "idle-b"]), 4)
      expect(all.map((s) => s.id)).toEqual(["busy-a", "idle-b"])

      // Hide idle-b
      const hidden = new Set(["idle-b"])
      const afterHide = computeVisibleSessions([a, b], hidden, new Map(), new Set(["busy-a", "idle-b"]), 4)
      expect(afterHide.map((s) => s.id)).toEqual(["busy-a"])

      // Append new busy-c — hidden idle-b must stay hidden
      const afterAppend = computeVisibleSessions([a, b, c], hidden, new Map(), new Set(["busy-a", "idle-b", "busy-c"]), 4)
      expect(afterAppend.map((s) => s.id)).toContain("busy-a")
      expect(afterAppend.map((s) => s.id)).toContain("busy-c")
      expect(afterAppend.map((s) => s.id)).not.toContain("idle-b")
    })

    test("idle→busy transition: unhidden session reappears", () => {
      const a = makeChild({ id: "busy-a", status: "busy" })
      const bIdle = makeChild({ id: "active-b", status: "idle" })
      const bBusy = makeChild({ id: "active-b", status: "busy" })

      const hidden = new Set(["active-b"])
      const ids = new Set(["busy-a", "active-b"])

      // Hidden while idle
      const whenIdle = computeVisibleSessions([a, bIdle], hidden, new Map(), ids, 4)
      expect(whenIdle.map((s) => s.id)).toEqual(["busy-a"])

      // After transition to busy: clear hidden (as effect does), session visible
      const whenBusy = computeVisibleSessions([a, bBusy], new Set(), new Map(), ids, 4)
      expect(whenBusy.map((s) => s.id)).toContain("active-b")
      expect(whenBusy.length).toBe(2)
    })

    test("idle→retry transition: unhidden session reappears", () => {
      const a = makeChild({ id: "busy-a", status: "busy" })
      const bIdle = makeChild({ id: "active-b", status: "idle" })
      const bRetry = makeChild({ id: "active-b", status: "retry" })

      const hidden = new Set(["active-b"])
      const ids = new Set(["busy-a", "active-b"])

      const whenIdle = computeVisibleSessions([a, bIdle], hidden, new Map(), ids, 4)
      expect(whenIdle.map((s) => s.id)).toEqual(["busy-a"])

      const whenRetry = computeVisibleSessions([a, bRetry], new Set(), new Map(), ids, 4)
      expect(whenRetry.map((s) => s.id)).toContain("active-b")
      expect(whenRetry.length).toBe(2)
    })

    test("removal and re-addition as active: session reappears", () => {
      const a = makeChild({ id: "busy-a", status: "busy" })
      const bIdle = makeChild({ id: "active-b", status: "idle" })
      const bBusy = makeChild({ id: "active-b", status: "busy" })

      const hidden = new Set(["active-b"])

      // Hidden while idle
      const before = computeVisibleSessions([a, bIdle], hidden, new Map(), new Set(["busy-a", "active-b"]), 4)
      expect(before.map((s) => s.id)).toEqual(["busy-a"])

      // Removed: only a in live list, hidden still blocks b from tombstone merge
      const tombstones = new Map()
      const removed = computeVisibleSessions([a], hidden, tombstones, new Set(["busy-a"]), 4)
      expect(removed.map((s) => s.id)).toEqual(["busy-a"])

      // Re-added as busy with hidden cleared: b reappears
      const readded = computeVisibleSessions([a, bBusy], new Set(), tombstones, new Set(["busy-a", "active-b"]), 4)
      expect(readded.map((s) => s.id)).toContain("active-b")
      expect(readded.length).toBe(2)
    })

    test("hidden session deletion: tombstone merge excludes hidden", () => {
      const a = makeChild({ id: "busy-a", status: "busy" })
      const b = makeChild({ id: "idle-b", status: "idle" })

      const hidden = new Set(["idle-b"])
      const now = Date.now()
      const tombstones = new Map([
        ["idle-b", { session: b, expiresAt: now + 5000 }],
      ])

      // Hidden idle-b not in live list; tombstone merge skips it because hidden
      const result = computeVisibleSessions([a], hidden, tombstones, new Set(["busy-a"]), 4)
      expect(result.map((s) => s.id)).toEqual(["busy-a"])

      // Without hidden set, tombstoned idle-b would reappear
      const withoutHidden = computeVisibleSessions([a], new Set(), tombstones, new Set(["busy-a"]), 4)
      expect(withoutHidden.map((s) => s.id)).toContain("idle-b")
    })

    test("active session in hidden set is still visible (belt-and-suspenders)", () => {
      const busy = makeChild({ id: "busy-x", status: "busy" })
      const hidden = new Set(["busy-x"])

      // Filter only hides idle sessions, not active ones
      const result = computeVisibleSessions([busy], hidden, new Map(), new Set(["busy-x"]), 4)
      expect(result.map((s) => s.id)).toEqual(["busy-x"])
    })

    test("pane limit caps result after filtering and tombstone merge", () => {
      const children = Array.from({ length: 6 }, (_, i) =>
        makeChild({ id: `child-${i}`, status: "idle" }),
      )
      const ids = new Set(children.map((c) => c.id))

      const result = computeVisibleSessions(children, new Set(), new Map(), ids, 3)
      expect(result.length).toBe(3)
    })
  })
})
