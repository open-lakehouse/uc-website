// Each docs route's <head>, as docs-factory's emitter built it (heads.json).
// Its own chunk: a route loader reads one entry, so pages don't bundle all of
// them.
import { pageHead } from "../../lib/seo";

export interface DocHead {
  title: string;
  description: string | null;
  canonical: string;
  /** The page's Markdown twin URL. */
  twin: string | null;
  jsonLd: unknown;
  alternates?: { type: string; href: string; title: string }[];
}

const heads = import.meta.glob<Record<string, DocHead>>(
  "/src/generated/docs/heads.json",
  { import: "default" },
);

export async function docHead(route: string): Promise<DocHead | null> {
  const load = heads["/src/generated/docs/heads.json"];
  return load ? ((await load())[route] ?? null) : null;
}

/** TanStack `head()` for a docs route: the site's meta, plus the emitter's
 * structured data and the Markdown twin. */
export function docRouteHead(title: string | undefined, head: DocHead | null) {
  const { meta } = pageHead({
    title,
    description: head?.description ?? undefined,
  });
  return {
    meta,
    links: [
      ...(head?.twin
        ? [{ rel: "alternate", type: "text/markdown", href: head.twin }]
        : []),
      ...(head?.alternates ?? []).map((a) => ({ rel: "alternate", ...a })),
    ],
    scripts: head?.jsonLd
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify(head.jsonLd),
          },
        ]
      : [],
  };
}
