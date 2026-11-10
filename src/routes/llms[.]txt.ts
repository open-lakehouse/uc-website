import { createFileRoute } from "@tanstack/react-router";

import { site } from "../../site.config.mjs";
import { renderLlmsIndex } from "../lib/llms-render";

import { llmsSources } from "../content/llms";
import { discoveryFileResponse } from "../lib/discovery-files";

export const Route = createFileRoute("/llms.txt")({
  server: {
    handlers: {
      GET: () =>
        discoveryFileResponse(
          "/llms.txt",
          renderLlmsIndex(new URL(site), llmsSources()),
        ),
    },
  },
});
