// @ts-check
// The blog's post id rule, shared by src/content/ids.ts and
// scripts/check-links.mjs. It is the rule the Astro site applies too
// (unitycatalog-website's src/lib/blogLoader.ts), so URLs match. Keep this file
// free of package imports, since the link checker loads it directly.

/**
 * A post's id, which names its URL, `/blogs/<id>/`: the frontmatter `slug`,
 * otherwise the folder name after its `YYYY-MM-DD-` prefix, up to the first
 * character that isn't a word character, `|`, or `-`. Either way in
 * lowercase, the only letter case either host serves a page at.
 *
 * @param {string} entry The post's path relative to src/content/blog, such as
 *   `2024-09-12-2024-unity-catalog-101/index.md`.
 * @param {unknown} [slug] The frontmatter `slug`, if any.
 * @returns {string}
 */
export function postId(entry, slug) {
  if (slug) return String(slug).toLowerCase();
  const id = entry.match(/\d{4}-\d{2}-\d{2}-([\w|-]+)/)?.[1];
  if (id === undefined) {
    throw new Error(
      `Blog path must match format: YYYY-MM-DD-*. Provided: ${entry}`,
    );
  }
  return id.toLowerCase();
}
