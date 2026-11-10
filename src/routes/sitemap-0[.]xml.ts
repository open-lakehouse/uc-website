import { createFileRoute } from "@tanstack/react-router";

import { sitemap } from "../content/sitemap";
import { discoveryFileResponse } from "../lib/discovery-files";

export const Route = createFileRoute("/sitemap-0.xml")({
  server: {
    handlers: {
      GET: () => discoveryFileResponse("/sitemap-0.xml", sitemap()),
    },
  },
});
