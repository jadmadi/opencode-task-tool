# Contributing

Thanks for helping improve opencode-task-tool.

## Setup

```sh
git clone https://github.com/jadmadi/opencode-task-tool
cd opencode-task-tool
bun test
```

Bun is a deliberate exception to the global no-bun rule here: the plugin runs
inside OpenCode, which embeds Bun.

## Rules

- No imports in the plugin. Export a plain `{ id, setup }` object.
- Keep the tree ids stable. Never renumber an existing item.
- Add a test for any behavior you change.

## Reporting a bug

Open an issue with your OpenCode version from `opencode2 --version`, the tool
input you used, and the result or error.

## Sending a change

1. Branch: `git checkout -b fix/short-description`.
2. Make the change and add tests.
3. Run `bun test`.
4. Use a semantic commit message.
5. Open a pull request against `main`.

## License

By contributing, you agree that your work is released under the AGPL-3.0-only License.
