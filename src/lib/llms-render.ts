// Renders /llms.txt and /llms-full.txt (https://llmstxt.org) from the same
// sources the pages render: the blog posts, author profiles, the header CTAs,
// and the homepage FAQ. The Astro endpoints (via ./llms) and web/ both call it,
// so it takes its sources as arguments and must not import packages.
import { formatDate, topicLabels, topicsFor, type BlogPost } from "./blog";

export interface LlmsSources {
  posts: readonly BlogPost[];
  profiles: ReadonlyArray<{ id: string; data: { name: string } }>;
  ctas: ReadonlyArray<{ label: string; href: string }>;
  faqs: ReadonlyArray<{ q: string; a: string }>;
}

const SITE_NAME = "Unity Catalog";

const SUMMARY =
  "Unity Catalog is the open source, universal catalog for data & AI. It governs tables, multimodal data (volumes), functions, and models across Delta Lake, Apache Iceberg, every major cloud, and the engines you already run. It is an LF AI & Data Foundation project, licensed under Apache 2.0.";

const DOCS = [
  {
    label: "Documentation index for LLMs",
    path: "/docs/llms.txt",
    desc: "Every tutorial, how-to guide, and reference page in the Unity Catalog docs, each also available as Markdown.",
  },
  {
    label: "Full documentation text",
    path: "/docs/llms-full.txt",
    desc: "The complete Unity Catalog documentation in one file.",
  },
  {
    label: "Create your first catalog",
    path: "/docs/tutorials/getting-started/",
    desc: "Getting started: run a local server, browse the sample data, and create a catalog, schema, and Delta table with the uc CLI.",
  },
  {
    label: "REST API reference",
    path: "/docs/api/catalog/",
    desc: "The Unity Catalog REST API for catalogs, schemas, tables, volumes, functions, and models.",
  },
];

const PAGES = [
  {
    label: "Home",
    path: "/",
    desc: "What Unity Catalog is, the engines it works with, and answers to common questions.",
  },
  {
    label: "Blog",
    path: "/blogs",
    desc: "Release announcements, guides, and integration deep dives.",
  },
  {
    label: "Events",
    path: "/events",
    desc: "Upcoming community syncs, meetups, and talks.",
  },
];

// Descriptions for the header CTAs; their URLs come from site.config.mjs so
// a rotated Slack invite or renamed calendar is picked up automatically.
const CTA_DESCRIPTIONS: Record<string, string> = {
  GitHub: "Source code, issues, and releases.",
  Slack: "The community Slack workspace for questions and discussion.",
  Luma: "Calendar of Unity Catalog community events.",
};

interface PostRecord {
  title: string;
  url: string;
  date: string;
  description?: string | undefined;
  authors: string[];
  topics: string[];
  body: string;
}

const link = (label: string, href: string, desc?: string) =>
  desc ? `- [${label}](${href}): ${desc}` : `- [${label}](${href})`;

// Pages build as directories, so canonical URLs end in a slash (matching the
// sitemap and <link rel="canonical">).
const pageUrl = (path: string, site: URL) =>
  new URL(path.endsWith("/") ? path : `${path}/`, site).href;

const CALLOUT_LABELS: Record<string, string> = {
  tldr: "TL;DR",
  tip: "Tip",
  note: "Note",
  info: "Info",
  warning: "Warning",
  caution: "Caution",
  danger: "Danger",
};

// Turns a post's raw Markdown/MDX into plain Markdown an LLM can read without
// this site's components: drops MDX imports and comments, flattens callouts and
// Journey steps to headings, and replaces local images with their alt text.
export function toPlainMarkdown(body: string): string {
  let fence: string | null = null;
  const out: string[] = [];
  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1] ?? null;
      else if (trimmed === fence || /^(`+|~+)$/.test(trimmed)) fence = null;
      out.push(line);
      continue;
    }
    if (fence) {
      out.push(line);
      continue;
    }
    if (/^(import|export)\s/.test(trimmed)) continue;
    if (/^\{\/\*.*\*\/\}$/.test(trimmed)) continue;

    const callout = trimmed.match(/^:{3,}([a-z]+)/)?.[1];
    if (callout) {
      out.push(`**${CALLOUT_LABELS[callout] ?? callout}**`);
      continue;
    }
    if (/^:{3,}$/.test(trimmed)) continue;

    const step = trimmed.match(/^<JourneyStep\s+step="([^"]+)"/);
    if (step) {
      out.push(`### ${step[1]}`);
      continue;
    }
    if (/^<\/?(Journey|JourneyStep|LikeC4View|TrestleView)\b/.test(trimmed))
      continue;

    out.push(
      line
        .replace(/!\[([^\]]*)\]\((?!https?:)[^)]*\)/g, (_, alt: string) =>
          alt ? `[Image: ${alt}]` : "",
        )
        .replace(/\\:/g, ":"),
    );
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function toRecords(site: URL, sources: LlmsSources): PostRecord[] {
  const names = new Map(sources.profiles.map((p) => [p.id, p.data.name]));
  return [...sources.posts]
    .sort(
      (a, b) =>
        new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
    )
    .map((post) => ({
      title: post.data.title,
      url: pageUrl(`/blogs/${post.id}`, site),
      date: formatDate(post.data.date),
      description: post.data.description,
      authors: post.data.authors.map(({ id }) => names.get(id) ?? id),
      topics: topicsFor(post).map((t) => topicLabels[t]),
      body: toPlainMarkdown(post.body ?? ""),
    }));
}

export function renderLlmsIndex(site: URL, sources: LlmsSources): string {
  const posts = toRecords(site, sources);
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SUMMARY}`,
    "",
    `This is the index of ${new URL("/", site).host}, the Unity Catalog project site. The full text of every blog post and the FAQ is in ${new URL("/llms-full.txt", site).href}. For reference documentation, use the docs' own index at ${new URL("/docs/llms.txt", site).href}.`,
    "",
    "## Documentation",
    ...DOCS.map((d) => link(d.label, new URL(d.path, site).href, d.desc)),
    "",
    "## Site",
    ...PAGES.map((p) => link(p.label, pageUrl(p.path, site), p.desc)),
    "",
    "## Community",
    ...sources.ctas.map((cta) =>
      link(cta.label, cta.href, CTA_DESCRIPTIONS[cta.label]),
    ),
    "",
    "## Blog posts",
    ...posts.map((p) =>
      link(
        p.title,
        p.url,
        [p.description, `(${p.date}; ${p.topics.join(", ")})`]
          .filter(Boolean)
          .join(" "),
      ),
    ),
    "",
  ];
  return lines.join("\n");
}

export function renderLlmsFull(site: URL, sources: LlmsSources): string {
  const posts = toRecords(site, sources);
  const out = [
    `# ${SITE_NAME}: full text`,
    "",
    `> ${SUMMARY}`,
    "",
    `Every blog post on ${new URL("/", site).host}, newest first, followed by the homepage FAQ. Curated index: ${new URL("/llms.txt", site).href}. Reference documentation: ${new URL("/docs/llms-full.txt", site).href}`,
    "",
  ];
  for (const p of posts) {
    out.push(
      "---",
      "",
      `# ${p.title}`,
      "",
      `URL: ${p.url}`,
      `Published: ${p.date}`,
      `Authors: ${p.authors.join(", ")}`,
      `Topics: ${p.topics.join(", ")}`,
      "",
    );
    if (p.description) out.push(p.description, "");
    out.push(p.body, "");
  }
  out.push(
    "---",
    "",
    "# Frequently asked questions",
    "",
    `URL: ${pageUrl("/", site)}`,
    "",
  );
  for (const { q, a } of sources.faqs) out.push(`## ${q}`, "", a, "");
  return out.join("\n");
}
