import { createFileRoute } from "@tanstack/react-router";

import HomePage from "../../components/docs/brand/HomePage";
import { docHead, docRouteHead } from "../../components/docs/heads";
import { DOCS_HOME } from "../../components/docs/site";

export const Route = createFileRoute("/docs/")({
  loader: async () => ({ head: await docHead(DOCS_HOME) }),
  head: ({ loaderData }) =>
    docRouteHead("Documentation", loaderData?.head ?? null),
  component: HomePage,
});
