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
bun install    # postinstall strips proxy URLs from bun.lock
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

The repo installs no git hooks; run the commands above yourself. Git still
runs any globally configured hooks.

## The docs at `/docs/`

The documentation is written and tested in
[docs-factory](https://github.com/open-lakehouse/docs-factory), whose emitter
writes it into four directories here. Don't hand-edit them: change the source
in docs-factory and re-emit (`just uc-docs` there), or let its sync open the
PR. Prettier and ESLint skip them, because the emitter compares bytes.

| Path                       | What                                                          |
| -------------------------- | ------------------------------------------------------------- |
| `src/content/docs/`        | each page's Markdown, compiled by `plugins/docs-mdx.ts`       |
| `src/generated/docs/`      | nav and page data, heads, search records, redirects, coverage |
| `src/vendor/docs-plugins/` | the remark plugins that render the pages' directives          |
| `public/docs/`             | Markdown twins, runnable scripts, env archives, `llms.txt`    |

This repo owns how the docs look and behave: the routes in `src/routes/docs/`
and the components in `src/components/docs/`, which the vendored plugins import
as `@/components/<name>`. `test/docs.test.ts` checks the emitter's output
against what they expect.
