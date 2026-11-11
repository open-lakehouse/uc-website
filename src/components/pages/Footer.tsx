import { SiteLink } from "../SiteLink";
import { Logo } from "../Logo";
import styles from "./Footer.module.css";

const columns = [
  {
    title: "Project",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Ecosystem", href: "/#partner-ecosystem" },
      { label: "Documentation", href: "https://go.unitycatalog.io/docs" },
      {
        label: "API reference",
        href: "https://docs.unitycatalog.io/reference/api/catalog",
      },
      {
        label: "Releases",
        href: "https://github.com/unitycatalog/unitycatalog/releases",
      },
    ],
  },
  {
    title: "Community",
    links: [
      {
        label: "GitHub",
        href: "https://github.com/unitycatalog/unitycatalog",
      },
      {
        label: "Slack",
        href: "https://go.unitycatalog.io/slack",
      },
      {
        label: "LinkedIn",
        href: "https://www.linkedin.com/company/unitycatalog/",
      },
      { label: "Events", href: "/events" },
    ],
  },
  {
    title: "Learn",
    links: [
      { label: "Blog", href: "/blogs" },
      { label: "Quickstart", href: "https://docs.unitycatalog.io/quickstart/" },
      { label: "LF AI & Data", href: "https://lfaidata.foundation/" },
    ],
  },
];

/** `year` is the build year, so the prerendered HTML and hydration agree. */
export function Footer({ year }: { year: number }) {
  return (
    <footer className={styles.footer}>
      <div className="uc-container">
        <div className={styles.footerTop}>
          <div className={styles.footerBrand}>
            <SiteLink href="/" aria-label="Unity Catalog home">
              <Logo width={120} height={43} loading="lazy" />
            </SiteLink>
            <p className={styles.footerTagline}>
              The open, universal catalog for data and AI.
            </p>
            <a
              href="https://lfaidata.foundation/"
              className={styles.footerLf}
              aria-label="LF AI & Data Sandbox Project"
            >
              <img
                src="/logos/lfaidata-project-badge-sandbox-white.svg"
                alt="LF AI & Data Sandbox Project"
                width="160"
                height="40"
                loading="lazy"
              />
            </a>
          </div>

          <div className={styles.footerColumns}>
            {columns.map((col) => (
              <div key={col.title} className={styles.footerCol}>
                <h3 className={styles.footerColTitle}>{col.title}</h3>
                <ul>
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <SiteLink href={link.href} className={styles.footerLink}>
                        {link.label}
                      </SiteLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.footerBottom}>
          {/* One text node: text split across nodes is shaped in pieces,
              which moves the glyphs by a fraction of a pixel. */}
          <span>{`© ${year} Unity Catalog. All rights reserved.`}</span>
          <span className={styles.footerLicense}>Apache 2.0 licensed</span>
        </div>
      </div>

      <div className={styles.footerWordmark} aria-hidden="true">
        Unity Catalog
      </div>
    </footer>
  );
}
