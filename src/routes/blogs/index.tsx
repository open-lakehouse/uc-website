import { createFileRoute, useHydrated } from "@tanstack/react-router";

import type { BlogTopic } from "../../lib/blog";

import { BlogIndex, topics } from "../../components/pages/blog/BlogIndex";
import { pageHead } from "../../lib/seo";

function isTopic(value: unknown): value is BlogTopic {
  return topics.includes(value as BlogTopic);
}

export const Route = createFileRoute("/blogs/")({
  // `/blogs/?topic=guide` opens the index filtered to a topic. An unknown
  // topic has to be set to undefined: the root route passes the raw search
  // through, and it would win over a missing key.
  validateSearch: (
    search: Record<string, unknown>,
  ): { topic?: BlogTopic | undefined } => ({
    topic: isTopic(search.topic) ? search.topic : undefined,
  }),
  head: () =>
    pageHead({
      title: "Blog",
      description:
        "Guides, releases, and deep dives from the Unity Catalog community.",
    }),
  component: BlogIndexPage,
});

function BlogIndexPage() {
  const { topic } = Route.useSearch();
  const navigate = Route.useNavigate();
  // The page is prerendered unfiltered, so it hydrates unfiltered too, then
  // applies the URL's topic.
  const hydrated = useHydrated();
  return (
    <BlogIndex
      filter={(hydrated && topic) || "all"}
      onFilter={(filter) =>
        navigate({
          search: filter === "all" ? {} : { topic: filter },
          resetScroll: false,
        })
      }
    />
  );
}
