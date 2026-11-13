// Finds dead links on the Unity Catalog website, either in its sources (fast,
// no build needed) or in a built site (complete).
//
// Usage (from the repo root):
//   bun scripts/check-links.mjs           sources: every internal and external link
//   bun scripts/check-links.mjs --staged  before committing: fails only on dead links the commit
//                                         adds, or creates by deleting or renaming a page
//   bun scripts/check-links.mjs --dist    after `bun run build`: every page, llms.txt,
//                                         llms-full.txt, robots.txt, and the sitemaps
//                                         (the site's and the docs') in .output/public
//   bun scripts/check-links.mjs --dist .vercel/output/static
//                                         the same for the Vercel build
//
// A build is checked as Vercel serves it: files match case-sensitively, and
// the redirects are those of site.config.mjs plus one from any other letter
// case of each page in the build's sitemap.
//
// Options: --offline (or LINKS_OFFLINE=1) skips external URLs; --no-cache re-checks
// external URLs that passed within the last week; SKIP_LINK_CHECK=1 skips the check.
// Known exceptions go in scripts/check-links.ignore.
//
// A link is dead when an internal path has no page or file, an #anchor has no
// matching heading or id, or an external URL answers 404/410, its host doesn't
// resolve, or its TLS certificate is invalid, twice: a dead answer is retried
// once. Bot walls (401/403/429/999), timeouts, refused connections, and 5xx are
// only warnings. The docs' pages, heading ids, and legacy redirects come from
// what docs-factory emitted (src/lib/docs-site.mjs).
//
// In CI (CI=true) a missing network fails the check instead of skipping the
// external URLs; pass --offline to skip them. In GitHub Actions each dead link
// is also an error annotation, at its file and line in source mode, and the
// results go to the job summary.

import { execFileSync } from "node:child_process";
import { lookup } from "node:dns/promises";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { redirects, site } from "../site.config.mjs";
import { caseRedirects } from "../src/lib/case-redirects.mjs";
import { readDocsSite } from "../src/lib/docs-site.mjs";
import { postId } from "../src/lib/post-id.mjs";

if (process.env.SKIP_LINK_CHECK === "1") process.exit(0);

const args = process.argv.slice(2);
const MODE = args.includes("--dist")
  ? "dist"
  : args.includes("--staged")
    ? "staged"
    : "source";
const OFFLINE = args.includes("--offline") || process.env.LINKS_OFFLINE === "1";
const USE_CACHE = !args.includes("--no-cache");

const distArg = args[args.indexOf("--dist") + 1];
const DIST =
  MODE === "dist" && distArg && !distArg.startsWith("--")
    ? path.normalize(distArg).replace(/\/+$/, "")
    : ".output/public";
const IGNORE_FILE = "scripts/check-links.ignore";
const CACHE_FILE = "node_modules/.cache/check-links/external.json";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 15_000;
const RETRY_DELAY_MS = 3_000;
const CONCURRENCY = 8;
const PER_HOST = 2;
const CI = process.env.CI === "true";
const GITHUB_ACTIONS = process.env.GITHUB_ACTIONS === "true";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36 unitycatalog-website-link-check";

const SOURCE_FILE = /^(src\/.*\.(tsx|ts|md|mdx|mjs)|site\.config\.mjs)$/;
const GENERATED_SOURCE = "src/routeTree.gen.ts";
const DOCS_CONTENT = "src/content/docs/";
const MARKDOWN = /\.mdx?$/;

// Paths the build emits, so no source file backs them.
const GENERATED = [
  /^\/sitemap(-\d+)?\.xml$/,
  /^\/assets\//,
  /^\/(favicon|apple-touch-icon|android-chrome|mstile)[\w.-]*$/,
  /^\/(manifest\.webmanifest|browserconfig\.xml|safari-pinned-tab\.svg)$/,
];

// Hosts that never resolve publicly, XML namespaces, and preconnect origins.
const SKIP_URL =
  /^https?:\/\/(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|[^/.:]+(:\d+)?(\/|$)|([\w-]+\.)*example\.(com|org|net)|www\.w3\.org\/(1999|2000|2001)\/|fonts\.(googleapis|gstatic)\.com\/?$)/i;
// Case-sensitive so real slugs like `find-your-data` are still checked.
const PLACEHOLDER =
  /[<>{}$*…[\]]|%7[Bb]|\bYOUR[_-]|^https?:\/\/your[-_.]|\b(xxx|XXX)\b/;

if (!fs.existsSync("site.config.mjs")) {
  console.error("Run this from the repo root.");
  process.exit(2);
}

const docs = readDocsSite(new URL("../src/generated/docs/", import.meta.url));
// Docs legacy sections, matched in any letter case as Vercel matches `src`.
const docsPatterns = docs.patterns.map(({ source }) => new RegExp(source, "i"));
const docsRedirected = (p) =>
  Object.hasOwn(docs.redirects, routeKey(p)) ||
  docsPatterns.some((re) => re.test(p));

const siteUrl = new URL(site);
// Absolute links to these hosts are checked as internal paths.
const SITE_HOSTS = new Set([
  siteUrl.host,
  "unitycatalog.io",
  "www.unitycatalog.io",
]);

// One URL or path per line; a trailing * matches any suffix.
const ignored = (() => {
  if (!fs.existsSync(IGNORE_FILE)) return () => false;
  const rules = fs
    .readFileSync(IGNORE_FILE, "utf8")
    .split(/\r?\n/)
    .map((l) => l.replace(/#.*/, "").trim())
    .filter(Boolean);
  return (url) =>
    rules.some((r) =>
      r.endsWith("*") ? url.startsWith(r.slice(0, -1)) : url === r,
    );
})();

// ---------- helpers ----------

const git = (...gitArgs) =>
  execFileSync("git", gitArgs, {
    encoding: "utf8",
    maxBuffer: 64 << 20,
    stdio: ["ignore", "pipe", "ignore"],
  });

const lines = (text) => text.split(/\r?\n/);

// Pages answer in any letter case and with or without a trailing slash: Vercel
// 301s the other forms to the page (src/lib/case-redirects.mjs). Source mode
// matches files the same way; --dist checks their letter case.
const routeKey = (p) =>
  (p.length > 1 ? p.replace(/\/+$/, "") : p).toLowerCase();

const decodeHash = (hash) => {
  try {
    return decodeURIComponent(hash);
  } catch {
    return hash;
  }
};

// Posts get heading ids from github-slugger on the rendered heading text
// (plugins/rehype-heading-ids.ts).
const slug = (raw) =>
  raw
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*]/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\p{M}\s_-]/gu, "")
    .replace(/ /g, "-");

function headingIds(markdown) {
  const ids = new Set();
  const seen = new Map();
  let fence = null;
  for (const line of lines(markdown)) {
    const t = line.trim();
    const f = t.match(/^(`{3,}|~{3,})/);
    if (f) {
      if (!fence) fence = f[1];
      else if (/^(`+|~+)$/.test(t)) fence = null;
      continue;
    }
    if (fence) continue;
    for (const m of line.matchAll(/\bid=["']([\w-]+)["']/g)) ids.add(m[1]);
    const h = t.match(/^#{1,6}\s+(.+?)\s*#*$/);
    if (!h) continue;
    const base = slug(h[1]);
    const n = seen.get(base) ?? 0;
    seen.set(base, n + 1);
    ids.add(n ? `${base}-${n}` : base);
  }
  return ids;
}

// Cuts a bare URL at the first unbalanced ")" (the end of a Markdown link)
// and drops trailing sentence punctuation.
function trimUrl(url) {
  let depth = 0;
  for (let i = 0; i < url.length; i++) {
    if (url[i] === "(") depth++;
    else if (url[i] === ")" && depth-- === 0) {
      url = url.slice(0, i);
      break;
    }
  }
  return url.replace(/[.,;:!?'"*_]+$/, "");
}

// ---------- link extraction ----------

const MD_LINK = /\]\(\s*<?([^)\s>]+)/g;
const MD_REF = /^\s*\[[^\]]+\]:\s*<?(\S+?)>?(\s|$)/;
const ATTR = /\b(?:href|src)\s*=\s*\{?\s*["'`]([^"'`]+)["'`]/g;
const PROP = /\bhref\s*:\s*["'`]([^"'`]+)["'`]/g;
const BARE = /https?:\/\/[^\s"'`<>\\|^]+/g;

// Returns [{ url, line }] for one file. Markdown fences and inline code are
// skipped: they hold sample endpoints, not links.
function extractLinks(file, text) {
  const out = [];
  const md = MARKDOWN.test(file) || file.endsWith(".txt");
  let fence = null;
  lines(text).forEach((raw, i) => {
    let s = raw;
    if (md) {
      const t = s.trim();
      const f = t.match(/^(`{3,}|~{3,})/);
      if (f) {
        if (!fence) fence = f[1];
        else if (/^(`+|~+)$/.test(t)) fence = null;
        return;
      }
      if (fence) return;
      s = s.replace(/`+[^`]*`+/g, "");
    }
    const found = new Set();
    for (const re of [MD_LINK, ATTR, PROP])
      for (const m of s.matchAll(re)) found.add(m[1]);
    const ref = md && s.match(MD_REF);
    if (ref) found.add(ref[1]);
    for (const m of s.matchAll(BARE)) found.add(trimUrl(m[0]));
    for (const url of found) out.push({ url, line: i + 1 });
  });
  return out;
}

function extractDistLinks(file, text) {
  if (file.endsWith(".xml"))
    return [...text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => ({
      url: m[1],
      line: 0,
    }));
  if (!file.endsWith(".html")) return extractLinks(file, text);
  const out = [];
  for (const tag of text.matchAll(
    /<(a|link|img|script|iframe|source)\b[^>]*>/gi,
  )) {
    if (/\brel=["']?(preconnect|dns-prefetch)/i.test(tag[0])) continue;
    const m = tag[0].match(/\b(?:href|src)=["']([^"']+)["']/i);
    if (m) out.push({ url: m[1].replace(/&amp;/g, "&"), line: 0 });
  }
  return out;
}

// ---------- classify one link ----------

function classify(url, file) {
  if (/^(mailto|tel|javascript|data|blob):/i.test(url)) return null;
  if (url === "#" || PLACEHOLDER.test(url) || ignored(url)) return null;
  if (/^https?:\/\//i.test(url)) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      return null;
    }
    if (SITE_HOSTS.has(parsed.host))
      return {
        kind: "internal",
        path: decodeURI(parsed.pathname),
        hash: decodeHash(parsed.hash.slice(1)),
      };
    if (SKIP_URL.test(url)) return null;
    parsed.hash = "";
    return { kind: "external", url: parsed.href };
  }
  if (url.startsWith("//")) return null;
  if (url.startsWith("#"))
    return { kind: "anchor", hash: decodeHash(url.slice(1)) };
  const [pathPart, hash = ""] = url.split("#");
  const cleanPath = decodeURI(pathPart.split("?")[0]);
  if (url.startsWith("/")) {
    if (ignored(cleanPath)) return null;
    return { kind: "internal", path: cleanPath, hash: decodeHash(hash) };
  }
  if (MARKDOWN.test(file) && /^\.{1,2}\//.test(url))
    return {
      kind: "relative",
      target: path.join(path.dirname(file), cleanPath),
    };
  return null;
}

// ---------- external checks ----------

function verdictFor(status) {
  if (status >= 200 && status < 400) return { verdict: "ok" };
  if (status === 404 || status === 410)
    return { verdict: "dead", reason: `${status}` };
  if ([401, 403, 429, 999].includes(status))
    return {
      verdict: "warn",
      reason: `${status}, bot protection or rate limit; check by hand`,
    };
  return { verdict: "warn", reason: `${status}` };
}

async function request(url, method, timeout = TIMEOUT_MS) {
  const res = await fetch(url, {
    method,
    redirect: "follow",
    signal: AbortSignal.timeout(timeout),
    headers: {
      "User-Agent": USER_AGENT,
      Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
    },
  });
  await res.body?.cancel();
  return res.status;
}

// Many servers reject or drop HEAD, so anything but a 2xx/3xx retries as GET.
async function fetchStatus(url) {
  try {
    const status = await request(url, "HEAD");
    if (status >= 200 && status < 400) return status;
  } catch {
    // fall through to GET
  }
  return request(url, "GET");
}

// A dead answer is retried once, after a pause, so a blip in DNS or at the
// host doesn't fail the check.
async function checkExternal(url) {
  const first = await checkExternalOnce(url);
  if (first.verdict !== "dead") return first;
  await new Promise((done) => setTimeout(done, RETRY_DELAY_MS));
  return checkExternalOnce(url);
}

async function checkExternalOnce(url) {
  try {
    return verdictFor(await fetchStatus(url));
  } catch (err) {
    if (err?.name === "TimeoutError" || err?.name === "AbortError")
      return {
        verdict: "warn",
        reason: `timed out after ${TIMEOUT_MS / 1000}s`,
      };
    // Bun puts the code on the error, Node on the error's cause.
    const code = String(err?.code ?? err?.cause?.code ?? err?.name ?? "error");
    if (/CERT|SSL/.test(code)) return { verdict: "dead", reason: code };
    // Bun's fetch names a host that doesn't resolve variously
    // (ConnectionRefused, FailedToOpenSocket), so DNS answers that.
    if (!(await resolves(new URL(url).hostname)))
      return { verdict: "dead", reason: "host doesn't resolve" };
    // A refused connection can be the checking machine's network, such as
    // a firewall or proxy, so it is only a warning.
    return { verdict: "warn", reason: code };
  }
}

// False only when DNS says the host doesn't exist, not when it can't answer.
async function resolves(host) {
  try {
    await lookup(host);
    return true;
  } catch (err) {
    return err?.code !== "ENOTFOUND";
  }
}

async function online() {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await request("https://github.com", "HEAD", 5000);
      return true;
    } catch {
      // try again
    }
  }
  return false;
}

// Runs `fn` over `items` with a global and a per-host concurrency limit.
function pool(items, fn) {
  const results = new Map();
  const pending = [...items];
  const active = new Map();
  let running = 0;
  return new Promise((resolve) => {
    const next = () => {
      if (pending.length === 0 && running === 0) return resolve(results);
      for (let k = 0; k < pending.length && running < CONCURRENCY;) {
        const url = pending[k];
        const host = new URL(url).host;
        if ((active.get(host) ?? 0) >= PER_HOST) {
          k++;
          continue;
        }
        pending.splice(k, 1);
        running++;
        active.set(host, (active.get(host) ?? 0) + 1);
        fn(url)
          .then((r) => results.set(url, r))
          .finally(() => {
            running--;
            active.set(host, active.get(host) - 1);
            next();
          });
      }
    };
    next();
  });
}

function loadCache() {
  if (!USE_CACHE || !fs.existsSync(CACHE_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// ---------- sources: files, routes ----------

function blogPosts(files, read) {
  const posts = new Map();
  for (const f of files) {
    const m = f.match(/^src\/content\/blog\/([^/]+\/index\.mdx?)$/);
    if (!m) continue;
    const frontmatter = read(f).match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
    const fmSlug = frontmatter.match(/^slug:\s*["']?([^"'\n]+?)["']?\s*$/m);
    try {
      posts.set(postId(m[1], fmSlug?.[1]), f);
    } catch {
      // Not a dated post folder; the build reports it.
    }
  }
  return posts;
}

function buildRoutes(files, posts) {
  const routes = new Set(["/"]);
  const dynamic = [];
  // TanStack Router file routes: `blogs/index.tsx` is /blogs, `$id` is a
  // parameter, `[.]` is a literal dot, and `__root` is the layout.
  for (const f of files) {
    if (!/^src\/routes\/.+\.tsx?$/.test(f)) continue;
    const route =
      f
        .slice("src/routes".length)
        .replace(/\.tsx?$/, "")
        .replace(/\[\.\]/g, ".")
        .replace(/\/index$/, "") || "/";
    if (route.split("/").some((segment) => segment.startsWith("_"))) continue;
    // The docs' splat route renders only the pages docs-factory emitted,
    // which are listed below.
    if (route === "/docs/$" && docs.pages.length) continue;
    if (route === "/blogs/$id") {
      for (const id of posts.keys()) routes.add(`/blogs/${id}`);
    } else if (route.includes("$")) {
      const re = route.replace(/\/\$$/, "/.*").replace(/\$[^/]+/g, "[^/]+");
      dynamic.push(new RegExp(`^${re}$`, "i"));
    } else routes.add(routeKey(route));
  }
  for (const f of files)
    if (f.startsWith("public/")) routes.add(routeKey(f.slice("public".length)));
  for (const from of Object.keys(redirects)) routes.add(routeKey(from));
  for (const page of docs.pages) routes.add(routeKey(page));
  const has = (p) => {
    const key = routeKey(p);
    return (
      routes.has(key) ||
      docsRedirected(p) ||
      dynamic.some((re) => re.test(key)) ||
      GENERATED.some((re) => re.test(key))
    );
  };
  return { has, size: routes.size };
}

// Line numbers each staged file adds, from `git diff --cached -U0`.
function addedLinesByFile() {
  const added = new Map();
  let current = null;
  for (const l of lines(
    git("diff", "--cached", "-U0", "--diff-filter=ACMR", "--no-color"),
  )) {
    const header = l.match(/^\+\+\+ b\/(.+)$/);
    if (header) {
      current = header[1];
      added.set(current, new Set());
      continue;
    }
    const hunk = l.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/);
    if (hunk && current) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      for (let n = start; n < start + count; n++) added.get(current).add(n);
    }
  }
  return added;
}

// ---------- run ----------

const dead = []; // { at, url, reason, blocking }
const warnings = [];
let internalCount = 0;
const externals = new Map(); // url -> [{ at, blocking }]

const where = (file, line) => (line ? `${file}:${line}` : file);
const addExternal = (url, at, blocking = true) => {
  if (!externals.has(url)) externals.set(url, []);
  externals.get(url).push({ at, blocking });
};

if (MODE === "dist") {
  if (!fs.existsSync(path.join(DIST, "index.html"))) {
    console.error(`No build found in ${DIST}/. Run \`bun run build\` first.`);
    process.exit(2);
  }
  const all = fs
    .readdirSync(DIST, { recursive: true })
    .map((f) => path.join(DIST, f));
  // Vercel's filesystem is case-sensitive, so files are keyed as written.
  const built = new Map(
    all.filter((f) => fs.statSync(f).isFile()).map((f) => [f, f]),
  );
  const files = [...built.values()].filter(
    (f) =>
      f.endsWith(".html") ||
      /\/(llms(-full)?|robots)\.txt$/.test(f) ||
      /\/sitemap(-[\w-]+)?\.xml$/.test(f),
  );
  const idCache = new Map();
  const idsIn = (htmlFile) => {
    if (!idCache.has(htmlFile))
      idCache.set(
        htmlFile,
        new Set(
          [
            ...fs
              .readFileSync(htmlFile, "utf8")
              .matchAll(/\b(?:id|name)=["']([^"']+)["']/g),
          ].map((m) => m[1]),
        ),
      );
    return idCache.get(htmlFile);
  };
  const resolveDist = (p) => {
    const base = path.join(DIST, p).replace(/\/+$/, "");
    const candidates = p.endsWith("/")
      ? [path.join(base, "index.html"), `${base}.html`]
      : [base, path.join(base, "index.html"), `${base}.html`];
    return candidates.map((c) => built.get(c)).find(Boolean);
  };
  // Paths answered with a redirect even when no file exists there:
  // config.json has the site.config.mjs and docs redirects, the docs'
  // legacy-section patterns, and a 301 from any other letter case or slash
  // form of each page, in the sitemap or the docs, to the page; all match in
  // any letter case.
  const sitemapFile = path.join(DIST, "sitemap-0.xml");
  const sitemapPages = !fs.existsSync(sitemapFile)
    ? []
    : [
        ...fs
          .readFileSync(sitemapFile, "utf8")
          .matchAll(/<loc>([^<]+)<\/loc>/g),
      ].map((m) => decodeURI(new URL(m[1]).pathname));
  const distRedirects = new Set(Object.keys(redirects).map(routeKey));
  const pageRedirects = caseRedirects([
    ...new Set([...sitemapPages, ...docs.pages]),
  ]);
  const redirected = (p) =>
    distRedirects.has(routeKey(p)) ||
    docsRedirected(p) ||
    (pageRedirects.has(routeKey(p)) && pageRedirects.get(routeKey(p)) !== p);
  // A path that only exists in another letter case.
  const caseless = new Set([...built.keys()].map((f) => f.toLowerCase()));
  const missing = (p) => {
    const base = path.join(DIST, p).toLowerCase().replace(/\/+$/, "");
    return [base, path.join(base, "index.html")].some((c) => caseless.has(c))
      ? `no page or file in ${DIST}/ in this letter case (Vercel's filesystem is case-sensitive)`
      : `no page or file in ${DIST}/`;
  };

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const { url, line } of extractDistLinks(file, text)) {
      const link = classify(url, file);
      if (!link || link.kind === "relative") continue;
      if (link.kind === "external") {
        addExternal(link.url, where(file, line));
        continue;
      }
      internalCount++;
      const target =
        link.kind === "anchor" ? file : resolveDist(link.path || "/");
      if (!target && !redirected(link.path || "/"))
        dead.push({
          at: where(file, line),
          url,
          reason: missing(link.path || "/"),
          blocking: true,
        });
      else if (
        link.hash &&
        target?.endsWith(".html") &&
        !idsIn(target).has(link.hash)
      )
        dead.push({
          at: where(file, line),
          url,
          reason: `no element with id "${link.hash}"`,
          blocking: true,
        });
    }
  }
  console.log(
    `Scanned ${files.length} built files in ${DIST}/ (served as on Vercel).`,
  );
} else {
  const staged = MODE === "staged";
  const files = lines(
    staged
      ? git("ls-files", "--cached")
      : git("ls-files", "--cached", "--others", "--exclude-standard"),
  ).filter((f) => f && (staged || fs.existsSync(f)));

  // Staged mode reads what is being committed: files edited after `git add`
  // come from the index, not the working tree.
  const dirty = staged
    ? new Set(lines(git("diff", "--name-only")).filter(Boolean))
    : new Set();
  const read = (f) =>
    dirty.has(f) ? git("show", `:${f}`) : fs.readFileSync(f, "utf8");

  const posts = blogPosts(files, read);
  const routes = buildRoutes(files, posts);
  const fileSet = new Set(files);
  const scanned = files.filter(
    (f) => SOURCE_FILE.test(f) && f !== GENERATED_SOURCE,
  );

  // In staged mode a dead link fails the commit when it is on an added line,
  // or when its target existed at HEAD and this commit removes it.
  let added = new Map();
  let headRoutes = null;
  let headFiles = new Set();
  if (staged) {
    added = addedLinesByFile();
    try {
      const head = lines(git("ls-tree", "-r", "--name-only", "HEAD")).filter(
        Boolean,
      );
      headFiles = new Set(head);
      headRoutes = buildRoutes(
        head,
        blogPosts(head, (f) => git("show", `HEAD:${f}`)),
      );
    } catch {
      // first commit: nothing can be removed
    }
  }
  const isAdded = (file, line) => !staged || added.get(file)?.has(line);

  const componentIds = new Set();
  for (const f of scanned)
    if (f.endsWith(".tsx"))
      for (const m of read(f).matchAll(/\bid=["']([\w-]+)["']/g))
        componentIds.add(m[1]);
  const postIdCache = new Map();
  const idsForPost = (f) => {
    if (!postIdCache.has(f)) {
      const ids = headingIds(read(f));
      // docs-factory gives the docs' headings their ids; site.json has them.
      const route = docs.files.get(f.slice(DOCS_CONTENT.length));
      if (f.startsWith(DOCS_CONTENT) && route)
        for (const id of docs.headings.get(route) ?? []) ids.add(id);
      postIdCache.set(f, ids);
    }
    return postIdCache.get(f);
  };
  // The heading ids of the docs page a path names, through one legacy
  // redirect; undefined for other paths, and for a redirect whose
  // destination has its own #heading, which replaces the link's.
  const docsHeadingsAt = (p) => {
    const destination = docs.redirects[routeKey(p)];
    if (destination?.includes("#")) return undefined;
    const page = (destination ?? p).replace(/\/?$/, "/").toLowerCase();
    return docs.headings.get(page);
  };

  for (const file of scanned) {
    for (const { url, line } of extractLinks(file, read(file))) {
      const link = classify(url, file);
      if (!link) continue;
      const at = where(file, line);
      if (link.kind === "external") {
        if (isAdded(file, line)) addExternal(link.url, at);
        continue;
      }
      internalCount++;
      const report = (reason, removed = false) =>
        dead.push({
          at,
          url,
          reason,
          blocking: isAdded(file, line) || removed,
        });

      if (link.kind === "relative") {
        if (!fileSet.has(link.target) && !fs.existsSync(link.target))
          report("file not found", headFiles.has(link.target));
        continue;
      }
      if (link.kind === "anchor") {
        const ids = MARKDOWN.test(file) ? idsForPost(file) : componentIds;
        if (!ids.has(link.hash) && !componentIds.has(link.hash))
          report(`no heading or id "${link.hash}"`);
        continue;
      }
      if (!routes.has(link.path)) {
        report(
          `no page or file at ${link.path}`,
          Boolean(headRoutes?.has(link.path)),
        );
        continue;
      }
      if (link.hash) {
        const docsIds = docsHeadingsAt(link.path);
        if (docsIds) {
          if (!docsIds.has(link.hash) && !componentIds.has(link.hash))
            report(`no heading or id "${link.hash}"`);
          continue;
        }
        const id = link.path
          .match(/^\/blogs\/([^/]+)\/?$/i)?.[1]
          ?.toLowerCase();
        const ids =
          id && posts.has(id) ? idsForPost(posts.get(id)) : componentIds;
        if (!ids.has(link.hash)) report(`no heading or id "${link.hash}"`);
      }
    }
  }
  console.log(
    `Scanned ${scanned.length} source files (${posts.size} blog posts, ${routes.size} routes).`,
  );
}

// Why the external URLs went unchecked, if they did.
let externalsSkipped = "";
// In CI, skipping them for want of a network fails the check.
let networkMissing = false;
if (externals.size && OFFLINE) {
  externalsSkipped = `Skipped ${externals.size} external URL(s) (offline).`;
  console.log(externalsSkipped);
} else if (externals.size && !(await online())) {
  externalsSkipped = `No network connection; ${externals.size} external URL(s) were not checked.`;
  networkMissing = CI;
  if (CI) console.error(`${externalsSkipped} Pass --offline to skip them.`);
  else console.log(externalsSkipped);
} else if (externals.size) {
  const cache = loadCache();
  const now = Date.now();
  const fresh = (u) =>
    cache[u]?.verdict === "ok" && now - cache[u].checkedAt < CACHE_TTL_MS;
  const toCheck = [...externals.keys()].filter((u) => !fresh(u));
  console.log(
    `Checking ${toCheck.length} external URL(s); ${externals.size - toCheck.length} passed within the last week.`,
  );
  const results = await pool(toCheck, checkExternal);
  for (const [url, result] of results) {
    const uses = [...new Set(externals.get(url).map((u) => u.at))];
    const at =
      uses.slice(0, 3).join(", ") +
      (uses.length > 3 ? `, +${uses.length - 3} more` : "");
    if (result.verdict === "ok") {
      cache[url] = { checkedAt: now, verdict: "ok" };
      continue;
    }
    delete cache[url];
    if (result.verdict === "dead")
      dead.push({ at, url, reason: result.reason, blocking: true });
    else warnings.push(`${at}  ${url}  (${result.reason})`);
  }
  if (USE_CACHE) saveCache(cache);
}

const blocking = dead.filter((d) => d.blocking);
const preexisting = dead.filter((d) => !d.blocking);
const show = (list) => {
  for (const d of list.sort((a, b) => a.at.localeCompare(b.at)))
    console.log(`  ${d.at}  ${d.url}  (${d.reason})`);
};

if (warnings.length) {
  console.log(`\nWarnings (${warnings.length}):`);
  for (const w of warnings.sort()) console.log(`  ${w}`);
}
if (blocking.length) {
  console.log(`\nDead links (${blocking.length}):`);
  show(blocking);
}
if (preexisting.length)
  console.log(
    `\n${preexisting.length} dead link(s) already exist in lines this commit doesn't touch; run \`bun run links\` to list them.`,
  );
const totals = `${blocking.length} dead, ${warnings.length} warning(s); ${internalCount} internal and ${externalsSkipped ? 0 : externals.size} external link(s) checked.`;
console.log(`\n${totals}`);
if (blocking.length && MODE === "staged")
  console.log(
    "Fix the links above, add a known false positive to scripts/check-links.ignore, or commit with SKIP_LINK_CHECK=1.",
  );
if (GITHUB_ACTIONS) reportToGitHub();
process.exit(blocking.length || networkMissing ? 1 : 0);

// ---------- GitHub Actions ----------

// Workflow commands:
// docs.github.com/actions/reference/workflows-and-actions/workflow-commands
function escapeData(text) {
  return text.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}
function escapeProperty(text) {
  return escapeData(text).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

// An error annotation for each dead link: on its file and line when that is
// a source line, as in source mode; otherwise on the run, naming where the
// link is. Then the results, in the job summary.
function reportToGitHub() {
  for (const d of blocking) {
    const source = MODE === "dist" ? null : d.at.match(/^([^,\s]+):(\d+)$/);
    const where = source
      ? `file=${escapeProperty(source[1])},line=${source[2]},`
      : "";
    const message = source
      ? `${d.url} (${d.reason})`
      : `${d.at}: ${d.url} (${d.reason})`;
    console.log(`::error ${where}title=Dead link::${escapeData(message)}`);
  }
  if (networkMissing)
    console.log(`::error title=No network::${escapeData(externalsSkipped)}`);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (!summary) return;
  const checked =
    MODE === "dist"
      ? `the build in \`${DIST}/\``
      : MODE === "staged"
        ? "staged changes"
        : "sources";
  const block = (title, rows, open) => [
    `<details${open ? " open" : ""}><summary>${title}</summary>`,
    "",
    "```text",
    ...rows,
    "```",
    "",
    "</details>",
    "",
  ];
  const out = [
    `### Links: ${checked}`,
    "",
    `${blocking.length || networkMissing ? "Failed" : "Passed"}: ${totals}`,
    "",
    ...(externalsSkipped ? [externalsSkipped, ""] : []),
    ...(blocking.length
      ? block(
          `Dead links (${blocking.length})`,
          blocking.map((d) => `${d.at}  ${d.url}  (${d.reason})`),
          true,
        )
      : []),
    ...(warnings.length
      ? block(`Warnings (${warnings.length})`, warnings, false)
      : []),
  ];
  fs.appendFileSync(summary, `${out.join("\n")}\n`);
}
