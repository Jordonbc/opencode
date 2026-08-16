import { For, Show, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { Tag } from "@opencode-ai/ui/v2/badge-v2"

export type AgentSplitPanelLayout = "side-by-side" | "stacked" | "grid"

export interface AgentSplitPanelProps {
  sessions: readonly JSX.Element[]
  layout: AgentSplitPanelLayout
  overflow: number
  paneLimit: number
}

export function AgentSplitPanel(props: AgentSplitPanelProps) {
  const [state, setState] = createStore({ size: 50 })
  const direction = (): "horizontal" | "vertical" => (props.layout === "side-by-side" ? "vertical" : "horizontal")
  const className = () => {
    if (props.layout === "side-by-side") return "agent-split-panel__panes agent-split-panel__panes--side-by-side"
    if (props.layout === "stacked") return "agent-split-panel__panes agent-split-panel__panes--stacked"
    return "agent-split-panel__panes agent-split-panel__panes--grid"
  }
  const paneStyle = () => {
    if (props.layout === "grid") return undefined
    return props.layout === "side-by-side" ? { "max-height": `${state.size}%` } : { "max-width": `${state.size}%` }
  }

  return (
    <section data-component="agent-split-panel" data-layout={props.layout}>
      <Show when={props.overflow > 0}>
        <Tag data-slot="overflow-badge" variant="accent">
          +{props.overflow}
        </Tag>
      </Show>
      <Show
        when={props.sessions.length > 0}
        fallback={<div data-slot="empty-state" aria-hidden="true" />}
      >
        <div class={className()}>
          <For each={props.sessions}>
            {(session) => <div class="agent-split-panel__pane" style={paneStyle()}>{session}</div>}
          </For>
        </div>
        <ResizeHandle
          data-slot="resize-handle"
          direction={direction()}
          size={state.size}
          min={100 / Math.max(props.paneLimit, 1)}
          max={100 - 100 / Math.max(props.paneLimit, 1)}
          onResize={(size) => setState("size", size)}
        />
      </Show>
    </section>
  )
}
