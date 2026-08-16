import { For, Show, type JSX } from "solid-js"
import { ResizeHandle } from "@opencode-ai/ui/resize-handle"
import { Tag } from "@opencode-ai/ui/v2/badge-v2"
import { useLanguage } from "@/context/language"
import type { AgentSplitLayout } from "./session-panel-layout"

const RESIZE_STEP_PX = 20
const MIN_SIZE_PX = 300
export type AgentSplitPanelLayout = AgentSplitLayout

export interface AgentSplitPanelProps {
  sessions: readonly JSX.Element[]
  layout: AgentSplitPanelLayout
  width: number
  maxWidth: number
  onWidthChange: (width: number) => void
  overflow: number
  paneLimit: number
}

export function AgentSplitPanel(props: AgentSplitPanelProps) {
  const language = useLanguage()
  const widthResize = () => props.layout !== "stacked"
  const direction = (): "horizontal" | "vertical" => (widthResize() ? "horizontal" : "vertical")
  const className = () =>
    props.layout === "side-by-side"
      ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-auto"
      : props.layout === "stacked"
        ? "flex min-h-0 min-w-0 flex-1 flex-row overflow-auto"
        : `grid min-h-0 min-w-0 flex-1 ${props.sessions.length === 1 ? "grid-cols-1" : "grid-cols-2"} overflow-auto`
  const handleKeyboard = (e: KeyboardEvent) => {
    const step = RESIZE_STEP_PX
    const rtl = widthResize() && e.currentTarget instanceof Element && getComputedStyle(e.currentTarget).direction === "rtl"
    const increase = widthResize() ? (rtl ? e.key === "ArrowRight" : e.key === "ArrowLeft") : e.key === "ArrowUp"
    const decrease = widthResize() ? (rtl ? e.key === "ArrowLeft" : e.key === "ArrowRight") : e.key === "ArrowDown"
    if (!increase && !decrease) return
    e.preventDefault()
    props.onWidthChange(
      increase ? Math.min(props.maxWidth, props.width + step) : Math.max(MIN_SIZE_PX, props.width - step),
    )
  }

  return (
    <section
      data-component="agent-split-panel"
      data-layout={props.layout}
      class="relative flex min-h-0 min-w-0 shrink-0 overflow-hidden border-s border-border-weaker-base"
      style={widthResize()
        ? { width: `${props.width}px`, "min-width": `${MIN_SIZE_PX}px`, "max-width": `${props.maxWidth}px`, "min-height": "0" }
        : { width: "100%", height: `${props.width}px`, "min-height": `${MIN_SIZE_PX}px`, "max-height": `${props.maxWidth}px` }}
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
        <div class={className()} style={{ "overscroll-behavior": "contain" }}>
          <For each={props.sessions}>
            {(session) => <div class="flex h-full min-h-0 min-w-0 w-full flex-1 overflow-hidden">{session}</div>}
          </For>
        </div>
        <ResizeHandle
          data-slot="resize-handle"
          direction={direction()}
          edge="start"
          size={props.width}
          min={MIN_SIZE_PX}
          max={props.maxWidth}
          onResize={props.onWidthChange}
          tabindex={0}
          role="separator"
          aria-orientation={widthResize() ? "vertical" : "horizontal"}
          aria-valuenow={props.width}
          aria-valuemin={MIN_SIZE_PX}
          aria-valuemax={props.maxWidth}
          onKeyDown={handleKeyboard}
        />
      </Show>
    </section>
  )
}
