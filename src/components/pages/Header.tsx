import { useLocation } from "@tanstack/react-router";
import clsx from "clsx";
import { useEffect, useState } from "react";

import { menus } from "../../../site.config.mjs";
import { formatStarCount } from "../../lib/github";

import { Button } from "../Button";
import { site as docs } from "../docs/site";
import { GitHubIcon } from "../icons/GitHubIcon";
import { LumaIcon } from "../icons/LumaIcon";
import { SlackIcon } from "../icons/SlackIcon";
import { Logo } from "../Logo";
import { SiteLink } from "../SiteLink";
import { SearchTrigger, SiteSearch } from "../search/SiteSearch";
import { ThemeMenu } from "../ThemeMenu";
import styles from "./Header.module.css";
import { NavMenu, type NavMenuItem } from "./NavMenu";
import { useGithubStars } from "./useGithubStars";

type CtaItem = (typeof menus.headerCtas)[number];
type MenuItem = (typeof menus.header)[number];

const submenus: Record<NonNullable<MenuItem["submenu"]>, NavMenuItem[]> = {
  "docs-apis": docs.apis.map((api) => ({
    href: api.route,
    label: api.title,
    hint: api.hint,
    ...(api.default && docs.apiIndex ? { alsoOn: docs.apiIndex } : {}),
  })),
};

const submenu = (item: MenuItem): NavMenuItem[] =>
  item.submenu ? submenus[item.submenu] : [];

const matches = (href: string, currentPath: string) =>
  !href.startsWith("http") &&
  !href.includes("#") &&
  href !== "/" &&
  currentPath.startsWith(href);

// The longest matching link wins, so /docs/api/… marks API, not Docs.
const activeHref = (currentPath: string) =>
  menus.header
    .map((item) => item.href)
    .filter((href) => matches(href, currentPath))
    .sort((a, b) => b.length - a.length)[0];

export function Header({
  githubStars,
  wide = false,
}: {
  githubStars: number | null;
  /** Span the viewport, as the docs' full-width layout below it does. */
  wide?: boolean;
}) {
  const pathname = useLocation({ select: (location) => location.pathname });
  const [scrolled, setScrolled] = useState(false);
  // The path the menu was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const stars = useGithubStars(githubStars);
  const active = activeHref(pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const close = () => setOpenOn(null);

  const ctaContent = (btn: CtaItem) => (
    <>
      {btn.label === "GitHub" && <GitHubIcon />}
      {(btn.label === "Slack" || btn.label === "Join Slack") && <SlackIcon />}
      {btn.label === "Luma" ? (
        <>
          <LumaIcon size={14} />
          <span className={styles.srOnly}>{btn.label}</span>
        </>
      ) : (
        btn.label
      )}
      {btn.label === "GitHub" && (
        <span
          className={styles.headerGithubStars}
          data-github-stars
          hidden={stars == null}
          aria-label={
            stars != null
              ? `${stars.toLocaleString("en-US")} stars on GitHub`
              : undefined
          }
        >
          <svg
            className={styles.headerGithubStarIcon}
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 .25a.75.75 0 0 1 .673.418l1.882 3.815 4.21.612a.75.75 0 0 1 .416 1.279l-3.046 2.97.719 4.192a.751.751 0 0 1-1.088.791L8 12.347l-3.766 1.98a.75.75 0 0 1-1.088-.79l.72-4.194L.818 6.374a.75.75 0 0 1 .416-1.28l4.21-.611L7.327.668A.75.75 0 0 1 8 .25Z" />
          </svg>
          <span data-github-stars-count>
            {stars != null ? formatStarCount(stars) : ""}
          </span>
        </span>
      )}
    </>
  );

  return (
    <header
      className={clsx(
        styles.siteHeader,
        scrolled && styles.isScrolled,
        open && styles.isOpen,
      )}
      data-header
    >
      <div
        className={clsx(
          "uc-container",
          styles.headerInner,
          wide && styles.wide,
        )}
      >
        <SiteLink
          href="/"
          className={styles.headerLogo}
          aria-label="Unity Catalog home"
        >
          <Logo width={100} height={36} />
        </SiteLink>

        <nav className={styles.headerNav} aria-label="Primary">
          {menus.header.map((item) => {
            const className = clsx(
              styles.headerLink,
              item.href === active && styles.active,
            );
            const items = submenu(item);
            return items.length > 0 ? (
              <NavMenu
                key={item.href}
                label={item.label}
                href={item.href}
                items={items}
                className={className}
              />
            ) : (
              <SiteLink key={item.href} className={className} href={item.href}>
                {item.label}
              </SiteLink>
            );
          })}
        </nav>

        <div className={styles.headerCtas}>
          {menus.headerCtas.map((btn) => (
            <Button
              key={btn.href}
              href={btn.href}
              color={btn.color}
              size="sm"
              className={styles.cta}
            >
              {ctaContent(btn)}
            </Button>
          ))}
        </div>

        <div className={styles.headerTheme}>
          <SearchTrigger className={styles.search} />
          <ThemeMenu />
        </div>

        <button
          className={styles.headerToggle}
          aria-label="Open menu"
          aria-expanded={open}
          aria-controls="mobile-menu"
          data-menu-toggle
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          <span></span>
          <span></span>
        </button>
      </div>

      <SiteSearch />

      <div
        className={styles.mobileMenu}
        id="mobile-menu"
        data-mobile-menu
        hidden={!open}
      >
        <nav
          className={clsx("uc-container", styles.mobileLinks)}
          aria-label="Mobile"
        >
          {menus.header.map((item) => (
            <div key={item.href}>
              <SiteLink
                className={styles.mobileLink}
                href={item.href}
                onClick={close}
              >
                {item.label}
              </SiteLink>
              {submenu(item).map((sub) => (
                <SiteLink
                  key={sub.href}
                  className={styles.mobileSublink}
                  href={sub.href}
                  onClick={close}
                >
                  {sub.label}
                </SiteLink>
              ))}
            </div>
          ))}
          <div className={styles.mobileCtas}>
            {menus.headerCtas.map((btn) => (
              <Button
                key={btn.href}
                href={btn.href}
                color={btn.color}
                isFullWidth
                className={styles.cta}
                onClick={close}
              >
                {ctaContent(btn)}
              </Button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
