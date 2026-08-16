export type AgentSplitLayout = "side-by-side" | "stacked" | "grid"

export function agentSplitWidth(input: { width: number; available: number }) {
  return Math.min(Math.max(300, input.width), input.available * 0.6)
}

export function sessionPanelColumnLayout(input: { agentOpen: boolean; sidebarOpen: boolean }) {
  return { flexible: input.agentOpen, width: input.agentOpen ? "auto" : input.sidebarOpen ? "sidebar" : "full" }
}

export function sessionPanelLayout(input: {
  review: boolean
  terminal: boolean
  files: boolean
}) {
  return {
    visible: input.review || input.terminal || input.files,
    stacked: input.review && input.terminal,
  }
}
