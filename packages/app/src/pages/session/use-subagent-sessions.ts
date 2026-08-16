import { useParams } from "@solidjs/router"
import { createEffect, createMemo, createSignal, onCleanup, untrack } from "solid-js"
import { useSync } from "@/context/sync"
import { useSettings } from "@/context/settings"
import type { Session, SessionStatus } from "@opencode-ai/sdk/v2/client"

export type ChildSession = {
  id: string
  title: string
  agent: string
  status: "idle" | "busy" | "retry"
  model: { providerID: string; modelID: string }
}

const TOMBSTONE_MS = 5_000

function statusType(status: SessionStatus | undefined): "idle" | "busy" | "retry" {
  if (!status) return "idle"
  return status.type === "busy" || status.type === "retry" ? status.type : "idle"
}

function isActive(status: "idle" | "busy" | "retry"): boolean {
  return status === "busy" || status === "retry"
}

function toChildSession(session: Session, status: SessionStatus | undefined): ChildSession {
  return {
    id: session.id,
    title: session.title,
    agent: session.agent ?? "",
    status: statusType(status),
    model: {
      providerID: session.model?.providerID ?? "",
      modelID: session.model?.id ?? "",
    },
  }
}

function sortSessions(a: ChildSession, b: ChildSession): number {
  const aActive = isActive(a.status)
  const bActive = isActive(b.status)
  if (aActive !== bActive) return aActive ? -1 : 1
  if (a.id < b.id) return -1
  if (a.id > b.id) return 1
  return 0
}

/**
 * Pure function: compute the visible session list from children, hidden set,
 * tombstones, and pane limit. Extracted for direct testability.
 */
export function computeVisibleSessions(
  children: readonly ChildSession[],
  hidden: ReadonlySet<string>,
  tombstones: ReadonlyMap<string, { session: ChildSession; expiresAt: number }>,
  currentIDs: ReadonlySet<string>,
  limit: number,
): ChildSession[] {
  // Filter out idle-hidden sessions (active sessions always visible)
  const visible = children.filter((c) => !(c.status === "idle" && hidden.has(c.id)))

  // Merge with tombstoned sessions not currently in the live list
  const merged = [...visible]
  for (const [id, tomb] of tombstones) {
    if (!currentIDs.has(id) && !hidden.has(id)) {
      merged.push({ ...tomb.session, status: "idle" as const })
    }
  }

  return merged.sort(sortSessions).slice(0, limit)
}

export function useSubagentSessions() {
  const params = useParams()
  const sync = useSync()
  const settings = useSettings()

  const sessionID = () => params.id

  const paneLimit = createMemo(() => {
    const raw = settings.general.agentSplitPaneLimit()
    return Math.min(8, Math.max(2, raw))
  })

  const idleHideMs = createMemo(() => {
    const raw = settings.general.agentSplitIdleHideMs()
    return Math.min(60_000, Math.max(1_000, raw))
  })

  // Set of session IDs that have an active idle-hide timer
  const [hiddenByTimer, setHiddenByTimer] = createSignal(new Set<string>())

  // Tombstone map: session ID → { session data, expiry timestamp }
  const [tombstones, setTombstones] = createSignal(
    new Map<string, { session: ChildSession; expiresAt: number }>(),
  )

  // Timers for idle hide and tombstone expiry
  const timers = new Map<string, ReturnType<typeof setTimeout>>()
  const prevStatusMap = new Map<string, "idle" | "busy" | "retry">()

  onCleanup(() => {
    for (const timer of timers.values()) clearTimeout(timer)
    timers.clear()
  })

  // Raw children from sync data
  const rawChildren = createMemo(() => {
    const parent = sessionID()
    if (!parent) return []
    return sync().data.session.filter((s) => s.parentID === parent)
  })

  // Children with status applied
  const childrenWithStatus = createMemo(() => {
    const children = rawChildren()
    const statusMap = sync().data.session_status
    return children.map((s) => toChildSession(s, statusMap[s.id]))
  })

  // Manage idle timers, tombstones, and hidden-state transitions
  createEffect(() => {
    const children = childrenWithStatus()
    const currentIDs = new Set(children.map((c) => c.id))
    const now = Date.now()

    const hidden = untrack(hiddenByTimer)

    // Detect idle→active transitions to clear hidden state.
    // A session hidden while idle should reappear when it becomes busy/retry.
    for (const child of children) {
      const prev = prevStatusMap.get(child.id)
      if (prev === "idle" && isActive(child.status) && hidden.has(child.id)) {
        setHiddenByTimer((prev) => {
          const next = new Set(prev)
          next.delete(child.id)
          return next
        })
      }
      prevStatusMap.set(child.id, child.status)
    }

    // Cancel idle timers for sessions that are now active
    for (const child of children) {
      if (isActive(child.status)) {
        const timer = timers.get(`idle:${child.id}`)
        if (timer) {
          clearTimeout(timer)
          timers.delete(`idle:${child.id}`)
        }
      }
    }

    // Start idle timers for sessions that just became idle (were previously active)
    for (const child of children) {
      if (child.status === "idle" && !timers.has(`idle:${child.id}`) && !hidden.has(child.id)) {
        const timer = setTimeout(() => {
          timers.delete(`idle:${child.id}`)
          setHiddenByTimer((prev) => {
            const next = new Set(prev)
            next.add(child.id)
            return next
          })
        }, idleHideMs())
        timers.set(`idle:${child.id}`, timer)
      }
    }

    // Manage tombstones: sessions that disappeared from raw list
    const prev = untrack(tombstones)
    const nextTombstones = new Map(prev)

    // Remove tombstones that came back to life
    for (const [id] of nextTombstones) {
      if (currentIDs.has(id)) {
        const timer = timers.get(`tomb:${id}`)
        if (timer) {
          clearTimeout(timer)
          timers.delete(`tomb:${id}`)
        }
        nextTombstones.delete(id)
      }
    }

    // Create tombstones for newly deleted sessions
    for (const [id] of prev) {
      if (!currentIDs.has(id) && !nextTombstones.has(id)) {
        // Session was deleted but already has a tombstone entry (shouldn't happen, but guard)
      }
    }

    // Track which IDs were in previous raw list but not in current
    const previousRawIDs = untrack(rawChildren).map((s) => s.id)
    const prevRawSet = new Set(previousRawIDs)
    const currentRawSet = currentIDs

    for (const id of prevRawSet) {
      if (!currentRawSet.has(id) && !nextTombstones.has(id) && !hidden.has(id)) {
        // Session was deleted - create tombstone
        // Find its last known state from childrenWithStatus
        const lastKnown = untrack(childrenWithStatus).find((c) => c.id === id)
        if (lastKnown) {
          nextTombstones.set(id, {
            session: lastKnown,
            expiresAt: now + TOMBSTONE_MS,
          })
          const timer = setTimeout(() => {
            timers.delete(`tomb:${id}`)
            setTombstones((prev) => {
              const next = new Map(prev)
              next.delete(id)
              return next
            })
          }, TOMBSTONE_MS)
          timers.set(`tomb:${id}`, timer)
        }
      }
    }

    setTombstones(nextTombstones)
  })

  // Final sorted + capped list including tombstones
  const sessions = createMemo(() => {
    const children = childrenWithStatus()
    const hidden = hiddenByTimer()
    const currentIDs = new Set(children.map((c) => c.id))
    const limit = paneLimit()
    return computeVisibleSessions(children, hidden, tombstones(), currentIDs, limit)
  })

  const total = createMemo(() => childrenWithStatus().length)
  const overflow = createMemo(() => Math.max(0, total() - paneLimit()))

  return {
    sessions,
    overflow,
    total,
    /** Expose internal signals for testing only. */
    __testing: {
      hiddenByTimer,
      setHiddenByTimer,
      tombstones,
      prevStatusMap,
    },
  }
}
