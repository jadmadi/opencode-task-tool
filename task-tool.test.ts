import { describe, expect, test } from "bun:test"
import plugin, { applyAction, nextId, render } from "./task-tool.ts"

const item = (id: string, title: string, status: "open" | "doing" | "done" = "open", parent?: string) => ({
  id,
  title,
  status,
  ...(parent ? { parent } : {}),
})

describe("nextId", () => {
  test("starts at T1", () => {
    expect(nextId([])).toBe("T1")
  })

  test("takes the highest top-level number plus one", () => {
    expect(nextId([item("T1", "a"), item("T2", "b")])).toBe("T3")
    expect(nextId([item("T2", "b")])).toBe("T3")
  })

  test("numbers children under their parent", () => {
    expect(nextId([item("T1", "a"), item("T1.1", "b", "open", "T1")], "T1")).toBe("T1.2")
    expect(nextId([item("T1", "a")], "T1")).toBe("T1.1")
  })

  test("supports deeper levels", () => {
    expect(nextId([item("T1.1", "a", "open", "T1"), item("T1.1.1", "b", "open", "T1.1")], "T1.1")).toBe("T1.1.2")
  })
})

describe("applyAction", () => {
  test("adds a top-level task", () => {
    const result = applyAction([], { action: "add", title: "First" })
    expect(result.items).toEqual([item("T1", "First")])
    expect(result.message).toBe("added T1: First")
  })

  test("adds a child under a parent", () => {
    const result = applyAction([item("T1", "First")], { action: "add", title: "Child", parent: "T1" })
    expect(result.items[1]).toEqual(item("T1.1", "Child", "open", "T1"))
  })

  test("rejects an empty title", () => {
    expect(() => applyAction([], { action: "add", title: "   " })).toThrow(/non-empty title/)
  })

  test("rejects an unknown parent", () => {
    expect(() => applyAction([], { action: "add", title: "x", parent: "T9" })).toThrow(/unknown parent/)
  })

  test("updates status and title", () => {
    const result = applyAction([item("T1", "First")], { action: "update", id: "T1", status: "doing", title: "Better" })
    expect(result.items[0]).toEqual(item("T1", "Better", "doing"))
    expect(result.message).toBe("updated T1 (doing): Better")
  })

  test("rejects an unknown id", () => {
    expect(() => applyAction([], { action: "update", id: "T1", status: "done" })).toThrow(/unknown task id/)
  })

  test("rejects an update with nothing to change", () => {
    expect(() => applyAction([item("T1", "First")], { action: "update", id: "T1" })).toThrow(/status or a title/)
  })

  test("rejects an unknown status", () => {
    expect(() =>
      applyAction([item("T1", "First")], { action: "update", id: "T1", status: "nope" as "done" }),
    ).toThrow(/unknown status/)
  })

  test("clears every task", () => {
    const result = applyAction([item("T1", "a"), item("T2", "b")], { action: "clear" })
    expect(result.items).toEqual([])
    expect(result.message).toBe("cleared all tasks")
  })

  test("lists the tree", () => {
    const result = applyAction([item("T1", "a"), item("T1.1", "b", "open", "T1")], { action: "list" })
    expect(result.message).toBe("T1 [open] a\n  T1.1 [open] b")
  })
})

describe("render", () => {
  test("prints no tasks for an empty list", () => {
    expect(render([])).toBe("")
  })

  test("nests children under their parent", () => {
    expect(render([item("T2", "second"), item("T1", "first"), item("T1.1", "child", "open", "T1")])).toBe(
      "T1 [open] first\n  T1.1 [open] child\nT2 [open] second",
    )
  })
})

function makeCtx() {
  const store = new Map<string, unknown>()
  const added: any[] = []
  const ctx: any = {
    tool: { transform: (callback: any) => callback({ add: (definition: any) => added.push(definition) }) },
    storage: {
      get: async (key: string) => store.get(key),
      set: async (key: string, value: unknown) => void store.set(key, value),
    },
  }
  return { ctx, added, store }
}

describe("setup", () => {
  test("registers the task tool", async () => {
    const { ctx, added } = makeCtx()
    await (plugin as any).setup(ctx)
    expect(added.map((definition) => definition.name)).toEqual(["task"])
  })
})

describe("execute", () => {
  test("round-trips add, list, update, and clear", async () => {
    const { ctx, added } = makeCtx()
    await (plugin as any).setup(ctx)
    const run = (input: any) => added[0].execute(input, { sessionID: "ses_1" })

    expect((await run({ action: "add", title: "First" })).content).toBe("added T1: First")
    expect((await run({ action: "add", title: "Second" })).content).toBe("added T2: Second")
    expect((await run({ action: "update", id: "T1", status: "doing" })).content).toBe("updated T1 (doing): First")
    expect((await run({ action: "list" })).content).toBe("T1 [doing] First\nT2 [open] Second")
    expect((await run({ action: "clear" })).content).toBe("cleared all tasks")
    expect((await run({ action: "list" })).content).toBe("no tasks")
  })

  test("keeps sessions separate", async () => {
    const { ctx, added } = makeCtx()
    await (plugin as any).setup(ctx)
    await added[0].execute({ action: "add", title: "Mine" }, { sessionID: "ses_1" })
    const other = await added[0].execute({ action: "list" }, { sessionID: "ses_2" })
    expect(other.content).toBe("no tasks")
  })

  test("surfaces a clear error and leaves the state alone", async () => {
    const { ctx, added, store } = makeCtx()
    await (plugin as any).setup(ctx)
    await added[0].execute({ action: "add", title: "First" }, { sessionID: "ses_1" })
    const before = JSON.stringify(store.get("tasks/ses_1"))
    const result = added[0].execute({ action: "update", id: "T9", status: "done" }, { sessionID: "ses_1" })
    await expect(result).rejects.toThrow(/unknown task id/)
    expect(JSON.stringify(store.get("tasks/ses_1"))).toBe(before)
    expect((await added[0].execute({ action: "list" }, { sessionID: "ses_1" })).content).toBe("T1 [open] First")
  })

  test("a repeated list returns the same ids and does not rewrite storage", async () => {
    const { ctx, added, store } = makeCtx()
    await (plugin as any).setup(ctx)
    await added[0].execute({ action: "add", title: "First" }, { sessionID: "ses_1" })
    await added[0].execute({ action: "add", title: "Second" }, { sessionID: "ses_1" })
    const before = JSON.stringify(store.get("tasks/ses_1"))
    const first = await added[0].execute({ action: "list" }, { sessionID: "ses_1" })
    const second = await added[0].execute({ action: "list" }, { sessionID: "ses_1" })
    expect(second.content).toBe(first.content)
    expect(JSON.stringify(store.get("tasks/ses_1"))).toBe(before)
  })
})
