# AGENTS.md

Instructions for AI coding agents (Claude Code, Codex, Cursor, and others)
working in this repo: the [unitycatalog.io](https://unitycatalog.io) site,
built with React 19, Vite, and TanStack Start, prerendered and deployed on
Vercel. [`README.md`](README.md) has the full details.

## Rules and skills

- **Rules**: before doing any work, read every file in
  [`.agents/rules/`](.agents/rules/). Rules with `alwaysApply: true` are
  binding for all work in this repo.
- **Skills**: each folder in [`.cursor/skills/`](.cursor/skills/) has a
  `SKILL.md`. When a task matches a skill's description, read and follow it
  before starting.

New always-on conventions go in `.agents/rules/<name>.mdc`.

## Get up and running

This is a Bun-only project (`packageManager: bun@1.3.14`). Don't use npm,
pnpm, or yarn, and don't add another lockfile.

```sh
bun install    # also enables the git hooks in .githooks/
bun run dev    # dev server
```

After any `bun add`, `bun remove`, or `bun update`, run
`bun run strip-lock-proxy`. Behind a registry proxy, Bun writes proxy URLs
into `bun.lock`, and Vercel can't reach them. See
[`.agents/rules/bun-clean-lock-rule.mdc`](.agents/rules/bun-clean-lock-rule.mdc).

## Before you commit

Run what CI runs:

```sh
bun test
bun run lint                    # lint:fix to fix
bun run format                  # format:fix to fix
bun run typecheck
bun run build
bun run links:dist              # dead links in the build
bun run strip-lock-proxy:check  # no proxy URLs in bun.lock
```

The pre-commit hook (`.githooks/pre-commit`) also strips `bun.lock`, formats
and lints staged files, and checks links. The pre-push hook
(`.githooks/pre-push`) blocks pushes whose commits have proxy URLs in
`bun.lock`. Don't skip either with `--no-verify`.
