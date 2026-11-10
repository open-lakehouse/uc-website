import clsx from "clsx";

import { partnerGroups } from "./partners";

import styles from "./PartnerEcosystem.module.css";
import { SectionHeader } from "./SectionHeader";

export function PartnerEcosystem() {
  return (
    <section
      id="partner-ecosystem"
      className={clsx("uc-section", styles.ecosystem)}
    >
      <div className={clsx("uc-aurora", styles.ecosystemGlow)}></div>
      <div className="uc-container">
        <SectionHeader
          index="04"
          label="Ecosystem"
          align="center"
          lede="A universal interface gives you broad interoperability across cloud platforms, compute engines, AI frameworks, and the catalog and governance tools you already rely on."
        >
          Adopting Unity Catalog doesn't mean replacing your stack
        </SectionHeader>

        <div className={styles.ecoGrid}>
          {partnerGroups.map((group, i) => (
            <div
              key={group.title}
              className={clsx(styles.ecoGroup, "reveal")}
              style={{ transitionDelay: `${i * 80}ms` }}
            >
              <div className={styles.ecoGroupHead}>
                <h3 className="uc-h3">{group.title}</h3>
                <p className={styles.ecoGroupDesc}>{group.description}</p>
              </div>
              <ul className={styles.ecoList}>
                {group.partners.map((partner) => (
                  <li key={partner.name} className={styles.ecoItem}>
                    <img
                      src={partner.logo}
                      alt=""
                      width="32"
                      height="32"
                      loading="lazy"
                    />
                    <span>{partner.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
