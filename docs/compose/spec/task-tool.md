---
feature: task-tool
status: delivered
updated: 2026-09-12
branch: feat/task-tool
commits: 309ded0..3e723c9
---

# Task Tool

## Report

**What was built** - A single-file OpenCode V2 plugin that registers a `task`
tool. It keeps a tree of items per session, with ids like T1, T1.1, and deeper,
and the actions add, update, list, and clear. Ids never renumber, each level
lists in id order, and a failed action changes nothing. State lives in
`ctx.storage` under `tasks/<sessionID>`.

**Verification** - `bun test`: 21 pass, 0 fail, 34 assertions. Live round-trip
in a real session: added T1, added T1.1 under it, listed the tree, set T1.1 to
done, cleared, and listed empty. Plugin load: PASS, no failure in the server
log. A fresh reviewer approved with no blocking items and two low findings,
both fixed after review: a non-string title guard on update, and tests that
assert unchanged state after an error and a stable second list.

**Journey log**

1. The first `render` preserved insertion order, so the tree was not ordered by
   id. A failing test caught it; each level now sorts numerically.
2. The reviewer found the update path lacked the title type guard the add path
   had, so a non-string title threw a raw TypeError. Fixed.
3. The SDK types confirmed `Tool.Context` carries `sessionID`, so scoping
   storage per session needed no extra plumbing.

## [S1] Problem

OpenCode V2 exposes no task or todo tool. The model tracks multi-step work in
prose, so progress is lost after compaction and easy to lose across turns. The
compose-next workflow assumes a task tracker and falls back to the feature
document, which is empty for work without a spec. MiMoCode ships a tree-shaped
task system (T1, T1.1) that survives its checkpoint cycle.

## [S2] Design

A plugin registers one `task` tool. State is a list of items per session.

- Item shape: `{ id, title, status, parent }`. The id is `T1`, `T1.1`, `T2`, and
  so on. Status is `open`, `doing`, or `done`. Parent is optional.
- Actions: `add` (title, optional parent), `update` (id plus status or title),
  `list`, and `clear`.
- The next id derives from the current list: a top-level item takes the next
  `Tn`, a child takes the next `Tn.m`. Ids never renumber once created.
- State lives in `ctx.storage` under `tasks/<sessionID>`. Storage is durable, so
  a resumed session keeps its tasks when the session id is reused.
- No prompt-hook injection. The tool is the only surface, and the model calls
  `list` when it needs the tree. This keeps context small.
- Errors are explicit: unknown id, unknown parent, and an empty title each fail
  with a clear message and change nothing.

## [S3] Out of Scope

- Project-level or cross-session tasks. Session storage only.
- Checkpoint and memory integration. That belongs to the memory port.
- A TUI status bar or other visual surface.
- Task dependencies. The feature document carries those.

## Tasks

- [x] T1: register the `task` tool with add, update, list, and clear, plus its
      JSON input schema - acceptance: the tool appears in the tool list and a
      fake-context test covers every action (covers: S2)
- [x] T2: persist items in `ctx.storage` per session and derive stable tree ids -
      acceptance: add, list, and update round-trip, and a second list returns the
      same ids (covers: S2; depends: T1)
- [x] T3: fail clearly on unknown id, unknown parent, and empty title -
      acceptance: tests cover all three and confirm no state change (covers: S2;
      depends: T2)
- [x] T4: README and a NOTICE entry that credits MiMoCode's task system -
      acceptance: both files exist and name the source (covers: S2; depends: T2)
