// Validates Unity Catalog website blog posts for problems that either build
// silently into a broken page or fail the build with a cryptic error.
//
// Usage (from the repo root):
//   bun .cursor/skills/creating-blog-posts/scripts/check-post.mjs [post-dir-or-index-file ...]
//
// With no arguments, every post under src/content/blog is checked.
// Exits 1 if any errors are found; warnings never fail.

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const BLOG_DIR = "src/content/blog";
const PROFILES_DIR = "src/content/profiles";
const LIKEC4_BUNDLE = "public/likec4/likec4-webcomponent.mjs";
const CALLOUT_TYPES = new Set([
  "tldr",
  "tip",
  "note",
  "info",
  "warning",
  "caution",
  "danger",
]);
const MDX_ONLY_COMPONENTS = [
  "Journey",
  "JourneyStep",
  "LikeC4View",
  "TrestleView",
];
const DATE_FORMAT =
  /^(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/;
const MAX_THUMBNAIL_BYTES = 1024 * 1024;

if (!fs.existsSync(BLOG_DIR) || !fs.existsSync(PROFILES_DIR)) {
  console.error(
    `Run this from the unitycatalog-website repo root (no ${BLOG_DIR} here).`,
  );
  process.exit(2);
}

// Remove spans where a colon is safe: inline code, link targets, URLs, tags.
const stripColonSafeSpans = (line) =>
  line
    .replace(/`+[^`]*`+/g, "")
    .replace(/\]\([^)]*\)/g, "]")
    .replace(/^\s*\[[^\]]+\]:\s*\S+/, "")
    .replace(/[a-z][\w+.-]*:\/\/\S+/gi, "")
    .replace(/<[^>]*>/g, "");

function parseFrontmatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) return null;
  const data = {};
  let listKey = null;
  for (const line of match[1].split(/\r?\n/)) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) {
      data[listKey].push(unquote(item[1]));
      continue;
    }
    const pair = line.match(/^([\w-]+):\s*(.*)$/);
    if (!pair) continue;
    const [, key, value] = pair;
    if (value === "") {
      data[key] = [];
      listKey = key;
    } else {
      data[key] = unquote(value);
      listKey = null;
    }
  }
  return { data, bodyOffset: match[0].split(/\r?\n/).length - 1 };
}

const unquote = (value) => value.trim().replace(/^(["'])(.*)\1$/, "$2");

function checkPost(dir) {
  const problems = [];
  const error = (msg) => problems.push(["error", msg]);
  const warn = (msg) => problems.push(["warn", msg]);

  const folder = path.basename(dir);
  const indexFiles = ["index.md", "index.mdx"].filter((f) =>
    fs.existsSync(path.join(dir, f)),
  );
  if (indexFiles.length !== 1) {
    error(
      indexFiles.length === 0
        ? "no index.md or index.mdx in the post folder"
        : "both index.md and index.mdx exist; keep one",
    );
    return { file: dir, problems };
  }
  const file = path.join(dir, indexFiles[0]);
  const isMdx = file.endsWith(".mdx");
  const text = fs.readFileSync(file, "utf8");

  const parsed = parseFrontmatter(text);
  if (!parsed) {
    error("missing or malformed --- frontmatter block");
    return { file, problems };
  }
  const { data, bodyOffset } = parsed;

  const folderMatch = folder.match(/^(\d{4}-\d{2}-\d{2})-(.+)$/);
  if (!folderMatch) {
    error(`folder "${folder}" must be named YYYY-MM-DD-<slug>`);
  } else if (!data.slug && !/^[a-z0-9-]+$/.test(folderMatch[2])) {
    warn(
      `slug "${folderMatch[2]}" should be lowercase kebab-case (the URL is /blogs/<slug> in lowercase; a space truncates it)`,
    );
  }

  if (!data.title) error("frontmatter: title is required");
  if (!data.description)
    warn(
      "frontmatter: add a description (used on blog cards and as the page meta description)",
    );
  if (data.category !== "guide")
    error(
      `frontmatter: category must be "guide" (got "${data.category ?? ""}")`,
    );

  const authors = Array.isArray(data.authors) ? data.authors : [];
  if (authors.length === 0)
    error("frontmatter: authors must list at least one profile id");
  for (const id of authors) {
    if (!fs.existsSync(path.join(PROFILES_DIR, id, "index.md")))
      error(
        `frontmatter: author "${id}" has no ${PROFILES_DIR}/${id}/index.md (build fails)`,
      );
  }

  if (!data.date) {
    error("frontmatter: date is required");
  } else {
    const parsedDate = new Date(data.date);
    if (Number.isNaN(parsedDate.getTime())) {
      error(
        `frontmatter: date "${data.date}" is not parseable; use "Month D, YYYY"`,
      );
    } else {
      if (!DATE_FORMAT.test(data.date))
        warn(
          `frontmatter: date "${data.date}" should look like "October 13, 2026"`,
        );
      const y = parsedDate.getFullYear();
      const m = String(parsedDate.getMonth() + 1).padStart(2, "0");
      const d = String(parsedDate.getDate()).padStart(2, "0");
      if (folderMatch && folderMatch[1] !== `${y}-${m}-${d}`)
        warn(
          `frontmatter: date ${y}-${m}-${d} differs from folder date ${folderMatch[1]}`,
        );
    }
  }

  if (!data.thumbnail) {
    warn("frontmatter: no thumbnail; the blog card will have no image");
  } else {
    const thumb = path.resolve(dir, data.thumbnail);
    if (!fs.existsSync(thumb)) {
      error(`frontmatter: thumbnail ${data.thumbnail} does not exist`);
    } else if (fs.statSync(thumb).size > MAX_THUMBNAIL_BYTES) {
      const mb = (fs.statSync(thumb).size / 1024 / 1024).toFixed(1);
      warn(
        `thumbnail is ${mb} MB; resize to ~1200x630 (e.g. sips -Z 1200 ${data.thumbnail})`,
      );
    }
  }

  const likec4Bundle = fs.existsSync(LIKEC4_BUNDLE)
    ? fs.readFileSync(LIKEC4_BUNDLE, "utf8")
    : "";
  const h2s = [];
  let fence = null;
  let openDirectives = 0;
  let closeDirectives = 0;

  text
    .split(/\r?\n/)
    .slice(bodyOffset)
    .forEach((line, i) => {
      const lineNo = bodyOffset + i + 1;
      const trimmed = line.trim();

      if (!fence && trimmed.startsWith("## ")) h2s.push(lineNo);

      const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
      if (fenceMatch) {
        if (!fence) fence = fenceMatch[1];
        else if (trimmed.startsWith(fence) && /^(`+|~+)$/.test(trimmed))
          fence = null;
        return;
      }
      if (fence) return;
      if (isMdx && /^(import|export)\s/.test(trimmed)) return;

      const directive = trimmed.match(/^(:{2,})([A-Za-z][\w-]*)?/);
      if (directive) {
        const [, colons, name] = directive;
        if (!name) closeDirectives++;
        else if (colons.length >= 3 && CALLOUT_TYPES.has(name))
          openDirectives++;
        else
          error(
            `line ${lineNo}: "${colons}${name}" is not a callout type (${[...CALLOUT_TYPES].join(", ")}); it renders as an empty <div>`,
          );
        return;
      }

      const prose = stripColonSafeSpans(line);
      for (const m of prose.matchAll(/(?<![\\:]):[A-Za-z0-9]/g)) {
        const context = prose
          .slice(Math.max(0, m.index - 20), m.index + 12)
          .trim();
        error(
          `line ${lineNo}: "…${context}…" — a colon followed by a letter/digit is parsed as a directive and deleted; wrap it in backticks or write \\:`,
        );
      }

      if (isMdx && line.includes("<!--"))
        error(`line ${lineNo}: HTML comments break MDX; use {/* … */}`);

      for (const name of MDX_ONLY_COMPONENTS) {
        if (!isMdx && new RegExp(`<${name}[\\s>/]`).test(line))
          error(`line ${lineNo}: <${name}> only renders in .mdx posts`);
      }

      const view = line.match(/<LikeC4View\s+viewId="([^"]+)"/);
      if (view && !likec4Bundle.includes(view[1]))
        warn(
          `line ${lineNo}: LikeC4 view "${view[1]}" is not in ${LIKEC4_BUNDLE}; use a static image instead`,
        );

      const diagram = line.match(/<TrestleView\s+src="([^"]+)"/);
      if (diagram && !fs.existsSync(`public${diagram[1]}`))
        error(
          `line ${lineNo}: Trestle snapshot public${diagram[1]} is missing; copy the emitter's public/ files`,
        );

      for (const img of line.matchAll(/!\[([^\]]*)\]\(([^)\s]+)/g)) {
        const [, alt, src] = img;
        if (!alt.trim()) warn(`line ${lineNo}: image ${src} has no alt text`);
        if (
          !/^([a-z]+:|\/)/i.test(src) &&
          !fs.existsSync(path.resolve(dir, src))
        )
          error(`line ${lineNo}: image ${src} does not exist`);
      }
    });

  if (fence) error("a code fence is never closed");
  if (openDirectives !== closeDirectives)
    error(
      `unbalanced callouts: ${openDirectives} opening ::: vs ${closeDirectives} closing :::`,
    );

  if (h2s.length === 0)
    warn("no ## headings; the table of contents will be empty");

  return { file, problems };
}

const args = process.argv.slice(2);
const dirs = args.length
  ? args.map((arg) => {
      const resolved = path.resolve(arg);
      if (!fs.existsSync(resolved)) {
        console.error(`Not found: ${arg}`);
        process.exit(2);
      }
      return fs.statSync(resolved).isDirectory()
        ? resolved
        : path.dirname(resolved);
    })
  : fs
      .readdirSync(BLOG_DIR, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.resolve(BLOG_DIR, entry.name));

let errors = 0;
let warnings = 0;
for (const dir of dirs) {
  const { file, problems } = checkPost(dir);
  if (problems.length === 0) continue;
  console.log(path.relative(process.cwd(), file));
  for (const [level, msg] of problems) {
    if (level === "error") errors++;
    else warnings++;
    console.log(`  ${level.padEnd(5)}  ${msg}`);
  }
}
console.log(
  `\n${errors} error(s), ${warnings} warning(s) in ${dirs.length} post(s)`,
);
process.exit(errors > 0 ? 1 : 0);
