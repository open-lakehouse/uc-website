import clsx from "clsx";

import styles from "./FeatureDetails.module.css";
import { SectionHeader } from "./SectionHeader";

const features = [
  {
    title: "One three-level namespace",
    body: "Every asset is addressed as catalog.schema.asset, so discovery, lineage, and permissions work the same way across your entire estate.",
    tag: "catalog.schema.asset",
  },
  {
    title: "Tables in any open format",
    body: "Govern Delta Lake and native Apache Iceberg™ tables, plus Parquet, CSV, and JSON. Delta UniForm exposes Delta tables to Iceberg readers.",
    tag: "delta · iceberg · parquet",
  },
  {
    title: "Volumes for unstructured data",
    body: "Images, documents, audio, and model artifacts get the same access controls and auditability as your tables.",
    tag: "volumes",
  },
  {
    title: "Functions as AI tools",
    body: "Register SQL and Python functions once, then call them from LangChain, LlamaIndex, and OpenAI agents as governed tools.",
    tag: "functions",
  },
  {
    title: "Models with MLflow",
    body: "Use Unity Catalog as an MLflow model registry to register and version models alongside the data they were trained on.",
    tag: "models",
  },
  {
    title: "Secure by design",
    body: "OAuth-based authentication, temporary credential vending for S3, ADLS, and GCS, and fine-grained grants on every securable.",
    tag: "authn · authz · vending",
  },
];

export function FeatureDetails() {
  return (
    <section id="features" className="uc-section">
      <div className="uc-container">
        <SectionHeader
          index="03"
          label="Features"
          lede="Unity Catalog governs far more than tables. Bring structured data, unstructured files, AI tools, and models under a single, open model of access."
        >
          Everything your data and AI stack needs, in one catalog
        </SectionHeader>

        <ol className={styles.featuresGrid}>
          {features.map((feature, i) => (
            <li
              key={feature.title}
              className={clsx(styles.feature, "reveal")}
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <span className={styles.featureIndex}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className="uc-body">{feature.body}</p>
              <code className={styles.featureTag}>{feature.tag}</code>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
