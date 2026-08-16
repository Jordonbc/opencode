import { ErrorBoundary, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { createStore } from "solid-js/store"
import { useNavigate } from "@solidjs/router"
import { createAutoScroll } from "@opencode-ai/ui/hooks"
import { TimelineViewer } from "./timeline/message-timeline"
import { createTimelineModel } from "./timeline/model"
import { useServer } from "@/context/server"
import { useSync } from "@/context/sync"
import { useLanguage } from "@/context/language"
import { ServerScope } from "@/utils/server-scope"
import { sessionHref } from "@/utils/session-route"

export type AgentPaneProps = {
  sessionID: string
  title: string
  agent: string
  status: string
  model: string
  isReadOnly?: boolean
}

export function AgentPane(props: AgentPaneProps) {
  const navigate = useNavigate()
  const server = useServer()
  const sync = useSync()
  const language = useLanguage()
  const [closed, setClosed] = createSignal(false)
  const [tombstone, setTombstone] = createSignal(false)
  const [seen, setSeen] = createSignal(false)
  const [scroll, setScroll] = createStore({ overflow: false, bottom: true, jump: false })
  const autoScroll = createAutoScroll({ working: () => true, overflowAnchor: "none" })
  let scrollGesture = 0
  const model = createTimelineModel({
    sessionID: () => props.sessionID,
    revertMessageID: () => undefined,
  })
  const directory = createMemo(() => sync().data.path.directory ?? "")
  const serverScope = createMemo(() => ServerScope.fromServerKey(server.key))
  const serverKey = () => server.key

  const updateScrollState = (element: HTMLDivElement) => {
    const max = element.scrollHeight - element.clientHeight
    const distance = max - element.scrollTop
    const overflow = max > 1
    const bottom = !overflow || distance <= 2
    setScroll({ overflow, bottom, jump: overflow && distance > Math.max(400, element.clientHeight) })
  }

  const setScrollRef = (element: HTMLDivElement | undefined) => {
    autoScroll.scrollRef(element)
    if (element) updateScrollState(element)
  }

  const markScrollGesture = () => {
    scrollGesture = Date.now()
  }

  createEffect(() => {
    const exists = sync().data.session.some((session) => session.id === props.sessionID)
    if (exists) {
      setSeen(true)
      return
    }
    if (!seen()) return
    setTombstone(true)
    const timer = window.setTimeout(() => setClosed(true), 5000)
    onCleanup(() => window.clearTimeout(timer))
  })

  const openSession = () => navigate(sessionHref(serverKey(), props.sessionID))

  return (
    <Show when={!closed()}>
      <section
        class="agent-pane flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] bg-v2-background-bg-base"
        data-component="agent-pane"
        data-session-id={props.sessionID}
        aria-label={`${props.title} — ${props.agent}`}
      >
        <header class="agent-pane-header flex items-center gap-2 border-block-end px-3 py-2">
          <span class="agent-pane-title min-w-0 flex-1 truncate font-medium">{props.title}</span>
          <span class="agent-pane-agent text-muted-foreground truncate text-xs">{props.agent}</span>
          <span class="agent-pane-model rounded bg-surface-raised px-1.5 py-0.5 text-xs" data-model={props.model}>
            {props.model}
          </span>
          <span class="agent-pane-status flex items-center gap-1 text-xs" data-status={props.status}>
            <span class="size-1.5 rounded-full bg-current" aria-hidden="true" />
            {props.status}
          </span>
        </header>
        <div class="agent-pane-body min-h-0 flex-1">
          <Show when={tombstone()} fallback={
            <ErrorBoundary
              fallback={(error, reset) => (
                <div class="agent-pane-error flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
                  <p>{language.t("agent.pane.error.loadFailed")}</p>
                  <p class="text-muted-foreground text-xs">{String(error)}</p>
                  <div class="flex gap-2">
                    <button type="button" onClick={reset}>{language.t("agent.pane.error.retry")}</button>
                    <button type="button" onClick={() => setClosed(true)}>{language.t("agent.pane.error.close")}</button>
                  </div>
                </div>
              )}
            >
              <TimelineViewer
                sessionID={props.sessionID}
                serverScope={serverScope()}
                directory={directory()}
                isReadOnly={props.isReadOnly ?? true}
                scroll={scroll}
                onResumeScroll={autoScroll.forceScrollToBottom}
                setScrollRef={setScrollRef}
                onScheduleScrollState={updateScrollState}
                onAutoScrollHandleScroll={autoScroll.handleScroll}
                onMarkScrollGesture={markScrollGesture}
                hasScrollGesture={() => Date.now() - scrollGesture < 250}
                onUserScroll={() => {}}
                onHistoryScroll={() => void model.history.loadOlder()}
                onAutoScrollInteraction={autoScroll.handleInteraction}
                shouldAnchorBottom={() => !autoScroll.userScrolled()}
                centered={false}
                setContentRef={autoScroll.contentRef}
                userMessages={model.visibleUserMessages()}
                anchor={(id) => `#${id}`}
              />
            </ErrorBoundary>
          }>
            <div class="agent-pane-tombstone flex h-full items-center justify-center text-muted-foreground">{language.t("agent.pane.sessionEnded")}</div>
          </Show>
        </div>
      </section>
    </Show>
  )
}
