import { ErrorBoundary, Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js"
import { useNavigate } from "@solidjs/router"
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
  const model = createTimelineModel({
    sessionID: () => props.sessionID,
    revertMessageID: () => undefined,
  })
  const directory = createMemo(() => sync().data.path.directory ?? "")
  const serverScope = createMemo(() => ServerScope.fromServerKey(server.key))
  const serverKey = () => server.key

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
        class="agent-pane flex min-h-0 flex-1 flex-col overflow-hidden"
        data-component="agent-pane"
        data-session-id={props.sessionID}
        role="region"
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
                scroll={{ overflow: false, bottom: true, jump: false }}
                onResumeScroll={() => {}}
                setScrollRef={() => {}}
                onScheduleScrollState={() => {}}
                onAutoScrollHandleScroll={() => {}}
                onMarkScrollGesture={() => {}}
                hasScrollGesture={() => false}
                onUserScroll={() => {}}
                onHistoryScroll={() => void model.history.loadOlder()}
                onAutoScrollInteraction={() => {}}
                shouldAnchorBottom={() => true}
                centered={false}
                setContentRef={() => {}}
                userMessages={model.visibleUserMessages()}
                anchor={(id) => `#${id}`}
              />
            </ErrorBoundary>
          }>
            <div class="agent-pane-tombstone flex h-full items-center justify-center text-muted-foreground">{language.t("agent.pane.sessionEnded")}</div>
          </Show>
        </div>
        <footer class="agent-pane-footer border-block-start px-3 py-2">
          <button type="button" onClick={openSession}>{language.t("agent.pane.openFullSession")}</button>
        </footer>
      </section>
    </Show>
  )
}
