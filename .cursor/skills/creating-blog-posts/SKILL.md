---
name: creating-blog-posts
description: Creates and validates blog posts for the Unity Catalog website (content collection in src/content/blog), covering post folders, frontmatter, author profiles, images and thumbnails, callouts, MDX step timelines, and pre-PR checks. Use when the user asks to write, draft, add, scaffold, port, review, or publish a blog post or article on this site, add a blog author, or check a post before opening a PR.
---

# Creating blog posts

## How posts are structured

Each post is one folder holding the post file, its thumbnail, and its images:

```
src/content/blog/2026-10-13-unity-catalog-and-duckdb/
├── index.md          # or index.mdx when using components
├── thumbnail.png
└── architecture-diagram.png
```

- The folder must be `YYYY-MM-DD-<slug>`. The post's URL is `/blogs/<slug>/` with `<slug>` in lowercase (`src/lib/post-id.mjs`), so `2025-05-05-unity-catalog-for-AI` is `/blogs/unity-catalog-for-ai/`. Name folders in lowercase kebab-case anyway, so the folder matches the URL, and avoid spaces: one truncates the slug.
- Use `index.md` by default. Use `index.mdx` only for the `<Journey>` step timeline or `<LikeC4View>` diagrams (see [reference.md](reference.md)).
- Nothing gates publishing: merging to `main` deploys, and the post with the newest `date` becomes the featured card on `/blogs`.

## Workflow

```
- [ ] 1. Gather inputs
- [ ] 2. Confirm or create author profiles
- [ ] 3. Create the post folder and index file
- [ ] 4. Write the body
- [ ] 5. Add images and the thumbnail
- [ ] 6. Validate
```

### 1. Gather inputs

Confirm the topic, target reader, author profile ids, publish date (default: today), and the exact Unity Catalog, Delta, and Spark versions involved. Ask for a thumbnail image if none was provided; never invent one. Do not invent APIs, config keys, versions, or command output: verify them against the Unity Catalog repo or docs, or ask.

### 2. Author profiles

List existing ids with `ls src/content/profiles`. For a new author, create `src/content/profiles/<first-last>/index.md` next to a square `photo.jpg` (about 800×800, under 200 KB):

```markdown
---
id: first-last
name: First Last
title: Staff Developer Advocate
photo: ./photo.jpg
---
```

`id` must equal the folder name. An unknown author id fails the build with `author "<id>" has no profile in ./src/content/profiles`.

### 3. Post template

```markdown
---
title: Using Unity Catalog with DuckDB
description: One or two sentences shown on the blog card and used as the page meta description.
authors:
  - first-last
category: guide
date: October 13, 2026
thumbnail: ./thumbnail.png
---

:::tldr

- The single most important takeaway.
- What the reader can do after reading.
- The versions it works with today.

:::

Short intro: the problem, and why the reader should care.

## Getting started

## Wrap-up
```

Frontmatter rules (schema in `content-collections.ts`):

- `title`: required.
- `description`: optional in the schema, but always include it; without it the blog card has no summary.
- `authors`: required list of profile ids.
- `category`: must be `guide`, the only allowed value. Adding another requires changing the schema.
- `date`: `Month D, YYYY`, matching the folder date. The listing sorts with `new Date(date)`.
- `thumbnail`: a relative path such as `./thumbnail.png`. Always include one; it is the card image.

### 4. Body

Follow the shape of recent posts (`2026-07-03-unity-catalog-delta-api`, `2026-08-24-uc-metric-views`):

- Open with a `:::tldr` of 3 to 5 bullets, then a short motivating intro.
- Use `##` for main sections, since they become the sidebar table of contents, and `###` for subsections.
- For hands-on posts, add a "Getting started" section that pins exact versions and shows the server config, then walk through steps (numbered `##` sections, or a `<Journey>` in MDX).
- Give every code fence a language. Add `title="file.py"` for files the reader creates, and show expected output in a plain fence right after.
- Link to versioned sources (`blob/v0.5.0/...`), not `main`.
- Link other posts by their lowercase URL, `/blogs/<slug>`. Another letter case fails the build.
- End with a short final `##` section ("Wrap-up" or "Learn more") that links to the release, the docs (`https://go.unitycatalog.io/docs`), and Slack (`https://go.unitycatalog.io/slack`). The post page renders the last `##` section inside a highlighted box, so keep it brief.
- Voice: first-person plural ("we", "let's"), conversational but precise. Explain why before how.

### Rules that silently break the page

The build does not catch these; the page renders with missing text or dead links.

1. **A colon followed by a letter or digit in prose gets deleted.** `remark-directive` parses `localhost:8080`, `8:30 AM`, `3:2`, and `:D` as text directives and drops them. Put them in backticks (`` `localhost:8080` ``) or escape the colon (`8\:30 AM`). Colons in code, links, and `://` URLs are safe.
2. **Only known callout names render.** `:::tldr`, `:::tip`, `:::note`, `:::info`, `:::warning`, `:::caution`, `:::danger`. Any other `:::name` renders as an empty unstyled `<div>`.
3. **MDX only:** escape `<`, `{`, and `}` in prose (`&lt;`, `\{`, `\}`), and use `{/* comment */}` instead of HTML comments.

### 5. Images and thumbnail

- Store images in the post folder with kebab-case names and reference them relatively, with real alt text: `![Unity Catalog and DuckDB architecture](./architecture-diagram.png)`. The build converts them to WebP.
- Make thumbnails about 1200×630 and under 500 KB. Large originals bloat the repo (recent ones were 3 to 9 MB). On macOS: `sips -Z 1200 thumbnail.png`.

### 6. Validate

Run these from the repo root (run `bun install` first if `node_modules` is missing):

```bash
bun .cursor/skills/creating-blog-posts/scripts/check-post.mjs src/content/blog/<folder>
bunx prettier --write src/content/blog/<folder>
bun run build
```

- `check-post.mjs` enforces everything above (folder name, frontmatter, authors, thumbnail, callouts, colon deletion, missing images). Fix every `error`; fix `warn`s unless there is a reason not to. Run it with no arguments to check all posts.
- Prettier reformats Markdown (tables, list indentation). CI runs `bun run lint`, `bun run format`, and the link check.
- Preview with `bun run dev` at `/blogs/<slug>/` (in lowercase) on the URL it prints, then click every TOC link and check callouts, code titles, and images.

Commit messages follow `feat: add <topic> blog`. Only commit when the user asks.

## Additional resources

- MDX components (`<Journey>`, `<JourneyStep>`, `<LikeC4View>`, `<TrestleView>`), callout syntax, and code-block options: [reference.md](reference.md)
