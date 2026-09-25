# AGENTS.md

Guidance for agents working in this repository.

## What this is

An OpenCode V2 plugin (`task-tool.ts`) that registers a `task` tool with a
tree-shaped item list per session. No build step, no dependencies, AGPL-3.0-only.

## Local development

```sh
bun test
cp task-tool.ts ~/.config/opencode/plugins/task-tool.ts
touch ~/.config/opencode/plugins/task-tool.ts
```

Verify registration:

```sh
opencode2 api get /api/tool 2>/dev/null | grep -o task || true
```

Check the server log when something is off:

```sh
grep task-tool ~/.local/share/opencode/log/opencode.log | tail
```

## Hard constraints

- Do not import `@opencode/plugin`. Export a plain `{ id, setup }` object.
- Keep the plugin dependency-free. Use Bun globals when needed.
- Plugin `console` output is not visible to users. Throwing from a tool
  surfaces the message to the session.
- State lives in `ctx.storage` under `tasks/<sessionID>`. Never renumber ids.

## Layout

- `nextId` and `applyAction` - pure helpers, exported for tests.
- `render` - formats the tree as text for the tool result.
- `setup` - registers the `task` tool through `ctx.tool.transform`.
- `task-tool.test.ts` - tests for the helpers and the tool round-trip.

## Releasing

- Semantic commit messages. Changes through a feature branch and a PR.
- Keep `NOTICE` accurate.
