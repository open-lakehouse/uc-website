import { createFileRoute } from "@tanstack/react-router";
import { allPostBodies } from "content-collections";

import { posts } from "../content/posts";
import { topicsFor } from "../lib/blog";
import { discoveryFileResponse } from "../lib/discovery-files";
import {
  searchRecords,
  type DocsRecord,
  type SearchablePage,
} from "../lib/search-records";

// The emitted docs records; a checkout without docs indexes the rest.
const docsIndex = import.meta.glob<{ records: DocsRecord[] }>(
  "/src/generated/docs/search.json",
  { eager: true, import: "default" },
);

const PAGES: SearchablePage[] = [
  {
    path: "/",
    title: "Unity Catalog",
    description:
      "The open, universal catalog for data and AI: what it governs, the engines it works with, and answers to common questions.",
  },
  {
    path: "/docs/",
    title: "Documentation",
    description:
      "Tutorials, how-to guides, concepts, and reference for Unity Catalog OSS.",
  },
  {
    path: "/blogs/",
    title: "Blog",
    description: "Release announcements, guides, and integration deep dives.",
  },
  {
    path: "/events/",
    title: "Events",
    description: "Upcoming community syncs, meetups, and talks.",
  },
];

export const Route = createFileRoute("/search-index.json")({
  server: {
    handlers: {
      GET: () => {
        const bodies = new Map(allPostBodies.map(({ id, body }) => [id, body]));
        const records = searchRecords({
          pages: PAGES,
          docs: docsIndex["/src/generated/docs/search.json"]?.records ?? [],
          posts: posts.map((post) => ({
            id: post.id,
            title: post.data.title,
            description: post.data.description,
            topics: topicsFor(post),
            body: bodies.get(post.id) ?? "",
          })),
        });
        return discoveryFileResponse(
          "/search-index.json",
          `${JSON.stringify({ version: 1, records })}\n`,
        );
      },
    },
  },
});
