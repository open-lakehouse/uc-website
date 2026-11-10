import clsx from "clsx";

import { faqs } from "../../../lib/faq";

import styles from "./Faq.module.css";
import { SectionHeader } from "./SectionHeader";

export function Faq() {
  return (
    <section className="uc-section">
      <div className={clsx("uc-container", styles.faqGrid)}>
        <div className={styles.faqAside}>
          <SectionHeader
            index="07"
            label="FAQ"
            lede={
              <>
                Can't find what you're looking for? Ask the community on{" "}
                <a
                  href="https://go.unitycatalog.io/slack"
                  className={styles.faqLink}
                >
                  Slack
                </a>{" "}
                or open an{" "}
                <a
                  href="https://github.com/unitycatalog/unitycatalog/issues"
                  className={styles.faqLink}
                >
                  issue on GitHub
                </a>
                .
              </>
            }
          >
            Frequently asked questions
          </SectionHeader>
        </div>

        <div className={clsx(styles.faqList, "reveal")}>
          {faqs.map((item, i) => (
            <details key={item.q} className={styles.faqItem} open={i === 0}>
              <summary className={styles.faqQ}>
                <span>{item.q}</span>
                <span className={styles.faqIcon} aria-hidden="true" />
              </summary>
              <p className={styles.faqA}>{item.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
