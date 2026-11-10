// Sitemap XML, byte for byte as @astrojs/sitemap writes it with its default
// options: one line, no trailing newline, and every namespace declared.

const xmlDeclaration = '<?xml version="1.0" encoding="UTF-8"?>';
const urlsetOpen =
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">';

/** A sitemap index listing the given sitemap URLs. */
export function renderSitemapIndex(sitemapUrls: readonly string[]): string {
  const entries = sitemapUrls.map(
    (url) => `<sitemap><loc>${escapeXml(url)}</loc></sitemap>`,
  );
  return `${xmlDeclaration}<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.join("")}</sitemapindex>`;
}

/** A sitemap of page URLs, deduplicated and in @astrojs/sitemap's order. */
export function renderSitemap(pageUrls: readonly string[]): string {
  const sorted = [...new Set(pageUrls)].sort((a, b) =>
    a.localeCompare(b, "en", { numeric: true }),
  );
  const entries = sorted.map(
    (url) => `<url><loc>${escapeXml(url)}</loc></url>`,
  );
  return `${xmlDeclaration}${urlsetOpen}${entries.join("")}</urlset>`;
}

// The escaping the `sitemap` package applies to element text.
function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
