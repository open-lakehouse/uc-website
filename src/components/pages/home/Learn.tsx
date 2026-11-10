import { Link } from "@tanstack/react-router";
import clsx from "clsx";

import { formatDateShort } from "../../../lib/blog";

import { postsByDate } from "../../../content/posts";
import { SiteLink } from "../../SiteLink";
import styles from "./Learn.module.css";
import { SectionHeader } from "./SectionHeader";

const latestPosts = postsByDate.slice(0, 3);

const resources = [
  {
    kicker: "Documentation",
    title: "Everything you need to run Unity Catalog",
    body: "Quickstart, deployment guides, integrations, and the server and CLI reference.",
    cta: "Read the docs",
    href: "https://go.unitycatalog.io/docs",
  },
  {
    kicker: "API reference",
    title: "An open, documented REST API",
    body: "Browse the REST API reference for catalogs, schemas, tables, volumes, functions, and models.",
    cta: "Explore the API",
    href: "https://docs.unitycatalog.io/reference/api/catalog",
  },
  {
    kicker: "Community",
    title: "Build it with us",
    body: "Ask questions, share what you're building, and help shape the roadmap with contributors worldwide.",
    cta: "Join Slack",
    href: "https://go.unitycatalog.io/slack",
  },
];

function Arrow({ className }: { className?: string | undefined }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Learn() {
  return (
    <section className="uc-section">
      <div className="uc-container">
        <SectionHeader index="06" label="Learn">
          Learn, build, and connect
        </SectionHeader>

        <div className={styles.learnGrid}>
          {resources.map((resource, i) => (
            <a
              key={resource.href}
              href={resource.href}
              className={clsx(styles.learnCard, "reveal")}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className={styles.learnKicker}>{resource.kicker}</span>
              <h3 className={styles.learnTitle}>{resource.title}</h3>
              <p className="uc-body">{resource.body}</p>
              <span className={styles.learnCta}>
                {resource.cta}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M3 8h10M9 4l4 4-4 4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>
          ))}
        </div>

        <div className={clsx(styles.blogList, "reveal")}>
          <div className={styles.blogListHead}>
            <h3 className="uc-h3">Latest from the blog</h3>
            <SiteLink href="/blogs" className={styles.blogListAll}>
              All posts
            </SiteLink>
          </div>
          <ul>
            {latestPosts.map((post) => (
              <li key={post.id}>
                <Link
                  to="/blogs/$id/"
                  params={{ id: post.id }}
                  className={styles.blogRow}
                >
                  <time className={styles.blogRowDate}>
                    {formatDateShort(post.data.date)}
                  </time>
                  <span className={styles.blogRowTitle}>{post.data.title}</span>
                  <Arrow className={styles.blogRowArrow} />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
