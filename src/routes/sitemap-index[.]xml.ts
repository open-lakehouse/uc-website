import { createFileRoute } from "@tanstack/react-router";

import { sitemapIndex } from "../content/sitemap";
import { discoveryFileResponse } from "../lib/discovery-files";

export const Route = createFileRoute("/sitemap-index.xml")({
  server: {
    handlers: {
      GET: () => discoveryFileResponse("/sitemap-index.xml", sitemapIndex()),
    },
  },
});
