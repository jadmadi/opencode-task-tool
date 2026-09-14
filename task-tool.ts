// OpenCode V2 task-tool plugin.
//
// Registers one `task` tool that keeps a tree of items per session. Ids are
// T1, T1.1, T2, and so on, and never renumber. State lives in ctx.storage under
// `tasks/<sessionID>`. The runtime does not resolve @opencode/plugin, so this
// file exports a plain { id, setup } object.

const VERSION = "0.1.1"

type TaskStatus = "open" | "doing" | "done"

interface TaskItem {
  id: string
  title: string
  status: TaskStatus
  parent?: string
}

interface TaskInput {
  action: "add" | "update" | "list" | "clear"
  title?: string
  id?: string
  status?: TaskStatus
  parent?: string
}

const STATUSES: TaskStatus[] = ["open", "doing", "done"]

function parseIndex(id: string, prefix: string): number | undefined {
  if (!id.startsWith(prefix)) return undefined
  const rest = id.slice(prefix.length)
  return /^\d+$/.test(rest) ? Number(rest) : undefined
}

function nextId(items: TaskItem[], parent?: string): string {
  if (parent) {
    const prefix = `${parent}.`
    const used = items
      .map((item) => parseIndex(item.id, prefix))
      .filter((value): value is number => value !== undefined)
    return `${parent}.${Math.max(0, ...used) + 1}`
  }
  const used = items
    .filter((item) => !item.parent)
    .map((item) => parseIndex(item.id, "T"))
    .filter((value): value is number => value !== undefined)
  return `T${Math.max(0, ...used) + 1}`
}

function render(items: TaskItem[], parent?: string, depth = 0): string {
  const prefix = parent === undefined ? "T" : `${parent}.`
  const level = (
    parent === undefined ? items.filter((item) => !item.parent) : items.filter((item) => item.parent === parent)
  )
    .slice()
    .sort((a, b) => (parseIndex(a.id, prefix) ?? 0) - (parseIndex(b.id, prefix) ?? 0))
  const lines: string[] = []
  for (const item of level) {
    lines.push(`${"  ".repeat(depth)}${item.id} [${item.status}] ${item.title}`)
    const nested = render(items, item.id, depth + 1)
    if (nested) lines.push(nested)
  }
  return lines.join("\n")
}

function applyAction(items: TaskItem[], input: TaskInput): { items: TaskItem[]; message: string } {
  switch (input.action) {
    case "add": {
      const title = typeof input.title === "string" ? input.title.trim() : ""
      if (!title) throw new Error("task add needs a non-empty title")
      if (input.parent !== undefined && !items.some((item) => item.id === input.parent)) {
        throw new Error(`unknown parent "${input.parent}"`)
      }
      const item: TaskItem = { id: nextId(items, input.parent), title, status: "open" }
      if (input.parent !== undefined) item.parent = input.parent
      return { items: [...items, item], message: `added ${item.id}: ${item.title}` }
    }

    case "update": {
      const item = input.id ? items.find((entry) => entry.id === input.id) : undefined
      if (!item) throw new Error(`unknown task id "${input.id ?? ""}"`)
      const next: TaskItem = { ...item }
      let changed = false
      if (input.status !== undefined) {
        if (!STATUSES.includes(input.status)) throw new Error(`unknown status "${input.status}"`)
        next.status = input.status
        changed = true
      }
      if (input.title !== undefined) {
        const title = typeof input.title === "string" ? input.title.trim() : ""
        if (!title) throw new Error("task update needs a non-empty title")
        next.title = title
        changed = true
      }
      if (!changed) throw new Error("task update needs a status or a title")
      return {
        items: items.map((entry) => (entry.id === item.id ? next : entry)),
        message: `updated ${next.id} (${next.status}): ${next.title}`,
      }
    }

    case "list":
      return { items, message: render(items) || "no tasks" }

    case "clear":
      return { items: [], message: "cleared all tasks" }

    default:
      throw new Error(`unknown action "${String((input as { action?: unknown }).action ?? "")}"`)
  }
}

const plugin = {
  id: "task-tool",
  async setup(ctx: any) {
    await ctx.tool.transform((editor: any) => {
      editor.add({
        name: "task",
        description:
          "Track multi-step work as a tree of tasks (T1, T1.1). Actions: add, update, list, clear. Ids are stable and never renumber.",
        input: {
          type: "object",
          properties: {
            action: { type: "string", enum: ["add", "update", "list", "clear"], description: "The operation to perform." },
            title: { type: "string", description: "Title for add, or a new title for update." },
            id: { type: "string", description: "Task id such as T1 or T1.2, used by update." },
            status: { type: "string", enum: STATUSES, description: "New status for update." },
            parent: { type: "string", description: "Parent id for add, to create a child task." },
          },
          required: ["action"],
          additionalProperties: false,
        },
        execute: async (input: TaskInput, context: { sessionID: string }) => {
          const key = `tasks/${context.sessionID}`
          const stored = await ctx.storage.get(key)
          const items: TaskItem[] = Array.isArray(stored) ? (stored as TaskItem[]) : []
          const result = applyAction(items, input)
          if (input.action !== "list") await ctx.storage.set(key, result.items)
          return { content: result.message }
        },
      })
    })
  },
}

export { applyAction, nextId, render, VERSION }
export default plugin
