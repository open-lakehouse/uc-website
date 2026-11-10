// Entry ids, derived exactly as the Astro app derives them, so URLs and
// author references match on both sites. Used by content-collections.ts, the
// prerender page list in vite.config.ts, and the tests.
import { slug as githubSlug } from "github-slugger";

/** A post's id (src/lib/post-id.mjs). */
export { postId } from "../lib/post-id.mjs";

/**
 * A profile's id: frontmatter `slug`, otherwise each path segment slugified
 * with github-slugger and a trailing `/index` dropped (the default id of
 * Astro's glob loader).
 *
 * @param entry The profile's path relative to src/content/profiles, such as
 *   `robert-pack/index.md`.
 */
export function profileId(entry: string, slug?: unknown): string {
  if (slug) return String(slug);
  return entry
    .replace(/\.[^./]+$/, "")
    .split("/")
    .map((segment) => githubSlug(segment))
    .join("/")
    .replace(/\/index$/, "");
}

/** Astro's `getCollection` order: entries sorted by id. */
export function byId(a: { id: string }, b: { id: string }): number {
  return a.id.localeCompare(b.id, "en");
}
