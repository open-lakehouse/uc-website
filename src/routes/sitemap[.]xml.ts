import { createFileRoute } from "@tanstack/react-router";

import { sitemapIndex } from "../content/sitemap";
import { discoveryFileResponse } from "../lib/discovery-files";

// The sitemap index, at the URL crawlers and tools try first. The old
// /sitemap-index.xml redirects here (site.config.mjs).
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: () => discoveryFileResponse("/sitemap.xml", sitemapIndex()),
    },
  },
});
