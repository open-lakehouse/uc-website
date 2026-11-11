import { describe, expect, test } from "bun:test";

import {
  plainText,
  postRecords,
  searchRecords,
} from "../src/lib/search-records";

const post = {
  id: "hello",
  title: "Hello",
  description: "A post.",
  topics: ["guide"],
  body: [
    'import Journey from "@/components/blog/Journey.astro";',
    "",
    "Intro with a [link](https://example.com) and `code`.",
    "",
    "## First **step**",
    "",
    "Body text.",
    "",
    "```sh",
    "## not a heading",
    "```",
    "",
    "### Detail",
    "",
    "More.",
    "",
    "## First step",
    "",
    "Again.",
  ].join("\n"),
};

describe("postRecords", () => {
  test("an intro record, then one per ## section, anchored like the page", () => {
    const records = postRecords(post);
    expect(records.map((r) => [r.id, r.heading])).toEqual([
      ["/blogs/hello/", null],
      ["/blogs/hello/#first-step", "First step"],
      // github-slugger numbers a repeated heading, as the page does.
      ["/blogs/hello/#first-step-1", "First step"],
    ]);
    expect(records[0]).toMatchObject({
      kind: "blog",
      text: "Intro with a link and code.",
      summary: "A post.",
      concepts: "guide",
    });
    // A ### stays in its section; a fenced block's lines are dropped.
    expect(records[1]?.text).toBe("Body text. Detail More.");
  });
});

describe("plainText", () => {
  test("strips JSX, directives, and Markdown markup", () => {
    expect(
      plainText(
        ':::tip\n<JourneyStep step="Run">**Run** the _server_.</JourneyStep>\n:::',
      ),
    ).toBe("Run the server.");
  });
});

describe("searchRecords", () => {
  test("marks API references apart from the rest of the docs", () => {
    const docs = [
      {
        id: "/docs/api/catalog/",
        route: "/docs/api/catalog/",
        anchor: null,
        page: "Unity Catalog REST API",
        heading: null,
        section: ["API reference"],
        text: "Catalogs.",
      },
      {
        id: "/docs/how-to/duckdb/",
        route: "/docs/how-to/duckdb/",
        anchor: null,
        page: "Use DuckDB",
        heading: null,
        section: ["Connect engines and clients"],
        text: "DuckDB.",
      },
    ];
    const kinds = searchRecords({ docs, posts: [], pages: [] }).map(
      (r) => r.kind,
    );
    expect(kinds).toEqual(["api", "docs"]);
  });
});
