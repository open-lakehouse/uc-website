import { describe, expect, test } from "bun:test";

import {
  formatDate,
  formatDateShort,
  readingTime,
  topicFor,
  topicsFor,
  type BlogPost,
} from "../src/lib/blog";

const post = (id: string, data: Partial<BlogPost["data"]> = {}): BlogPost => ({
  id,
  data: {
    title: id,
    authors: [],
    category: "guide",
    date: "September 12, 2024",
    ...data,
  },
});

describe("topicsFor", () => {
  test("frontmatter topics win, in order, without duplicates", () => {
    expect(
      topicsFor(
        post("unity-catalog-and-langchain", { topics: ["ai", "guide", "ai"] }),
      ),
    ).toEqual(["ai", "guide"]);
  });

  test("empty frontmatter topics fall back to the id matchers", () => {
    expect(topicsFor(post("2024-unity-catalog-101", { topics: [] }))).toEqual([
      "guide",
      "getting-started",
    ]);
  });

  test("id matchers apply in matcher order", () => {
    expect(topicsFor(post("unity-catalog-0-7-native-iceberg"))).toEqual([
      "releases",
      "guide",
    ]);
  });

  test("id matching ignores case", () => {
    expect(topicsFor(post("unity-catalog-and-LlamaIndex"))).toEqual([
      "ai",
      "integrations",
    ]);
  });

  test("a guide with no matching id is a Guide", () => {
    expect(topicsFor(post("community-update"))).toEqual(["guide"]);
  });

  test("topicFor is the first topic", () => {
    expect(topicFor(post("unity-catalog-and-LlamaIndex"))).toBe("ai");
  });
});

describe("readingTime", () => {
  const words = (n: number) =>
    Array.from({ length: n }, () => "word").join(" ");

  test("is at least one minute", () => {
    expect(readingTime(undefined)).toBe("1 min read");
    expect(readingTime("")).toBe("1 min read");
  });

  test("counts 220 words a minute", () => {
    expect(readingTime(words(440))).toBe("2 min read");
    expect(readingTime(words(1100))).toBe("5 min read");
  });

  test("skips code blocks, images, and link targets", () => {
    const body = [
      words(440),
      "```sql",
      words(2000),
      "```",
      "![a long description of the image](./image.png)",
      "[link text](https://unitycatalog.io/)",
    ].join("\n");
    expect(readingTime(body)).toBe("2 min read");
  });
});

// `bun test` runs in UTC unless TZ is set.
describe("formatDate", () => {
  test("formats frontmatter dates in long US English", () => {
    expect(formatDate("September 12, 2024")).toBe("September 12, 2024");
    expect(formatDate("April 07, 2025")).toBe("April 7, 2025");
    expect(formatDate("2026-10-14")).toBe("October 14, 2026");
  });

  test("returns unparseable dates unchanged", () => {
    expect(formatDate("coming soon")).toBe("coming soon");
  });

  test("formatDateShort abbreviates the month", () => {
    expect(formatDateShort("September 12, 2024")).toBe("Sep 12, 2024");
  });
});
