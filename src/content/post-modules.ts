// Each post's compiled MDX module, loaded on demand (one chunk per post).
// Route loaders call loadPostModule() so the module is ready before the page
// renders; components read it with usePostModule().
import type { MDXComponents } from "mdx/types";
import { use, type ComponentType } from "react";

import type { MarkdownHeading } from "../../plugins/rehype-heading-ids";
import type { Post } from "./posts";

export type { MarkdownHeading };

export interface PostModule {
  default: ComponentType<{ components?: MDXComponents }>;
  /** Every heading, with the id it was given (Astro's `headings`). */
  headings: MarkdownHeading[];
  /** The body as written, after the frontmatter (Astro's `post.body`). */
  raw: string;
}

const loaders = import.meta.glob<PostModule>(
  "/src/content/blog/*/index.{md,mdx}",
);

// Keyed by the path under content/blog/, which is each post's `source`.
const loadersBySource = new Map(
  Object.entries(loaders).map(([key, load]) => [
    key.slice(key.lastIndexOf("/content/blog/") + "/content/blog/".length),
    load,
  ]),
);

type TrackedPromise<T> = Promise<T> & { status?: string; value?: T };

const modules = new Map<string, TrackedPromise<PostModule>>();

export function loadPostModule(post: Post): Promise<PostModule> {
  let module = modules.get(post.source);
  if (!module) {
    const load = loadersBySource.get(post.source);
    if (!load) throw new Error(`No module for post ${post.source}`);
    const promise: TrackedPromise<PostModule> = load().then((loaded) => {
      // Lets React's `use` read a loaded module without suspending.
      promise.status = "fulfilled";
      promise.value = loaded;
      return loaded;
    });
    module = promise;
    modules.set(post.source, module);
  }
  return module;
}

/**
 * Reads a post's module, suspending until it has loaded. It has usually
 * loaded already; while the page hydrates it hasn't, and React keeps the
 * prerendered HTML in place until it has.
 */
export function usePostModule(post: Post): PostModule {
  return use(loadPostModule(post));
}
