export type AgentSplitLayout = "side-by-side" | "stacked" | "grid"

export function agentSplitWidth(input: { width: number; available: number; layout?: AgentSplitLayout }) {
  const maxPercent = 0.6
  const minForGrid = 300
  return Math.min(Math.max(minForGrid, input.width), input.available * maxPercent)
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
