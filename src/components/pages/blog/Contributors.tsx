import clsx from "clsx";

import { profilePhoto } from "../../../content/images";
import type { Profile } from "../../../content/posts";
import styles from "./Contributors.module.css";

export function Contributors({
  contributors,
  compact = false,
}: {
  contributors: readonly Profile[];
  compact?: boolean | undefined;
}) {
  return (
    <div className={clsx(styles.contributors, compact && styles.isCompact)}>
      {!compact && <h3 className={styles.contributorsTitle}>Contributors</h3>}
      <ul className={styles.contributorsList}>
        {contributors.map((contributor) => {
          const photo = profilePhoto(contributor, compact ? "compact" : "full");
          return (
            <li key={contributor.id} className={styles.contributor}>
              {photo && (
                <img
                  {...photo}
                  alt={`Photo of ${contributor.data.name}`}
                  loading="lazy"
                  decoding="async"
                  className={styles.contributorPhoto}
                />
              )}
              <div>
                <div className={styles.contributorName}>
                  {contributor.data.name}
                </div>
                {contributor.data.title && (
                  <div className={styles.contributorRole}>
                    {contributor.data.title}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
