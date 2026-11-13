# Unity Catalog website

The [unitycatalog.io](https://unitycatalog.io) site, built with React 19, Vite,
and TanStack Start. Every page is prerendered to static HTML at build time and
deployed on Vercel. The repo is a Bun project (`bun.lock`,
`packageManager: bun@1.3.14`).

This repo is the Vercel staging deployment: it is set up exactly as the
production site will be, so it can be checked end to end before
`unitycatalog.io` points at it.

## Develop

```sh
bun install
bun run dev          # dev server
bun run build        # prerender to .output/public
bun run preview      # serve the build
bun test             # test/
bun run lint         # lint:fix to fix
bun run format       # format:fix to fix
bun run typecheck
bun run links        # dead links in the sources
bun run links:dist   # dead links in the build (after bun run build)
```

`NITRO_PRESET=vercel bun run build` writes the layout Vercel deploys
(`.vercel/output`: `config.json`, `static/`, and the server function). Vercel
picks that preset automatically.

After `bun add`, `bun update`, or any install that changes `bun.lock`, run:

```sh
bun run strip-lock-proxy         # blank proxy URLs in bun.lock
bun run strip-lock-proxy:check   # exit 1 if any remain
```

Bun records the full tarball URL for any registry other than npmjs.org. If
your `.npmrc` points at an internal npm proxy, `bun.lock` ends up full of proxy
URLs that Vercel and CI can't reach. The script blanks them, which means "the
default registry". `test/lockfile.test.ts` fails until you run it. Versions
are exact (`bunfig.toml`). See
[.agents/rules/bun-clean-lock-rule.mdc](.agents/rules/bun-clean-lock-rule.mdc).

You rarely run it by hand: `postinstall` runs it after every `bun install`,
`add`, `remove`, and `update`, so the `bun.lock` on disk is already clean. The repo installs no
git hooks of its own; CI runs lint, format, and the link check.

## Layout

- `site.config.mjs`: the site URL, title, default image, header and footer
  menus, and redirects.
- `src/content/blog/<YYYY-MM-DD-slug>/` and `src/content/profiles/<id>/`: posts
  and author profiles, with their images. See
  [.cursor/skills/creating-blog-posts](.cursor/skills/creating-blog-posts/SKILL.md).
- `src/routes/`: pages (`/`, `/blogs/`, `/blogs/$id/`, `/events/`) and the
  discovery files (`/sitemap.xml`, the index, `/sitemap-0.xml`, `/llms.txt`,
  `/llms-full.txt`, `/robots.txt`).
- `src/components/`: React components, each with a colocated CSS Module.
  `src/styles/` holds the global styles and Tailwind setup.
- `src/lib/`: blog helpers, the llms and robots renderers, the FAQ, the post id
  rule, and the redirects for other letter cases.
- `plugins/`: build plugins (content, MDX, images, prerendering, Vercel
  routing).
- `public/`: static files, including the favicon set and the LikeC4 bundle.
- `scripts/`: the link checker and the lockfile proxy strip
  (`strip-bun-lock-proxy.ts`, which `postinstall` runs).
- `AGENTS.md` and `.agents/rules/`: setup and rules for AI coding agents.
  `CLAUDE.md` imports `AGENTS.md`, so Claude Code reads the same instructions.

## How it builds

- **Content**: `content-collections.ts` loads post and profile metadata and
  checks the frontmatter. Post bodies compile through `@mdx-js/rollup`
  (`plugins/mdx.ts`) with GFM, SmartyPants, and callouts (`:::tip` and
  friends). Code blocks render like the docs': Shiki highlights them at build
  time (`plugins/shiki.ts`) and `<Pre>` (`src/components/docs/code-block.tsx`)
  draws the chrome. Images become WebP through vite-imagetools.
- **Prerendering**: `vite.config.ts` lists `/`, every post, and the discovery
  files, and the crawler follows links from there. A link to an unknown page,
  or to a page's URL in another letter case, fails the build.
- **Search**: the ⌘K palette (`src/components/search/`) searches
  `/search-index.json`, a discovery file `src/lib/search-records.ts` builds
  from the docs' emitted records, every post's sections, and the site pages.
- **Vercel routing** is in `plugins/vercel-output.ts`, which Nitro writes into
  `.vercel/output/config.json`:
  - security headers on every response (`X-Frame-Options`,
    `X-Content-Type-Options`, `Referrer-Policy`);
  - the `site.config.mjs` redirects, as one 301 to the slash form;
  - one 301 to each page from any other letter case or slash form of its URL;
  - the trailing-slash 301 for other page paths;
  - the discovery files' `Content-Type`.

  Nitro adds immutable caching for `/assets/*`, the filesystem, and a fallback
  to the server function (on Bun), which renders the 404 page. `vercel.ts`
  sets only `bunVersion` and the install and build commands; routing set there
  would be merged into `config.json` and apply twice.

## URLs

Every page URL is lowercase and ends in a slash. A post's URL is
`/blogs/<id>/`, where the id is its folder's slug (or its frontmatter `slug`)
in lowercase (`src/lib/post-id.mjs`): `2025-05-05-unity-catalog-for-AI/` is
`/blogs/unity-catalog-for-ai/`. Any other letter case or slash form of a page
301s to it. Files in `public/` are served in their own letter case only.

## Deploy on Vercel

1. Import this repo as a Vercel project. The Root Directory is the repo root.
   Vercel detects Bun from `bun.lock`; the install and build commands come
   from `vercel.ts`.
2. For the staging project, set the environment variable `NOINDEX=1`. Every
   response then carries `X-Robots-Tag: noindex`, so the staging copy stays
   out of search results while its pages, canonical tags, and `robots.txt`
   stay exactly as production's. Leave it unset for production.
3. Production branch: `main`. Attach a staging hostname if you want one.

Check on the first deploy, since these only show on Vercel itself:

- The build works on Vercel's build image: Bun install, sharp's Linux
  binaries, and prerendering.
- Page URLs in other letter cases 301 once: `/BLOGS/` to `/blogs/`, and
  `/blogs/unity-catalog-for-AI/` to `/blogs/unity-catalog-for-ai/`. This
  relies on Vercel honoring `caseSensitive` on the page routes; if it didn't,
  those would reach the server function instead.
- Redirects keep the query string: `/blog?topic=releases` goes to
  `/blogs/?topic=releases`.
- `/llms.txt` and `/robots.txt` are `text/plain; charset=utf-8`, and the
  sitemaps are `application/xml`.
- Missing pages, such as `/missing-page/`, return 404 with the 404 page and
  the security headers. Vercel's Bun runtime is in beta: if it misbehaves,
  remove `bunVersion` from `vercel.ts`.
- With `NOINDEX=1`, responses carry `X-Robots-Tag: noindex`.
- By hand: search, code copy buttons, the LikeC4 diagram, the blog topic
  filter and pagination, and Plausible requests.

Redirecting `www` to the apex is a domain setting in Vercel.

## CI

`.github/workflows/ci.yaml` runs `bun test`, lint, format, typecheck, and
`bun run build` on every pull request and push to `main`.

`.github/workflows/links.yaml` checks for dead links on the same events,
weekly on Mondays, and on demand from the Actions tab:

- **Sources**: internal links and anchors, reported at their file and line.
- **Build (default)** and **Build (vercel)**: every page and file in each
  build, as Vercel serves it. The default build also requests the external
  URLs the site links to. URLs that passed within the last week are skipped,
  from a cache, and the weekly run re-checks all of them.

Dead links fail the job and show as annotations and in the job summary. Bot
walls, timeouts, and 5xx answers are only warnings. A known false positive goes
in `scripts/check-links.ignore`.
