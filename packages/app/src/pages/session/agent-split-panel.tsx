import { For, Show, createSignal, type JSX } from "solid-js"
import { createStore } from "solid-js/store"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { Tag } from "@opencode-ai/ui/v2/badge-v2"
import { useLanguage } from "@/context/language"

const RESIZE_STEP_PX = 20
const MIN_SIZE_PX = { horizontal: 200, vertical: 300 }
const MAX_SIZE_PERCENT = 60
export type AgentSplitPanelLayout = "side-by-side" | "stacked" | "grid"

export interface AgentSplitPanelProps {
  sessions: readonly JSX.Element[]
  layout: AgentSplitPanelLayout
  overflow: number
  paneLimit: number
}

export function AgentSplitPanel(props: AgentSplitPanelProps) {
  const language = useLanguage()
  const [state, setState] = createStore({ size: 50 })
  const [overflowExpanded, setOverflowExpanded] = createSignal(false)
  const direction = (): "horizontal" | "vertical" => (props.layout === "side-by-side" ? "vertical" : "horizontal")
  const className = () => {
    if (props.layout === "side-by-side") return "agent-split-panel__panes agent-split-panel__panes--side-by-side"
    if (props.layout === "stacked") return "agent-split-panel__panes agent-split-panel__panes--stacked"
    return "agent-split-panel__panes agent-split-panel__panes--grid"
  }
  const paneStyle = (): JSX.CSSProperties | undefined => {
    if (props.layout === "grid") return undefined
    const maxSize = Math.min(state.size, MAX_SIZE_PERCENT)
    return props.layout === "side-by-side" ? { "max-height": `${maxSize}%` } : { "max-width": `${maxSize}%` }
  }
  const handleKeyboard = (e: KeyboardEvent) => {
    const dir = direction()
    const min = MIN_SIZE_PX[dir]
    const step = RESIZE_STEP_PX
    if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
      e.preventDefault()
      setState("size", (prev) => Math.max(min / (window.innerHeight / 100), prev - step))
    } else if (e.key === "ArrowDown" || e.key === "ArrowRight") {
      e.preventDefault()
      setState("size", (prev) => Math.min(MAX_SIZE_PERCENT, prev + step))
    }
  }

  return (
    <section
      data-component="agent-split-panel"
      data-layout={props.layout}
      role="group"
      aria-label={language.t("agent.split.overflow", { count: String(props.sessions.length) })}
    >
      <Show when={props.overflow > 0}>
        <Tag
          data-slot="overflow-badge"
          variant="accent"
          role="status"
          aria-label={language.t("agent.split.overflow", { count: String(props.overflow) })}
        >
          +{props.overflow}
        </Tag>
      </Show>
      <Show
        when={props.sessions.length > 0}
        fallback={<div data-slot="empty-state" aria-hidden="true" />}
      >
        <div class={className()} style={{ "overflow-y": "auto", "overscroll-behavior": "contain" }}>
          <For each={props.sessions}>
            {(session) => <div class="agent-split-panel__pane" style={paneStyle()}>{session}</div>}
          </For>
        </div>
        <ResizeHandle
          data-slot="resize-handle"
          direction={direction()}
          size={state.size}
          min={MIN_SIZE_PX[direction()] / (direction() === "horizontal" ? window.innerWidth : window.innerHeight) * 100}
          max={MAX_SIZE_PERCENT}
          onResize={(size) => setState("size", size)}
          tabindex={0}
          role="separator"
          aria-orientation={direction() === "horizontal" ? "horizontal" : "vertical"}
          aria-valuenow={state.size}
          aria-valuemin={0}
          aria-valuemax={MAX_SIZE_PERCENT}
          onKeyDown={handleKeyboard}
        />
      </Show>
    </section>
  )
}
