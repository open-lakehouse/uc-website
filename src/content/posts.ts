// Blog posts and author profiles for pages. Entries have the shape of Astro's
// collection entries (`post.id`, `post.data.title`, `profile.data.name`), so
// the shared helpers in src/lib/blog.ts take them directly. Bodies aren't
// here: a post's body is in its MDX module (post-modules.ts).
import { allPosts, allProfiles } from "content-collections";

import { byId } from "./ids";

export type Post = (typeof allPosts)[number];
export type Profile = (typeof allProfiles)[number];

/** Every post, in Astro's `getCollection("blog")` order (by id). */
export const posts: readonly Post[] = [...allPosts].sort(byId);

/** Every post, newest first: the order the home page and the blog index use. */
export const postsByDate: readonly Post[] = [...posts].sort(
  (a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime(),
);

/** Every profile, in Astro's `getCollection("profiles")` order (by id). */
export const profiles: readonly Profile[] = [...allProfiles].sort(byId);

const postsById = new Map(posts.map((post) => [post.id, post]));
const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));

export function getPost(id: string): Post | undefined {
  return postsById.get(id);
}

export function getProfile(id: string): Profile | undefined {
  return profilesById.get(id);
}

/** A post's author profiles, in frontmatter order (Astro's `getEntries`). */
export function authorsOf(post: Post): Profile[] {
  return post.data.authors.flatMap(({ id }) => getProfile(id) ?? []);
}

/** The posts src/pages/blogs/[id].astro recommends: the first three others. */
export function relatedPosts(post: Post): Post[] {
  return posts.filter((other) => other.id !== post.id).slice(0, 3);
}
