// Inputs for the shared /llms.txt and /llms-full.txt renderer
// (src/lib/llms-render.ts): the posts, profiles, header CTAs, and FAQ.
// Includes every post body, so import this from server routes only.
import { allPostBodies } from "content-collections";

import { menus } from "../../site.config.mjs";
import { faqs } from "../lib/faq";
import type { LlmsSources } from "../lib/llms-render";

import { posts, profiles } from "./posts";

export function llmsSources(): LlmsSources {
  const bodies = new Map(allPostBodies.map(({ id, body }) => [id, body]));
  return {
    posts: posts.map((post) => ({ ...post, body: bodies.get(post.id) })),
    profiles,
    ctas: menus.headerCtas,
    faqs,
  };
}
