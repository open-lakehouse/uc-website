// Blog posts and author profiles (src/content/blog, src/content/profiles),
// with the Astro site's schema and ids.
//
// The data collections (posts, postBodies, profiles) are plain JSON, so tests
// and server routes can import them without Vite. Images are separate
// collections whose entries import WebP variants through vite-imagetools.
// Post bodies are separate too, so pages that list posts don't ship them.
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  createDefaultImport,
  defineCollection,
  defineConfig,
} from "@content-collections/core";
import { z } from "zod";

import { blogTopics, readingTime, type BlogTopic } from "./src/lib/blog";
import { postId, profileId } from "./src/content/ids";
import {
  imageQuery,
  photoSizes,
  thumbnailSizes,
  type ImageAsset,
} from "./src/content/image-sizes";

const postSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  thumbnail: z.string().optional(),
  authors: z.array(z.string()),
  category: z.enum(["guide"]),
  topics: z.array(z.enum(blogTopics as [BlogTopic, ...BlogTopic[]])).optional(),
  date: z.string(),
  slug: z.string().optional(),
  content: z.string(),
});

const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string().optional(),
  photo: z.string(),
  slug: z.string().optional(),
  content: z.string(),
});

// Collection directories are relative to the config file. Content
// Collections bundles the config and runs the bundle from
// <config dir>/.content-collections/cache/, two levels down.
const configDir = fileURLToPath(new URL("../../", import.meta.url));

interface Meta {
  filePath: string;
  directory: string;
}

/** Resolves a frontmatter image path, failing like Astro's `image()`. */
function imageFile(collectionDir: string, meta: Meta, src: string): string {
  const file = path.resolve(configDir, collectionDir, meta.directory, src);
  if (!existsSync(file)) {
    throw new Error(`${meta.filePath}: image "${src}" does not exist.`);
  }
  return file;
}

function imageSet(file: string, width: number, height: number) {
  return {
    "1x": createDefaultImport<ImageAsset>(file + imageQuery(width, height, 1)),
    "2x": createDefaultImport<ImageAsset>(file + imageQuery(width, height, 2)),
  };
}

/**
 * The collections for a blog directory and a profiles directory, relative
 * to the config file. Tests point a copy of this at fixture content.
 */
export function defineContent({
  blogDir,
  profilesDir,
}: {
  blogDir: string;
  profilesDir: string;
}) {
  const profiles = defineCollection({
    name: "profiles",
    directory: profilesDir,
    include: "*/index.md",
    schema: profileSchema,
    transform: (doc, { collection }) => {
      imageFile(collection.directory, doc._meta, doc.photo);
      return {
        id: profileId(doc._meta.filePath, doc.slug),
        data: { id: doc.id, name: doc.name, title: doc.title },
      };
    },
  });

  const posts = defineCollection({
    name: "posts",
    directory: blogDir,
    include: "*/index.{md,mdx}",
    schema: postSchema,
    transform: (doc, { collection, documents }) => {
      const id = postId(doc._meta.filePath, doc.slug);
      // Authors reference profiles by id, like Astro's
      // `reference("profiles")`. documents() returns the profiles'
      // transformed entries.
      const known = new Set(
        (documents(profiles) as unknown as Array<{ id: string }>).map(
          (profile) => profile.id,
        ),
      );
      for (const author of doc.authors) {
        if (!known.has(author)) {
          throw new Error(
            `${doc._meta.filePath}: author "${author}" has no profile in ${profilesDir}.`,
          );
        }
      }
      if (doc.thumbnail) {
        imageFile(collection.directory, doc._meta, doc.thumbnail);
      }
      return {
        id,
        data: {
          title: doc.title,
          description: doc.description,
          authors: doc.authors.map((author) => ({
            collection: "profiles" as const,
            id: author,
          })),
          category: doc.category,
          topics: doc.topics,
          date: doc.date,
        },
        readingTime: readingTime(doc.content),
        /** Path relative to src/content/blog; keys the post's MDX module. */
        source: doc._meta.filePath,
      };
    },
  });

  /** Raw post bodies, for llms-full.txt. */
  const postBodies = defineCollection({
    name: "postBodies",
    directory: blogDir,
    include: "*/index.{md,mdx}",
    schema: postSchema,
    transform: (doc) => ({
      id: postId(doc._meta.filePath, doc.slug),
      body: doc.content,
    }),
  });

  const postThumbnails = defineCollection({
    name: "postThumbnails",
    directory: blogDir,
    include: "*/index.{md,mdx}",
    schema: postSchema,
    transform: (doc, { collection, skip }) => {
      if (!doc.thumbnail) return skip("no thumbnail");
      const file = imageFile(collection.directory, doc._meta, doc.thumbnail);
      const sizes = Object.fromEntries(
        Object.entries(thumbnailSizes).map(([size, [width, height]]) => [
          size,
          imageSet(file, width, height),
        ]),
      ) as Record<keyof typeof thumbnailSizes, ReturnType<typeof imageSet>>;
      return { id: postId(doc._meta.filePath, doc.slug), ...sizes };
    },
  });

  const profilePhotos = defineCollection({
    name: "profilePhotos",
    directory: profilesDir,
    include: "*/index.md",
    schema: profileSchema,
    transform: (doc, { collection }) => {
      const file = imageFile(collection.directory, doc._meta, doc.photo);
      const sizes = Object.fromEntries(
        Object.entries(photoSizes).map(([size, side]) => [
          size,
          imageSet(file, side, side),
        ]),
      ) as Record<keyof typeof photoSizes, ReturnType<typeof imageSet>>;
      return { id: profileId(doc._meta.filePath, doc.slug), ...sizes };
    },
  });

  return defineConfig({
    content: [profiles, posts, postBodies, postThumbnails, profilePhotos],
  });
}

export default defineContent({
  blogDir: "./src/content/blog",
  profilesDir: "./src/content/profiles",
});
