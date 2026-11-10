import { createFileRoute, notFound } from "@tanstack/react-router";
import { Suspense } from "react";

import { mdxComponents } from "../../components/blog";
import { BlogPost } from "../../components/pages/blog/BlogPost";
import { loadPostModule, usePostModule } from "../../content/post-modules";
import { getPost, relatedPosts, type Post } from "../../content/posts";
import { pageHead } from "../../lib/seo";

export const Route = createFileRoute("/blogs/$id")({
  loader: async ({ params }) => {
    const post = getPost(params.id);
    if (!post) throw notFound();
    // Loads the post's module before the page renders. The table of
    // contents comes back as loader data, so it's in the prerendered page
    // and ready while the body's module is still loading in the browser.
    const { headings } = await loadPostModule(post);
    return {
      toc: headings
        .filter((h) => h.depth === 2)
        .map((h) => ({ label: h.text, href: `#${h.slug}` })),
    };
  },
  head: ({ params }) => {
    const post = getPost(params.id);
    return pageHead({
      title: post?.data.title,
      description: post?.data.description,
    });
  },
  component: BlogPostPage,
});

function BlogPostPage() {
  const { id } = Route.useParams();
  const { toc } = Route.useLoaderData();
  const post = getPost(id);
  if (!post) return null;
  return (
    <BlogPost post={post} relatedPosts={relatedPosts(post)} toc={toc}>
      <Suspense>
        <PostBody post={post} />
      </Suspense>
    </BlogPost>
  );
}

function PostBody({ post }: { post: Post }) {
  const { default: Content, raw } = usePostModule(post);
  return (
    <>
      {/* Hidden searchable content for better indexing */}
      <div style={{ display: "none" }} data-pagefind-body>
        {` ${post.data.title} ${post.data.description ?? ""} ${raw} `}
      </div>
      <Content components={mdxComponents} />
    </>
  );
}
