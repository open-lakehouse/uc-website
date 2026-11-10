import clsx from "clsx";

import styles from "./Benefits.module.css";
import { SectionHeader } from "./SectionHeader";

const benefits = [
  {
    title: "Interoperable",
    body: "Delta Lake, Apache Iceberg™, Parquet, CSV, and JSON behind one interface, with an Iceberg REST Catalog API so the broader ecosystem connects natively.",
    accent: styles.accentSky,
    icon: "M4 12h16M12 4c2.5 2.2 3.75 4.9 3.75 8S14.5 17.8 12 20M12 4C9.5 6.2 8.25 8.9 8.25 12S9.5 17.8 12 20M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16Z",
  },
  {
    title: "Open by default",
    body: "Apache 2.0 licensed, including the OpenAPI specification, server, and clients. No proprietary lock-in, and a community that shapes the roadmap.",
    accent: styles.accentYellow,
    icon: "M8 7 3 12l5 5M16 7l5 5-5 5M13.5 5l-3 14",
  },
  {
    title: "Unified governance",
    body: "Strong authentication, secure credential vending, and asset-level access control protect data and AI assets with one consistent policy model.",
    accent: styles.accentPink,
    icon: "M12 3 5 6v5.5c0 4.2 2.9 8 7 9.5 4.1-1.5 7-5.3 7-9.5V6l-7-3ZM9 12l2 2 4-4",
  },
  {
    title: "Multimodal",
    body: "Tables, unstructured volumes, functions, and ML models live side by side in one namespace, ready for analytics and generative AI workloads.",
    accent: styles.accentViolet,
    icon: "M12 3 4 7.5v9L12 21l8-4.5v-9L12 3ZM4 7.5l8 4.5 8-4.5M12 12v9",
  },
];

export function Benefits() {
  return (
    <section className="uc-section">
      <div className="uc-container">
        <SectionHeader
          index="01"
          label="Benefits"
          lede="One open catalog that sits underneath every engine, format, and cloud, so governance follows your data instead of your vendor."
        >
          Why teams choose Unity Catalog
        </SectionHeader>

        <div className={styles.benefitsGrid}>
          {benefits.map((benefit, i) => (
            <article
              key={benefit.title}
              className={clsx(styles.benefit, "reveal", benefit.accent)}
              style={{ transitionDelay: `${i * 70}ms` }}
            >
              <span className={styles.benefitIcon}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d={benefit.icon} />
                </svg>
              </span>
              <h3 className="uc-h3">{benefit.title}</h3>
              <p className="uc-body">{benefit.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
