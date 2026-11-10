import { Link } from "@tanstack/react-router";
import type { AnchorHTMLAttributes } from "react";

type Props = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href" | "target"
> & {
  href: string;
  target?: string;
};

/**
 * A link written as a plain `href`, as in site.config.mjs menus. Site paths
 * render a router <Link> (client-side navigation, trailing slash added);
 * anything with a scheme renders a plain <a>.
 *
 * Router links get `aria-current="page"` only on the exact page (never for
 * hash links), and no `active` class; style the current page yourself, as
 * Header does.
 */
export function SiteLink({ href, ...rest }: Props) {
  if (/^[a-z][a-z\d+.-]*:/i.test(href)) return <a href={href} {...rest} />;
  const url = new URL(href, "http://site.invalid");
  const search = Object.fromEntries(url.searchParams);
  const hash = url.hash.slice(1);
  return (
    <Link
      to={url.pathname}
      {...(hash ? { hash } : {})}
      {...(url.search ? { search } : {})}
      activeOptions={{ exact: true, includeHash: Boolean(hash) }}
      activeProps={{}}
      {...rest}
    />
  );
}
