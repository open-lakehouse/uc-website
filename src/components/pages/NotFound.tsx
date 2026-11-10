import clsx from "clsx";

import { Button } from "../Button";
import styles from "./NotFound.module.css";

/** The not-found page (src/pages/404.astro). */
export function NotFound() {
  return (
    <section className={styles.notFound}>
      <div className="uc-aurora"></div>
      <div className="uc-grid-bg"></div>
      <div className={clsx("uc-container", styles.notFoundInner)}>
        <span className="uc-eyebrow">
          <span className="uc-eyebrow-index">404</span>
          <span>Asset not found</span>
        </span>
        <h1 className="uc-h1">Missing data link</h1>
        <p className="uc-lede">
          This path led to uncharted territory. Unity Catalog is all about
          finding connections, so let's get you back to somewhere governed.
        </p>
        <code className={styles.notFoundCode}>
          unity.website.
          <span className={styles.notFoundMissing}>this_page</span>
          {" → "}
          <span className={styles.notFoundErr}>TABLE_OR_VIEW_NOT_FOUND</span>
        </code>
        <div className={styles.notFoundCtas}>
          <Button href="/" color="secondary" size="lg">
            Go home
          </Button>
          <Button href="/blogs" color="outline" size="lg">
            Read the blog
          </Button>
        </div>
      </div>
    </section>
  );
}
