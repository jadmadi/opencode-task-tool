# opencode-task-tool

An OpenCode V2 plugin that adds a `task` tool. The tool keeps a tree of items
per session, with ids like `T1`, `T1.1`, and `T2`, so multi-step work survives
long turns and compaction.

## OpenCode

This plugin runs on OpenCode. New accounts through my referral link get $5 in
usage credits, and I get $5 too:

https://opencode.ai/go?ref=N9H3ZEP22A

## Install

```sh
mkdir -p ~/.config/opencode/plugins
curl -fsSL \
  https://raw.githubusercontent.com/jadmadi/opencode-task-tool/main/task-tool.ts \
  -o ~/.config/opencode/plugins/task-tool.ts
```

For one project, put it in `.opencode/plugins/`. OpenCode V2 discovers single
`.ts` files in those directories and hot-reloads on change. Tested against
OpenCode v2.0.3.

To pin a release, replace `main` in the URL with a tag such as `v0.1.0`.

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
