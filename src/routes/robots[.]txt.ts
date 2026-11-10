import { createFileRoute } from "@tanstack/react-router";

import { site } from "../../site.config.mjs";
import { renderRobotsTxt } from "../lib/robots";

import { discoveryFileResponse } from "../lib/discovery-files";

export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        discoveryFileResponse("/robots.txt", renderRobotsTxt(new URL(site))),
    },
  },
});
