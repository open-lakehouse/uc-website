import { describe, expect, test } from "bun:test";
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { createBuilder } from "@content-collections/core";
import { allPostBodies, allPosts, allProfiles } from "content-collections";

import { contentCollections } from "../plugins/content-collections";
import { listPostFiles } from "../plugins/post-files";
import { byId, postId, profileId } from "../src/content/ids";
import { authorsOf, posts, profiles } from "../src/content/posts";

const repoRoot = path.resolve(import.meta.dir, "..");

describe("postId", () => {
  test("is the folder name after its date", () => {
    expect(postId("2024-09-12-2024-unity-catalog-101/index.md")).toBe(
      "2024-unity-catalog-101",
    );
  });

  test("stops at the first character other than a word character, | or -", () => {
    expect(
      postId(
        "2025-01-15-building-an-ml-and-ai-data-catalog-with-unity-catalog and MLflow/index.md",
      ),
    ).toBe("building-an-ml-and-ai-data-catalog-with-unity-catalog");
  });

  test("is lowercase", () => {
    expect(postId("2025-05-05-unity-catalog-for-AI/index.md")).toBe(
      "unity-catalog-for-ai",
    );
    expect(postId("2024-12-11-with-unity-catalog-and-celerData/index.md")).toBe(
      "with-unity-catalog-and-celerdata",
    );
  });

  test("frontmatter slug wins, in lowercase", () => {
    expect(postId("2024-09-12-2024-unity-catalog-101/index.md", "uc-101")).toBe(
      "uc-101",
    );
    expect(postId("2025-05-05-unity-catalog-for-AI/index.md", "UC-AI")).toBe(
      "uc-ai",
    );
  });

  test("a folder without a date is an error", () => {
    expect(() => postId("unity-catalog-101/index.md")).toThrow(
      "Blog path must match format: YYYY-MM-DD-*",
    );
  });
});

describe("profileId", () => {
  test("is the folder name, slugified", () => {
    expect(profileId("robert-pack/index.md")).toBe("robert-pack");
    expect(profileId("Robert Pack/index.md")).toBe("robert-pack");
  });

  test("frontmatter slug wins", () => {
    expect(profileId("robert-pack/index.md", "rpack")).toBe("rpack");
  });
});

describe("posts", () => {
  test("every post on disk is in the collection, with the same id", () => {
    const onDisk = listPostFiles().map(({ entry, id }) => ({ entry, id }));
    const collected = allPosts.map(({ source, id }) => ({ entry: source, id }));
    expect(collected.sort(byIdOf)).toEqual(onDisk.sort(byIdOf));
    expect(allPostBodies.map(({ id }) => id).sort()).toEqual(
      onDisk.map(({ id }) => id).sort(),
    );
  });

  test("ids are unique", () => {
    expect(new Set(posts.map(({ id }) => id)).size).toBe(posts.length);
  });

  test("ids are lowercase, including those of folders with capitals", () => {
    for (const { id } of posts) expect(id).toBe(id.toLowerCase());
    expect(listPostFiles().map(({ id }) => id)).toContain(
      "unity-catalog-for-ai",
    );
  });

  test("folders that differ only in case are an error", () => {
    const dir = path.join(
      import.meta.dir,
      "../.content-collections/test-fixtures/case-collision",
    );
    rmSync(dir, { recursive: true, force: true });
    for (const folder of ["2026-01-01-data-AI", "2026-01-02-data-ai"]) {
      mkdirSync(path.join(dir, folder), { recursive: true });
      writeFileSync(path.join(dir, folder, "index.md"), "---\n---\n");
    }
    try {
      expect(() => listPostFiles(dir)).toThrow('have the same id "data-ai"');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  test("are sorted by id", () => {
    expect(posts.map(({ id }) => id)).toEqual(
      [...allPosts].sort(byId).map(({ id }) => id),
    );
    expect(posts.slice(0, 3).map(({ id }) => id)).toEqual([
      "2024-unity-catalog-101",
      "authentication-authorization-unity-catalog",
      "avoid-data-silos-with-unity-catalog",
    ]);
  });
});

describe("profiles", () => {
  test("every post author resolves to a profile, in frontmatter order", () => {
    for (const post of posts) {
      expect(authorsOf(post).map(({ id }) => id)).toEqual(
        post.data.authors.map(({ id }) => id),
      );
    }
  });

  test("entry ids match the frontmatter `id`", () => {
    for (const profile of allProfiles) {
      expect(profile.data.id).toBe(profile.id);
    }
    expect(profiles.length).toBe(allProfiles.length);
  });

  test("an unknown author fails the build", async () => {
    const fixture = path.join(
      import.meta.dir,
      "../.content-collections/test-fixtures/unknown-author",
    );
    rmSync(fixture, { recursive: true, force: true });
    mkdirSync(path.join(fixture, "blog/2026-01-01-fixture-post"), {
      recursive: true,
    });
    mkdirSync(path.join(fixture, "profiles/somebody"), { recursive: true });
    await Bun.write(
      path.join(fixture, "content-collections.ts"),
      `import { defineContent } from "../../../content-collections.ts";
export default defineContent({ blogDir: "blog", profilesDir: "profiles" });
`,
    );
    await Bun.write(
      path.join(fixture, "blog/2026-01-01-fixture-post/index.md"),
      "---\ntitle: Fixture\nauthors:\n  - nobody\ncategory: guide\ndate: January 1, 2026\n---\n\nBody.\n",
    );
    await Bun.write(
      path.join(fixture, "profiles/somebody/index.md"),
      "---\nid: somebody\nname: Somebody\nphoto: ./photo.jpg\n---\n",
    );
    copyFileSync(
      path.join(repoRoot, "src/content/profiles/robert-pack/photo.jpg"),
      path.join(fixture, "profiles/somebody/photo.jpg"),
    );
    const config = path.join(fixture, "content-collections.ts");

    // Content Collections itself only reports the error and drops the post.
    const builder = await createBuilder(config);
    const errors: string[] = [];
    builder.on("_error", ({ error }) => errors.push(error.message));
    await builder.build();
    expect(errors.join("\n")).toContain('author "nobody" has no profile');

    // The Vite plugin turns that into a failed `vite build`.
    const plugin = contentCollections(config);
    const configResolved = plugin.configResolved as (config: object) => unknown;
    const buildStart = plugin.buildStart as (this: object) => Promise<void>;
    await configResolved({ root: fixture, command: "build" });
    const context = {
      error(message: string): never {
        throw new Error(message);
      },
    };
    await expect(buildStart.call(context)).rejects.toThrow(
      'author "nobody" has no profile',
    );
    rmSync(fixture, { recursive: true, force: true });
  });
});

function byIdOf(a: { id: string }, b: { id: string }) {
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}
