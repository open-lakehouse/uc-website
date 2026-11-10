import clsx from "clsx";
import type { CSSProperties } from "react";

import { allPartners } from "./partners";

import { Button } from "../../Button";
import { GitHubIcon } from "../../icons/GitHubIcon";
import { SiteLink } from "../../SiteLink";
import styles from "./Hero.module.css";

type AssetType =
  "catalog" | "schema" | "table" | "volume" | "function" | "model";

interface Row {
  name: string;
  type: AssetType;
  depth: number;
  meta: string;
  selected?: boolean;
}

const rows: Row[] = [
  { name: "unity", type: "catalog", depth: 0, meta: "catalog" },
  { name: "default", type: "schema", depth: 1, meta: "schema" },
  { name: "numbers", type: "table", depth: 2, meta: "delta" },
  {
    name: "adoptions",
    type: "table",
    depth: 2,
    meta: "iceberg",
    selected: true,
  },
  { name: "marksheet_uniform", type: "table", depth: 2, meta: "uniform" },
  { name: "json_files", type: "volume", depth: 2, meta: "volume" },
  { name: "lowercase", type: "function", depth: 2, meta: "function" },
  { name: "ml", type: "schema", depth: 1, meta: "schema" },
  { name: "churn_classifier", type: "model", depth: 2, meta: "model · v3" },
];

const typeClass: Record<AssetType, string | undefined> = {
  catalog: styles.typeCatalog,
  schema: styles.typeSchema,
  table: styles.typeTable,
  volume: styles.typeVolume,
  function: styles.typeFunction,
  model: styles.typeModel,
};

const engines = ["Spark", "DuckDB", "PyIceberg", "Daft"];

function AssetIcon({ type }: { type: AssetType }) {
  switch (type) {
    case "catalog":
      return <img src="/uc-logo-glyph.svg" alt="" width="14" height="14" />;
    case "schema":
      return (
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M8 2 2 5l6 3 6-3-6-3ZM2 8l6 3 6-3M2 11l6 3 6-3"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );
    case "table":
      return (
        <svg viewBox="0 0 16 16" fill="none">
          <rect
            x="2"
            y="3"
            width="12"
            height="10"
            rx="1.5"
            stroke="currentColor"
            strokeWidth="1.3"
          />
          <path
            d="M2 6.5h12M6.5 6.5V13"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
      );
    case "volume":
      return (
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M2 4.5A1.5 1.5 0 0 1 3.5 3h3l1.5 1.5h4.5A1.5 1.5 0 0 1 14 6v5.5a1.5 1.5 0 0 1-1.5 1.5h-9A1.5 1.5 0 0 1 2 11.5v-7Z"
            stroke="currentColor"
            strokeWidth="1.3"
          />
        </svg>
      );
    case "function":
      return (
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M10.5 2.5c-1.5 0-2 .8-2.3 2.2L6.8 11.3C6.5 12.7 6 13.5 4.5 13.5M5 6.5h5.5"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinecap="round"
          />
        </svg>
      );
    case "model":
      return (
        <svg viewBox="0 0 16 16" fill="none">
          <path
            d="M8 1.75 13.5 5v6L8 14.25 2.5 11V5L8 1.75ZM2.5 5 8 8.25 13.5 5M8 8.25v6"
            stroke="currentColor"
            strokeWidth="1.3"
            strokeLinejoin="round"
          />
        </svg>
      );
  }
}

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={clsx("uc-aurora", styles.heroAurora)}></div>
      <div className="uc-grid-bg"></div>

      <div className={clsx("uc-container", styles.heroGrid)}>
        <div className={styles.heroCopy}>
          <SiteLink
            href="/blogs/unity-catalog-0-7-native-iceberg"
            className={styles.heroPill}
          >
            <span className={styles.heroPillTag}>New</span>
            <span>Unity Catalog 0.7: native Apache Iceberg™ tables</span>
            <svg
              width="14"
              height="14"
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M6 3l5 5-5 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </SiteLink>

          <h1 className={clsx("uc-h1", styles.heroTitle)}>
            The universal catalog for{" "}
            <span className="uc-gradient-text">data &amp; AI</span>
          </h1>

          <p className={clsx("uc-lede", styles.heroLede)}>
            Open source governance for tables, multimodal data, functions, and
            models. Unity Catalog works across Delta Lake, Apache Iceberg™,
            every major cloud, and the engines you already run.
          </p>

          <div className={styles.heroCtas}>
            <Button
              href="https://docs.unitycatalog.io/quickstart/"
              color="secondary"
              size="lg"
            >
              Get started
            </Button>
            <Button
              href="https://github.com/unitycatalog/unitycatalog"
              color="outline"
              size="lg"
            >
              <GitHubIcon size={18} />
              View on GitHub
            </Button>
          </div>

          <ul className={styles.heroMeta}>
            <li>Apache 2.0</li>
            <li>LF AI &amp; Data project</li>
            <li>Delta Lake + Iceberg REST</li>
          </ul>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.explorer}>
            <div className={styles.explorerBar}>
              <span className={styles.explorerDots}>
                <i></i>
                <i></i>
                <i></i>
              </span>
              <span className={styles.explorerPath}>
                unity / default / adoptions
              </span>
              <span className={styles.explorerHost}>localhost:8080</span>
            </div>

            <ul className={styles.explorerTree}>
              {rows.map((row, i) => (
                <li
                  key={row.name}
                  className={clsx(
                    styles.explorerRow,
                    typeClass[row.type],
                    row.selected && styles.selected,
                  )}
                  style={{ "--depth": row.depth, "--i": i } as CSSProperties}
                >
                  <span className={styles.explorerIcon}>
                    <AssetIcon type={row.type} />
                  </span>
                  <span className={styles.explorerName}>{row.name}</span>
                  <span className={styles.explorerMeta}>{row.meta}</span>
                </li>
              ))}
            </ul>

            <div className={styles.explorerGrant}>
              <span className={styles.grantKw}>GRANT</span> SELECT{" "}
              <span className={styles.grantKw}>ON TABLE</span>{" "}
              <span className={styles.grantObj}>unity.default.adoptions</span>{" "}
              <span className={styles.grantKw}>TO</span> analysts
            </div>

            <div className={styles.explorerEngines}>
              <span className={styles.enginesLabel}>Governed access from</span>
              <span className={styles.enginesList}>
                {engines.map((engine) => (
                  <span key={engine} className={styles.engineChip}>
                    {engine}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.marqueeWrap}>
        <p className={clsx(styles.marqueeLabel, "uc-container")}>
          Interoperable with the engines, clouds, and AI tools you already use
        </p>
        <div className="uc-container">
          <div
            className={styles.marquee}
            aria-label="Unity Catalog ecosystem partners"
          >
            <div className={styles.marqueeTrack}>
              {[...allPartners, ...allPartners].map((partner, i) => (
                <span
                  key={i}
                  className={styles.marqueeItem}
                  aria-hidden={i >= allPartners.length ? "true" : undefined}
                >
                  <img
                    src={partner.logo}
                    alt=""
                    width="28"
                    height="28"
                    loading="lazy"
                  />
                  {partner.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
