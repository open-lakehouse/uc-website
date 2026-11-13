// The machine-readable discovery files for crawlers and LLMs, which server
// routes render at prerender time. Each has the Content-Type Netlify serves
// the Astro build's copy with.
export const discoveryFiles = {
  "/llms.txt": "text/plain; charset=utf-8",
  "/llms-full.txt": "text/plain; charset=utf-8",
  "/robots.txt": "text/plain; charset=utf-8",
  "/sitemap.xml": "application/xml",
  "/sitemap-0.xml": "application/xml",
  // The ⌘K palette's index (src/lib/search-records.ts).
  "/search-index.json": "application/json; charset=utf-8",
} as const;

export type DiscoveryFile = keyof typeof discoveryFiles;

export function discoveryFileResponse(
  file: DiscoveryFile,
  body: string,
): Response {
  return new Response(body, {
    headers: { "Content-Type": discoveryFiles[file] },
  });
}
