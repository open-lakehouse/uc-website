// Shared by the Astro app and web/, so it must not import packages.

export type BlogCategory = "guide";

/**
 * The post fields these helpers read. Astro's `CollectionEntry<"blog">` fits
 * this shape, and so do web/'s content entries.
 */
export interface BlogPost {
  id: string;
  body?: string | undefined;
  data: {
    title: string;
    description?: string | undefined;
    authors: ReadonlyArray<{ id: string }>;
    category: BlogCategory;
    topics?: readonly BlogTopic[] | undefined;
    date: string;
  };
}

export const categoryLabel: Record<BlogCategory, string> = {
  guide: "Guide",
};

export function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateShort(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Rough reading time from Markdown/MDX body text. */
export function readingTime(body: string | undefined): string {
  const text = (body ?? "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#>*`_|-]+/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 220));
  return `${minutes} min read`;
}

/**
 * Editorial topics for the index filters and post chips.
 * A post can carry several (e.g. Releases + Guide). Prefer explicit
 * `topics` in frontmatter; otherwise soft matchers fill them in.
 */
export type BlogTopic =
  | "guide"
  | "releases"
  | "getting-started"
  | "ai"
  | "integrations"
  | "governance";

export const topicLabels: Record<BlogTopic, string> = {
  guide: "Guide",
  releases: "Releases",
  "getting-started": "Getting started",
  ai: "AI & agents",
  integrations: "Integrations",
  governance: "Governance",
};

export const blogTopics = Object.keys(topicLabels) as BlogTopic[];

const topicMatchers: Array<{
  topic: BlogTopic;
  test: (id: string) => boolean;
}> = [
  {
    topic: "releases",
    test: (id) =>
      /0-[0-9]|0\.[0-9]|release|managed-tables|delta-api|metric-views|iceberg-1-12|0-7-native/.test(
        id,
      ),
  },
  {
    topic: "guide",
    test: (id) =>
      /metric-views|field-guide|how-to|101|volumes|rest-api|managed-vs-external|working-with|native-iceberg|managed-tables|medallion|what-is-a-data-catalog|metadata-and-data-catalogs|avoid-data-silos/.test(
        id,
      ),
  },
  {
    topic: "ai",
    test: (id) =>
      /langchain|openai|llamaindex|for-ai|ai-0|mlflow|functions|ml-and-ai/.test(
        id,
      ),
  },
  {
    topic: "governance",
    test: (id) =>
      /authentication|authorization|managed-vs-external|medallion|volumes/.test(
        id,
      ),
  },
  {
    topic: "getting-started",
    test: (id) =>
      /101|what-is-a-data-catalog|metadata-and-data-catalogs|how-to-use-the-unity-catalog-rest/.test(
        id,
      ),
  },
  {
    topic: "integrations",
    test: (id) =>
      /spark|delta-lake|puppygraph|celerdata|langchain|openai|llamaindex|mlflow/.test(
        id,
      ),
  },
];

function uniqueTopics(topics: readonly BlogTopic[]): BlogTopic[] {
  const seen = new Set<BlogTopic>();
  const ordered: BlogTopic[] = [];
  for (const topic of topics) {
    if (seen.has(topic)) continue;
    seen.add(topic);
    ordered.push(topic);
  }
  return ordered;
}

/** All topics for a post (frontmatter wins; soft matchers fill gaps). */
export function topicsFor(post: BlogPost): BlogTopic[] {
  const explicit = post.data.topics;
  if (explicit && explicit.length > 0) {
    return uniqueTopics(explicit);
  }

  const id = post.id.toLowerCase();
  const matched = topicMatchers
    .filter(({ test }) => test(id))
    .map(({ topic }) => topic);

  if (matched.length > 0) return uniqueTopics(matched);

  // Legacy single category still surfaces as Guide when nothing else matches.
  if (post.data.category === "guide") return ["guide"];
  return ["integrations"];
}

/** Primary topic — first entry from {@link topicsFor}. */
export function topicFor(post: BlogPost): BlogTopic {
  return topicsFor(post)[0] ?? "guide";
}
