// The records behind the site-wide ⌘K palette (/search-index.json): the docs'
// sections as docs-factory emitted them, one record per section of each blog
// post, and the site's own pages. Pure, so tests can feed it fixtures; the
// server route passes the real sources.
import Slugger from "github-slugger";

import type {
  SearchKind,
  SearchRecord,
} from "../components/search/search-index";

/** A docs record as docs-factory writes it (src/generated/docs/search.json). */
export type DocsRecord = Omit<SearchRecord, "kind">;

export interface SearchablePost {
  id: string;
  title: string;
  description?: string | undefined;
  topics: readonly string[];
  /** The body as written (Markdown or MDX), after the frontmatter. */
  body: string;
}

export interface SearchablePage {
  path: string;
  title: string;
  description: string;
}

const API_SECTION = "API reference";

export function searchRecords({
  docs,
  posts,
  pages,
}: {
  docs: readonly DocsRecord[];
  posts: readonly SearchablePost[];
  pages: readonly SearchablePage[];
}): SearchRecord[] {
  return [
    ...pages.map((page) => pageRecord(page)),
    ...docs.map((record) => ({ ...record, kind: docsKind(record) })),
    ...posts.flatMap(postRecords),
  ];
}

function docsKind(record: DocsRecord): SearchKind {
  return record.section[0] === API_SECTION ? "api" : "docs";
}

function pageRecord({
  path,
  title,
  description,
}: SearchablePage): SearchRecord {
  return {
    id: path,
    kind: "page",
    route: path,
    anchor: null,
    page: title,
    heading: null,
    section: ["Unity Catalog"],
    text: description,
  };
}

/**
 * The text above the first `##`, then one record per `##` section, anchored
 * on the id the post page gives that heading (rehype-heading-ids slugs every
 * heading's text with github-slugger, in order).
 */
export function postRecords(post: SearchablePost): SearchRecord[] {
  const route = `/blogs/${post.id}/`;
  const slugger = new Slugger();
  const records: SearchRecord[] = [];
  let heading: string | null = null;
  let anchor: string | null = null;
  let lines: string[] = [];
  const flush = () => {
    const text = plainText(lines.join("\n"));
    if (heading === null || text) {
      records.push({
        id: anchor ? `${route}#${anchor}` : route,
        kind: "blog",
        route,
        anchor,
        page: post.title,
        heading,
        section: ["Blog"],
        text,
        ...(heading === null
          ? {
              summary: post.description ?? null,
              concepts: post.topics.join(" "),
            }
          : {}),
      });
    }
  };
  let fence: string | null = null;
  for (const line of post.body.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line)?.[1];
    if (marker && (fence === null || marker.startsWith(fence))) {
      fence = fence === null ? marker : null;
      continue;
    }
    if (fence !== null) continue;
    const h = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(line);
    if (h) {
      const text = inlineText(h[2] ?? "");
      const slug = slugger.slug(text);
      if (h[1] === "##") {
        flush();
        heading = text;
        anchor = slug;
        lines = [];
        continue;
      }
    }
    lines.push(line);
  }
  flush();
  return records;
}

/** Prose a reader would search: code blocks dropped, Markdown and JSX
 * markup stripped, whitespace collapsed. */
export function plainText(markdown: string): string {
  return inlineText(
    markdown
      .replace(/^(import|export)\s.*$/gm, "")
      .replace(/^:::.*$/gm, "")
      .replace(/<\/?[A-Za-z][^>]*>/g, " ")
      .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+[.)])\s+/gm, ""),
  );
}

function inlineText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)(?=\S)(.+?)(?<=\S)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}
