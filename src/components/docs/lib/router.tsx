// The few react-router APIs the docs components were written against, on
// TanStack Router. Links go through SiteLink, so they get the site's trailing
// slash and client-side navigation like every other internal link.
import {
  useLocation as useRouterLocation,
  useNavigate as useRouterNavigate,
} from "@tanstack/react-router";
import clsx from "clsx";
import type { AnchorHTMLAttributes } from "react";

import { SiteLink } from "../../SiteLink";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  to: string;
};

export function Link({ to, target, ...rest }: LinkProps) {
  return <SiteLink href={to} {...(target ? { target } : {})} {...rest} />;
}

/** A Link marked `.active` on its own page (react-router's `end` match, the
 * only kind the docs use, so `end` is accepted and implied). */
export function NavLink({
  to,
  className,
  end,
  target,
  ...props
}: LinkProps & { end?: boolean }) {
  void end;
  const pathname = useRouterLocation({ select: (l) => l.pathname });
  const active = withSlash(pathname) === withSlash(to);
  return (
    <SiteLink
      href={to}
      className={clsx(className, active && "active")}
      {...(target ? { target } : {})}
      {...props}
    />
  );
}

/** `{ pathname, hash }`, with `hash` including its `#` as react-router's did. */
export function useLocation(): { pathname: string; hash: string } {
  const pathname = useRouterLocation({ select: (l) => l.pathname });
  const hash = useRouterLocation({ select: (l) => l.hash });
  return { pathname, hash: hash ? `#${hash}` : "" };
}

/** Navigate to an internal href (path, optional #hash). */
export function useNavigate(): (href: string) => void {
  const navigate = useRouterNavigate();
  return (href) => void navigate({ href });
}

function withSlash(path: string): string {
  return path.endsWith("/") ? path : `${path}/`;
}
