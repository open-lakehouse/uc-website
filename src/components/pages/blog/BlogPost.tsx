import "../../blog/blog-rich.css";
import "virtual:expressive-code.css";

import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Fragment, type ReactNode } from "react";

import { formatDate, topicLabels, topicsFor } from "../../../lib/blog";

import { postThumbnail } from "../../../content/images";
import { authorsOf, type Post } from "../../../content/posts";
import { canonicalUrl } from "../../../lib/seo";
import { SiteLink } from "../../SiteLink";
import styles from "./BlogPost.module.css";
import { Contributors } from "./Contributors";
import { CtaSocial } from "./CtaSocial";
import { RelatedBlogPosts } from "./RelatedBlogPosts";
import { TableOfContents, type TocItem } from "./TableOfContents";

/**
 * A blog post's page chrome around its body (`children`): header, byline,
 * table of contents, topics, and related posts (BlogPost.astro).
 */
export function BlogPost({
  post,
  relatedPosts,
  toc,
  children,
}: {
  post: Post;
  relatedPosts: readonly Post[];
  /** The post's depth-2 headings. */
  toc: TocItem[];
  children: ReactNode;
}) {
  const authors = authorsOf(post);
  const topics = topicsFor(post);
  const primaryTopic = topics[0] ?? "guide";
  const hero = postThumbnail(post, "hero");

  return (
    <article className={styles.post}>
      <header className={styles.postHeader}>
        <div className={clsx("uc-container", styles.postHeaderInner)}>
          <nav className={styles.postCrumbs} aria-label="Breadcrumb">
            <SiteLink href="/blogs">Blog</SiteLink>
            <span aria-hidden="true">/</span>
            <span className={styles.postCrumbCurrent}>
              {topicLabels[primaryTopic]}
            </span>
          </nav>

          <div className={styles.postKicker}>
            {topics.map((topic, i) => (
              <Fragment key={topic}>
                {i > 0 && (
                  <span className={styles.postSep} aria-hidden="true">
                    ·
                  </span>
                )}
                <span className={i === 0 ? styles.postTopic : undefined}>
                  {topicLabels[topic]}
                </span>
              </Fragment>
            ))}
          </div>

          <h1 className={styles.postTitle}>{post.data.title}</h1>

          {post.data.description && (
            <p className={styles.postLede}>{post.data.description}</p>
          )}

          {hero && (
            <div className={styles.postHeroMedia}>
              <img
                {...hero}
                alt=""
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className={styles.postHeroImage}
              />
            </div>
          )}

          <div className={styles.postByline}>
            <Contributors contributors={authors} compact />
            <div className={styles.postBylineMeta}>
              <time dateTime={post.data.date}>
                {formatDate(post.data.date)}
              </time>
              <span className={styles.postSep} aria-hidden="true">
                ·
              </span>
              <span>{post.readingTime}</span>
            </div>
            <CtaSocial
              currentUrl={canonicalUrl(`/blogs/${post.id}`)}
              title={post.data.title}
            />
          </div>
        </div>
      </header>

      <div className={clsx("uc-container", styles.postLayout)}>
        <div className={styles.postContent}>
          {/* `blog-article` is global: blog-rich.css styles under it. */}
          <div className={clsx("blog-article", styles.blogArticle)}>
            {children}
          </div>
        </div>

        <aside className={styles.postAside}>
          {toc.length > 0 && (
            <div className={styles.postAsideBlock}>
              <TableOfContents items={toc} />
            </div>
          )}
          <div className={styles.postAsideBlock}>
            <h3 className={styles.postAsideTitle}>Topics</h3>
            <div className={styles.postTags}>
              {topics.map((topic) => (
                <SiteLink
                  key={topic}
                  href={`/blogs?topic=${topic}`}
                  className={styles.postTag}
                  data-topic={topic}
                >
                  {topicLabels[topic]}
                </SiteLink>
              ))}
            </div>
          </div>
          {relatedPosts.length > 0 && (
            <div className={styles.postAsideBlock}>
              <h3 className={styles.postAsideTitle}>Recommended</h3>
              <ul className={styles.postRecommended}>
                {relatedPosts.slice(0, 3).map((related) => (
                  <li key={related.id}>
                    <Link to="/blogs/$id/" params={{ id: related.id }}>
                      <span className={styles.postRecommendedTitle}>
                        {related.data.title}
                      </span>
                      <span className={styles.postRecommendedDate}>
                        {formatDate(related.data.date)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>

      {relatedPosts.length > 0 && (
        <RelatedBlogPosts posts={relatedPosts.slice(0, 3)} />
      )}
    </article>
  );
}
