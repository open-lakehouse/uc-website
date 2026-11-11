import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

import { Button } from "../../Button";
import { GitHubIcon } from "../../icons/GitHubIcon";
import { SlackIcon } from "../../icons/SlackIcon";
import styles from "./Cta.module.css";

const command =
  "git clone https://github.com/unitycatalog/unitycatalog.git && cd unitycatalog && bin/start-uc-server";

export function Cta() {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <section className={styles.cta}>
      <div className={clsx("uc-aurora", styles.ctaAurora)}></div>
      <div className={clsx("uc-grid-bg", styles.ctaGrid)}></div>
      <div className={clsx("uc-container", styles.ctaInner, "reveal")}>
        <img
          src="/uc-logo-glyph-white.svg"
          alt=""
          width="56"
          height="56"
          className={styles.ctaGlyph}
          loading="lazy"
        />
        <h2 className={clsx("uc-h2", styles.ctaTitle)}>
          Govern every asset.
          <br />
          <span className="uc-gradient-text">Lock in nothing.</span>
        </h2>
        <p className={clsx("uc-lede", styles.ctaLede)}>
          Spin up a Unity Catalog server in under a minute, then join the
          community building the open standard for data and AI governance.
        </p>

        <div className={styles.ctaCommand}>
          <span className={styles.ctaPrompt}>$</span>
          <code>{command}</code>
          <button
            className={clsx(styles.ctaCopy, copied && styles.copied)}
            type="button"
            aria-label="Copy command"
            onClick={copy}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={styles.iconCopy}
            >
              <rect
                x="5"
                y="5"
                width="9"
                height="9"
                rx="1.5"
                stroke="currentColor"
                strokeWidth="1.3"
              ></rect>
              <path
                d="M11 5V3.5A1.5 1.5 0 0 0 9.5 2h-6A1.5 1.5 0 0 0 2 3.5v6A1.5 1.5 0 0 0 3.5 11H5"
                stroke="currentColor"
                strokeWidth="1.3"
              ></path>
            </svg>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
              className={styles.iconCheck}
            >
              <path
                d="m3 8.5 3 3 7-7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </button>
        </div>

        <div className={styles.ctaActions}>
          <Button
            href="/docs/tutorials/getting-started/"
            color="secondary"
            size="lg"
          >
            Read the quickstart
          </Button>
          <Button
            href="https://github.com/unitycatalog/unitycatalog"
            color="outline"
            size="lg"
          >
            <GitHubIcon size={18} />
            Star on GitHub
          </Button>
          <Button
            href="https://go.unitycatalog.io/slack"
            color="outline"
            size="lg"
          >
            <SlackIcon size={18} />
            Join Slack
          </Button>
        </div>
      </div>
    </section>
  );
}
