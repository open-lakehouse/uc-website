import clsx from "clsx";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";

import {
  blogTopics,
  topicLabels,
  topicsFor,
  type BlogTopic,
} from "../../../lib/blog";

import { postsByDate } from "../../../content/posts";
import { Button } from "../../Button";
import { SlackIcon } from "../../icons/SlackIcon";
import { Search } from "../../Search";
import { BlogCard } from "./BlogCard";
import styles from "./BlogIndex.module.css";

const POSTS_PER_PAGE = 8;

const [lead, ...rest] = postsByDate;
const side = rest.slice(0, 5);
const latest = rest.slice(5);

const topicCounts = postsByDate.reduce(
  (acc, post) => {
    for (const t of topicsFor(post)) {
      acc[t] = (acc[t] ?? 0) + 1;
    }
    return acc;
  },
  {} as Partial<Record<BlogTopic, number>>,
);

/** The topics that have posts, in `blogTopics` order. */
export const topics = blogTopics.filter((t) => (topicCounts[t] ?? 0) > 0);

export type TopicFilter = BlogTopic | "all";

/**
 * src/pages/blogs/index.astro. With no topic, the list holds the posts below
 * the featured ones; with a topic, every post in it. Every post stays in the
 * list, hidden unless it is on the current page.
 */
export function BlogIndex({
  filter,
  onFilter,
}: {
  filter: TopicFilter;
  onFilter: (filter: TopicFilter) => void;
}) {
  // The page resets to 1 whenever the filter changes.
  const [paging, setPaging] = useState({ filter, page: 1 });
  const section = useRef<HTMLElement>(null);

  const visible =
    filter === "all"
      ? latest
      : postsByDate.filter((post) => topicsFor(post).includes(filter));
  const totalPages = Math.max(1, Math.ceil(visible.length / POSTS_PER_PAGE));
  const page = Math.min(paging.filter === filter ? paging.page : 1, totalPages);
  const onPage = new Set(
    visible
      .slice((page - 1) * POSTS_PER_PAGE, page * POSTS_PER_PAGE)
      .map((post) => post.id),
  );

  const goToPage = (next: number) => {
    flushSync(() => setPaging({ filter, page: next }));
    section.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section className={styles.blogIndex}>
      <div className={clsx("uc-aurora", styles.blogIndexAurora)}></div>
      <div className="uc-container">
        <header className={styles.blogIndexHero}>
          <div className={styles.blogIndexHeroCopy}>
            <span className="uc-eyebrow">
              <span className="uc-eyebrow-index">Blog</span>
              <span>Unity Catalog</span>
            </span>
            <h1 className="uc-h1">Stories from the open catalog</h1>
            <p className="uc-lede">
              Guides, releases, and engineering deep dives on governing data and
              AI with Unity Catalog.
            </p>
          </div>
          <div className={styles.blogIndexSearch}>
            <Search />
          </div>
        </header>

        <nav className={styles.blogTopics} aria-label="Topics">
          <Button
            color={filter === "all" ? "secondary" : "outline"}
            size="sm"
            type="button"
            data-topic-filter="all"
            onClick={() => onFilter("all")}
          >
            All
            <span className={styles.blogTopicCount}>{postsByDate.length}</span>
          </Button>
          {topics.map((t) => (
            <Button
              key={t}
              color={filter === t ? "secondary" : "outline"}
              size="sm"
              type="button"
              data-topic-filter={t}
              onClick={() => onFilter(t)}
            >
              {topicLabels[t]}
              <span className={styles.blogTopicCount}>{topicCounts[t]}</span>
            </Button>
          ))}
        </nav>

        {lead && (
          <section
            className={styles.blogFeatured}
            aria-label="Featured posts"
            hidden={filter !== "all"}
          >
            <BlogCard post={lead} variant="featured" />
            <div className={styles.blogFeaturedSide}>
              {side.map((post) => (
                <BlogCard
                  key={post.id}
                  post={post}
                  variant="side"
                  className={styles.blogFeaturedSideCard}
                />
              ))}
            </div>
          </section>
        )}

        <aside className={styles.blogSubscribe} hidden={filter !== "all"}>
          <div className={styles.blogSubscribeCopy}>
            <h2 className={styles.blogSubscribeTitle}>Stay in the loop</h2>
            <p>
              Join the Slack community for release notes, design discussions,
              and help from the people building Unity Catalog.
            </p>
          </div>
          <div className={styles.blogSubscribeActions}>
            <Button href="https://go.unitycatalog.io/slack" color="outline">
              <SlackIcon />
              Join Slack
            </Button>
            <Button
              href="https://github.com/unitycatalog/unitycatalog/releases"
              color="secondary"
            >
              View releases
            </Button>
          </div>
        </aside>

        <section
          ref={section}
          className={styles.blogLatest}
          id="blog-section"
          aria-label="Latest posts"
        >
          <div className={styles.blogLatestHead}>
            <h2 className="uc-h3">Latest</h2>
            <p className={styles.blogLatestCount}>
              <span>{visible.length}</span> posts
            </p>
          </div>
          <div id="blog-grid">
            {postsByDate.map((post) => (
              <BlogCard
                key={post.id}
                post={post}
                variant="row"
                hidden={!onPage.has(post.id)}
              />
            ))}
          </div>
          {/* Unstyled on purpose, to match the live Astro site, where the
              pagination styles never apply: they are scoped, and its buttons
              are made by a script. */}
          <div className={styles.pagination}>
            {visible.length > POSTS_PER_PAGE && (
              <>
                {page > 1 && (
                  <button type="button" onClick={() => goToPage(page - 1)}>
                    ←
                  </button>
                )}
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={n === page}
                      onClick={() => goToPage(n)}
                    >
                      {n}
                    </button>
                  ),
                )}
                {page < totalPages && (
                  <button type="button" onClick={() => goToPage(page + 1)}>
                    →
                  </button>
                )}
              </>
            )}
          </div>
          <p className={styles.blogEmpty} hidden={visible.length > 0}>
            No posts in this topic yet.
          </p>
        </section>
      </div>
    </section>
  );
}
