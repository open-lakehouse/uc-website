import { createFileRoute } from "@tanstack/react-router";

import { site } from "../../site.config.mjs";
import { renderLlmsFull } from "../lib/llms-render";

import { llmsSources } from "../content/llms";
import { discoveryFileResponse } from "../lib/discovery-files";

export const Route = createFileRoute("/llms-full.txt")({
  server: {
    handlers: {
      GET: () =>
        discoveryFileResponse(
          "/llms-full.txt",
          renderLlmsFull(new URL(site), llmsSources()),
        ),
    },
  },
});
