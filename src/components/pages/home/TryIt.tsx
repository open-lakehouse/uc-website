import "virtual:expressive-code.css";

import clsx from "clsx";
import {
  createContext,
  useContext,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { Button } from "../../Button";
import { SectionHeader } from "./SectionHeader";
import styles from "./TryIt.module.css";
import Examples from "./TryItExamples.mdx";

interface Example {
  id: string;
  label: string;
  lang: string;
  file: string;
  description: string;
  link?: { label: string; href: string };
}

// The code for each example is in TryItExamples.mdx, under the same id.
const examples: Example[] = [
  {
    id: "spark",
    label: "Apache Spark",
    lang: "python",
    file: "spark_quickstart.py",
    description:
      "Register Unity Catalog as a Spark catalog and work with governed Delta tables.",
    link: {
      label: "View tutorial",
      href: "https://docs.unitycatalog.io/tutorials/managed-delta-table",
    },
  },
  {
    id: "duckdb",
    label: "DuckDB",
    lang: "python",
    file: "duckdb_tables.py",
    description:
      "Attach a catalog in DuckDB, then query and append to its Delta tables with SQL.",
    link: {
      label: "View tutorial",
      href: "https://docs.unitycatalog.io/how-to/duckdb",
    },
  },
  {
    id: "pyiceberg",
    label: "PyIceberg",
    lang: "python",
    file: "unitycatalog_pyiceberg.py",
    description:
      "Create, append to, and scan managed Iceberg tables from Python, no JVM required.",
  },
  {
    id: "cli",
    label: "CLI",
    lang: "bash",
    file: "first_catalog.sh",
    description:
      "Browse the sample data, then create a catalog, schema, and Delta table with the uc CLI.",
    link: {
      label: "Getting started guide",
      href: "https://docs.unitycatalog.io/tutorials/getting-started",
    },
  },
];

const SelectedExample = createContext(examples[0]?.id);

function ExternalArrow() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 11 11 5M6 5h5v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** One example's tab panel, around its highlighted code (`children`). */
function ExamplePanel({ id, children }: { id: string; children?: ReactNode }) {
  const selected = useContext(SelectedExample);
  const example = examples.find((ex) => ex.id === id);
  if (!example) return null;
  return (
    <div
      className={styles.tryPanel}
      role="tabpanel"
      id={`panel-${example.id}`}
      aria-labelledby={`tab-${example.id}`}
      hidden={example.id !== selected}
    >
      <div className={styles.tryWindow}>
        <div className={styles.tryWindowBar}>
          <span className={styles.tryDots}>
            <i />
            <i />
            <i />
          </span>
          <span className={styles.tryFile}>{example.file}</span>
          <span className={styles.tryLang}>{example.lang}</span>
        </div>
        {children}
      </div>
      {example.link && (
        <div className={styles.tryLink}>
          <Button
            href={example.link.href}
            color="outline"
            size="sm"
            target="_blank"
          >
            {example.link.label}
            <ExternalArrow />
          </Button>
        </div>
      )}
    </div>
  );
}

export function TryIt() {
  const [selected, setSelected] = useState(examples[0]?.id);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (event: KeyboardEvent, i: number) => {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = (i + step + examples.length) % examples.length;
    setSelected(examples[next]?.id);
    tabs.current[next]?.focus();
  };

  return (
    <section className="uc-section">
      <div className="uc-container">
        <div className={styles.tryHead}>
          <SectionHeader
            index="02"
            label="Try it"
            lede="Unity Catalog speaks open APIs, so the tools your team already uses can discover, read, and write governed data without a rewrite."
          >
            Bring your own engine
          </SectionHeader>
          <a
            className={styles.tryDocs}
            href="https://go.unitycatalog.io/docs"
            rel="noopener"
            target="_blank"
          >
            Read the docs
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path
                d="M5 11 11 5M6 5h5v5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              ></path>
            </svg>
          </a>
        </div>

        <div className={clsx(styles.tryBody, "reveal")}>
          <div
            className={styles.tryTabs}
            role="tablist"
            aria-label="Code examples"
          >
            {examples.map((example, i) => (
              <button
                key={example.id}
                ref={(tab) => {
                  tabs.current[i] = tab;
                }}
                className={styles.tryTab}
                role="tab"
                id={`tab-${example.id}`}
                aria-controls={`panel-${example.id}`}
                aria-selected={example.id === selected}
                tabIndex={example.id === selected ? 0 : -1}
                onClick={() => setSelected(example.id)}
                onKeyDown={(event) => onKeyDown(event, i)}
              >
                <span className={styles.tryTabLabel}>{example.label}</span>
                <span className={styles.tryTabDesc}>{example.description}</span>
              </button>
            ))}
          </div>

          <div className={styles.tryStage}>
            <SelectedExample value={selected}>
              <Examples components={{ Example: ExamplePanel }} />
            </SelectedExample>
          </div>
        </div>
      </div>
    </section>
  );
}
