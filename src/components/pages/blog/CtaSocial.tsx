import { useEffect, useRef, useState } from "react";

import styles from "./CtaSocial.module.css";

export function CtaSocial({
  currentUrl,
  title,
}: {
  currentUrl: string;
  title: string;
}) {
  const twitterUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(title)}`;
  const linkedinUrl = `https://linkedin.com/shareArticle?url=${encodeURIComponent(currentUrl)}&title=${encodeURIComponent(title)}`;

  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1400);
  };

  return (
    <section className={styles.share}>
      <div className={styles.shareButtons}>
        <button
          className={styles.shareBtn}
          aria-label="Copy link"
          data-copy-link
          onClick={copyLink}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M6.5 9.5a3.5 3.5 0 0 0 5 0l1.5-1.5a3.5 3.5 0 0 0-5-5L7 4"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            ></path>
            <path
              d="M9.5 6.5a3.5 3.5 0 0 0-5 0L3 8a3.5 3.5 0 0 0 5 5L9 12"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            ></path>
          </svg>
          <span className={styles.shareCopied} data-copied hidden={!copied}>
            Copied
          </span>
        </button>
        <a
          className={styles.shareBtn}
          href={twitterUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on X"
        >
          <span
            className={styles.shareIcon}
            style={{ maskImage: "url(/icons/twitter.svg)" }}
            aria-hidden="true"
          />
        </a>
        <a
          className={styles.shareBtn}
          href={linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share on LinkedIn"
        >
          <span
            className={styles.shareIcon}
            style={{ maskImage: "url(/icons/linkedin.svg)" }}
            aria-hidden="true"
          />
        </a>
      </div>
    </section>
  );
}
