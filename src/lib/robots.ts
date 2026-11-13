// /robots.txt for both sites: the Astro endpoint (src/pages/robots.txt.ts)
// and web/'s server route render this, so the two files can't drift.

/** Allows every crawler and points at the sitemap and the llms files. */
export function renderRobotsTxt(site: URL): string {
  return [
    "User-agent: *",
    "Allow: /",
    "",
    `# LLM-readable index and full text: ${new URL("/llms.txt", site).href}, ${new URL("/llms-full.txt", site).href}`,
    `Sitemap: ${new URL("/sitemap.xml", site).href}`,
    "",
  ].join("\n");
}
