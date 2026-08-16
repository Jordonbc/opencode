import { describe, expect, test } from "bun:test"
import { agentSplitWidth, sessionPanelColumnLayout, sessionPanelLayout } from "./session-panel-layout"

describe("sessionPanelLayout", () => {
  test("clamps the persisted agent width to the production bounds", () => {
    expect(agentSplitWidth({ width: 200, available: 1200 })).toBe(300)
    expect(agentSplitWidth({ width: 900, available: 1200 })).toBe(720)
  })

  test("keeps the session column flexible with or without a sidebar", () => {
    expect(sessionPanelColumnLayout({ agentOpen: true, sidebarOpen: false })).toEqual({ flexible: true, width: "auto" })
    expect(sessionPanelColumnLayout({ agentOpen: true, sidebarOpen: true })).toEqual({ flexible: true, width: "auto" })
    expect(sessionPanelColumnLayout({ agentOpen: false, sidebarOpen: false })).toEqual({ flexible: false, width: "full" })
    expect(sessionPanelColumnLayout({ agentOpen: false, sidebarOpen: true })).toEqual({ flexible: false, width: "sidebar" })
  })

  test("keeps one V2 owner while changing panel geometry", () => {
    expect(sessionPanelLayout({ review: false, terminal: false, files: false })).toEqual({
      visible: false,
      stacked: false,
    })
    expect(sessionPanelLayout({ review: false, terminal: true, files: false })).toEqual({
      visible: true,
      stacked: false,
    })
    expect(sessionPanelLayout({ review: true, terminal: true, files: false })).toEqual({
      visible: true,
      stacked: true,
    })
  })
})
