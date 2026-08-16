import { describe, expect, test } from "bun:test"
import { createStore } from "solid-js/store"
import { createMemo } from "solid-js"
import type { Settings } from "./settings"

const defaultSettings: Settings["general"] = {
  autoSave: true,
  releaseNotes: true,
  followup: "steer",
  showFileTree: false,
  showNavigation: false,
  showSearch: false,
  showStatus: false,
  showTerminal: false,
  showReasoningSummaries: false,
  shellToolPartsExpanded: false,
  editToolPartsExpanded: false,
  showCustomAgents: false,
  mobileTitlebarPosition: "top",
  showAgentSplitView: false,
  agentSplitLayout: "side-by-side",
  agentSplitPaneLimit: 4,
  agentSplitIdleHideMs: 10_000,
}

function withFallback<T>(read: () => T | undefined, fallback: T) {
  return createMemo(() => read() ?? fallback)
}

describe("agent split view defaults", () => {
  test("showAgentSplitView defaults to false", () => {
    const [store] = createStore<Settings["general"]>(defaultSettings)
    const memo = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    expect(memo()).toBe(false)
  })

  test("agentSplitLayout defaults to side-by-side", () => {
    const [store] = createStore<Settings["general"]>(defaultSettings)
    const memo = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    expect(memo()).toBe("side-by-side")
  })

  test("agentSplitPaneLimit defaults to 4", () => {
    const [store] = createStore<Settings["general"]>(defaultSettings)
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(4)
  })
})

describe("showAgentSplitView validation", () => {
  test("accepts boolean true", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      showAgentSplitView: true,
    })
    const memo = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    expect(memo()).toBe(true)
  })

  test("accepts boolean false", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      showAgentSplitView: false,
    })
    const memo = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    expect(memo()).toBe(false)
  })

  test("rejects non-boolean values and falls back to default", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      showAgentSplitView: "true" as unknown as boolean,
    })
    const memo = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    expect(memo()).toBe(false)
  })

  test("rejects undefined and falls back to default", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      showAgentSplitView: undefined as unknown as boolean,
    })
    const memo = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    expect(memo()).toBe(false)
  })
})

describe("agentSplitLayout validation", () => {
  test("accepts side-by-side", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitLayout: "side-by-side",
    })
    const memo = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    expect(memo()).toBe("side-by-side")
  })

  test("accepts stacked", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitLayout: "stacked",
    })
    const memo = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    expect(memo()).toBe("stacked")
  })

  test("accepts grid", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitLayout: "grid",
    })
    const memo = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    expect(memo()).toBe("grid")
  })

  test("rejects invalid layout and falls back to default", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitLayout: "invalid" as unknown as "side-by-side" | "stacked" | "grid",
    })
    const memo = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    expect(memo()).toBe("side-by-side")
  })
})

describe("agentSplitPaneLimit validation", () => {
  test("accepts minimum value of 2", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitPaneLimit: 2,
    })
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(2)
  })

  test("accepts maximum value of 8", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitPaneLimit: 8,
    })
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(8)
  })

  test("accepts middle value of 4", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitPaneLimit: 4,
    })
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(4)
  })

  test("rejects value below minimum and falls back to default", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitPaneLimit: 1,
    })
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(4)
  })

  test("rejects value above maximum and falls back to default", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitPaneLimit: 9,
    })
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(4)
  })

  test("rejects non-number type and falls back to default", () => {
    const [store] = createStore<Settings["general"]>({
      ...defaultSettings,
      agentSplitPaneLimit: "four" as unknown as number,
    })
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(4)
  })
})

describe("old store compatibility", () => {
  test("missing showAgentSplitView gets default", () => {
    const [store] = createStore<Settings["general"]>({
      autoSave: true,
      releaseNotes: true,
      followup: "steer",
      showFileTree: false,
      showNavigation: false,
      showSearch: false,
      showStatus: false,
      showTerminal: false,
      showReasoningSummaries: false,
      shellToolPartsExpanded: false,
      editToolPartsExpanded: false,
      showCustomAgents: false,
      mobileTitlebarPosition: "top",
    } as unknown as Settings["general"])
    const memo = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    expect(memo()).toBe(false)
  })

  test("missing agentSplitLayout gets default", () => {
    const [store] = createStore<Settings["general"]>({
      autoSave: true,
      releaseNotes: true,
      followup: "steer",
      showFileTree: false,
      showNavigation: false,
      showSearch: false,
      showStatus: false,
      showTerminal: false,
      showReasoningSummaries: false,
      shellToolPartsExpanded: false,
      editToolPartsExpanded: false,
      showCustomAgents: false,
      mobileTitlebarPosition: "top",
    } as unknown as Settings["general"])
    const memo = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    expect(memo()).toBe("side-by-side")
  })

  test("missing agentSplitPaneLimit gets default", () => {
    const [store] = createStore<Settings["general"]>({
      autoSave: true,
      releaseNotes: true,
      followup: "steer",
      showFileTree: false,
      showNavigation: false,
      showSearch: false,
      showStatus: false,
      showTerminal: false,
      showReasoningSummaries: false,
      shellToolPartsExpanded: false,
      editToolPartsExpanded: false,
      showCustomAgents: false,
      mobileTitlebarPosition: "top",
    } as unknown as Settings["general"])
    const memo = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(memo()).toBe(4)
  })

  test("empty store gets all defaults", () => {
    const [store] = createStore<Settings["general"]>({} as unknown as Settings["general"])
    const showAgentSplitView = withFallback(
      () => typeof store?.showAgentSplitView === "boolean" ? store.showAgentSplitView : undefined,
      defaultSettings.showAgentSplitView,
    )
    const agentSplitLayout = withFallback(
      () => (
        store?.agentSplitLayout === "side-by-side"
          || store?.agentSplitLayout === "stacked"
          || store?.agentSplitLayout === "grid"
          ? store.agentSplitLayout
          : undefined
      ),
      defaultSettings.agentSplitLayout,
    )
    const agentSplitPaneLimit = withFallback(
      () => (
        typeof store?.agentSplitPaneLimit === "number"
          && store.agentSplitPaneLimit >= 2
          && store.agentSplitPaneLimit <= 8
          ? store.agentSplitPaneLimit
          : undefined
      ),
      defaultSettings.agentSplitPaneLimit,
    )
    expect(showAgentSplitView()).toBe(false)
    expect(agentSplitLayout()).toBe("side-by-side")
    expect(agentSplitPaneLimit()).toBe(4)
  })
})

describe("setter validation", () => {
  test("setAgentSplitPaneLimit clamps invalid values to 4", () => {
    const [store, setStore] = createStore<Settings["general"]>(defaultSettings)

    const validatedSetLimit = (value: number) => {
      setStore(
        "agentSplitPaneLimit",
        typeof value === "number" && value >= 2 && value <= 8 ? value : 4,
      )
    }

    validatedSetLimit(1)
    expect(store.agentSplitPaneLimit).toBe(4)

    validatedSetLimit(9)
    expect(store.agentSplitPaneLimit).toBe(4)

    validatedSetLimit(100)
    expect(store.agentSplitPaneLimit).toBe(4)
  })

  test("setAgentSplitPaneLimit accepts valid values", () => {
    const [store, setStore] = createStore<Settings["general"]>(defaultSettings)

    const validatedSetLimit = (value: number) => {
      setStore(
        "agentSplitPaneLimit",
        typeof value === "number" && value >= 2 && value <= 8 ? value : 4,
      )
    }

    validatedSetLimit(2)
    expect(store.agentSplitPaneLimit).toBe(2)

    validatedSetLimit(8)
    expect(store.agentSplitPaneLimit).toBe(8)

    validatedSetLimit(6)
    expect(store.agentSplitPaneLimit).toBe(6)
  })
})
