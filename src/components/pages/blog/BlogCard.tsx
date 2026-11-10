import { Link } from "@tanstack/react-router";
import clsx from "clsx";
import { Fragment } from "react";

import { formatDateShort, topicLabels, topicsFor } from "../../../lib/blog";

import { postThumbnail } from "../../../content/images";
import { authorsOf, type Post } from "../../../content/posts";
import styles from "./BlogCard.module.css";

type Variant = "featured" | "side" | "row" | "card";

const variantClass: Record<Variant, string | undefined> = {
  featured: styles.isFeatured,
  side: styles.isSide,
  row: styles.isRow,
  card: styles.isCard,
};

const thumbnailSize = {
  featured: "featured",
  side: "card",
  row: "row",
  card: "card",
} as const;

export function BlogCard({
  post,
  variant = "card",
  className,
  hidden,
}: {
  post: Post;
  /** featured = large lead · side = stacked supporting · row = latest list · card = grid tile */
  variant?: Variant | undefined;
  className?: string | undefined;
  hidden?: boolean | undefined;
}) {
  const authorNames = authorsOf(post)
    .map((a) => a.data.name)
    .join(", ");
  const topics = topicsFor(post);
  const thumbnail = postThumbnail(post, thumbnailSize[variant]);

  return (
    <Link
      to="/blogs/$id/"
      params={{ id: post.id }}
      className={clsx(styles.blogCard, variantClass[variant], className)}
      data-topic={topics[0]}
      data-topics={topics.join(" ")}
      hidden={hidden}
    >
      {thumbnail && (
        <div className={styles.blogCardMedia}>
          <img
            {...thumbnail}
            alt=""
            loading={variant === "featured" ? "eager" : "lazy"}
            decoding="async"
            className={styles.blogCardImage}
          />
        </div>
      )}
      <div className={styles.blogCardBody}>
        <div className={styles.blogCardMeta}>
          {topics.map((topic, i) => (
            <Fragment key={topic}>
              {i > 0 && (
                <span className={styles.blogCardSep} aria-hidden="true">
                  ·
                </span>
              )}
              <span
                className={
                  i === 0 ? styles.blogCardTopic : styles.blogCardCategory
                }
              >
                {topicLabels[topic]}
              </span>
            </Fragment>
          ))}
        </div>
        <h2 className={styles.blogCardTitle}>{post.data.title}</h2>
        {post.data.description && variant !== "side" && (
          <p className={styles.blogCardDesc}>{post.data.description}</p>
        )}
        <div className={styles.blogCardByline}>
          {authorNames && (
            <span className={styles.blogCardAuthors}>{authorNames}</span>
          )}
          {authorNames && (
            <span className={styles.blogCardSep} aria-hidden="true">
              ·
            </span>
          )}
          <time dateTime={post.data.date}>
            {formatDateShort(post.data.date)}
          </time>
        </div>
      </div>
    </Link>
  );
}
