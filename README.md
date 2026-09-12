# opencode-task-tool

An OpenCode V2 plugin that adds a `task` tool. The tool keeps a tree of items
per session, with ids like `T1`, `T1.1`, and `T2`, so multi-step work survives
long turns and compaction.

## Install

```sh
mkdir -p ~/.config/opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/jadmadi/opencode-task-tool/main/task-tool.ts \
  -o ~/.config/opencode/plugins/task-tool.ts
```

For one project, put it in `.opencode/plugins/`. OpenCode V2 discovers single
`.ts` files in those directories and hot-reloads on change. Tested against
OpenCode `0.0.0-beta-19425`.

## Tools

| Action  | Input                     | Result                                  |
| ------- | ------------------------- | --------------------------------------- |
| `add`   | `title`, optional `parent`| Creates `T1`, or `T1.2` under a parent  |
| `update`| `id`, `status` or `title` | Updates one item                        |
| `list`  | none                      | Returns the tree in order               |
| `clear` | none                      | Removes every item for the session      |

Status is `open`, `doing`, or `done`. State is stored per session.

## Tests

```sh
bun test
```

## Attribution

Inspired by MiMoCode's tree-shaped task system. See `NOTICE`.

## License

MIT
