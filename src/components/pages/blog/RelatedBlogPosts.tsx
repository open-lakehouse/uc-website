import type { Post } from "../../../content/posts";
import { SiteLink } from "../../SiteLink";
import { BlogCard } from "./BlogCard";
import styles from "./RelatedBlogPosts.module.css";

export function RelatedBlogPosts({ posts }: { posts: readonly Post[] }) {
  return (
    <section className={styles.related}>
      <div className="uc-container">
        <div className={styles.relatedHead}>
          <h2 className="uc-h3">Keep reading</h2>
          <SiteLink href="/blogs" className={styles.relatedAll}>
            All posts
          </SiteLink>
        </div>
        <div className={styles.relatedGrid}>
          {posts.map((post) => (
            <BlogCard key={post.id} post={post} variant="card" />
          ))}
        </div>
      </div>
    </section>
  );
}
