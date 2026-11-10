// The site's pages by canonical path: lowercase, ending in a slash. The
// sitemap lists them, and Vercel 301s their other letter cases and slash
// forms to them (plugins/vercel-output.ts). No imports, so vite.config.ts can
// load this before Content Collections runs.

/** Pages other than posts. */
export const staticPages = ["/", "/blogs/", "/events/"] as const;

/** Every page: the static pages, then each post at /blogs/<id>/. */
export function pagePaths(postIds: readonly string[]): string[] {
  return [...staticPages, ...postIds.map((id) => `/blogs/${id}/`)];
}
