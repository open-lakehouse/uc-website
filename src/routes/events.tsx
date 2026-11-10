import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import { Button } from "../components/Button";
import { Section } from "../components/Section";
import { pageHead } from "../lib/seo";

const LUMA_CALENDAR_ID = "cal-ATeaF5ruk8AA9br";
// Luma matches tag names exactly (case-sensitive); a mismatch silently
// returns every event on the calendar instead of none.
const LUMA_TAG = "Unity Catalog";

// The embed has no item-count option, so the iframe height is capped to fit
// about five events.
const embedUrl = new URL(
  `https://luma.com/embed/calendar/${LUMA_CALENDAR_ID}/events`,
);
embedUrl.searchParams.set("lt", "dark");
embedUrl.searchParams.set("compact", "true");
embedUrl.searchParams.set("tag", LUMA_TAG);

const calendarUrl = "https://luma.com/openlakehouseai?tag=unity%20catalog";

// Iframes never fire `error`, and they fire `load` even for a browser error
// page, so use a load timeout plus a reachability probe of the embed URL.
const LOAD_TIMEOUT_MS = 10_000;

export const Route = createFileRoute("/events")({
  head: () =>
    pageHead({
      title: "Events",
      description:
        "Upcoming Unity Catalog community syncs, meetups, and talks.",
    }),
  component: Events,
});

/**
 * Whether to show the fallback instead of the calendar: Luma is unreachable,
 * or the embed hasn't loaded within the timeout. `onLoad` goes on the
 * iframe.
 */
function useLumaFailed() {
  const [loaded, setLoaded] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [unreachable, setUnreachable] = useState(false);
  const hydrated = useHydrated();
  // A prerendered iframe can load before hydration attaches onLoad.
  const [hydrating] = useState(!hydrated);

  useEffect(() => {
    // The window's load event waits for the iframe, so it stands in for a
    // load that happened before hydration.
    const loadedAlready = hydrating && document.readyState === "complete";
    const markLoaded = () => setLoaded(true);
    if (hydrating && !loadedAlready) {
      window.addEventListener("load", markLoaded, { once: true });
    }
    const timer = loadedAlready
      ? undefined
      : setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);

    // An opaque no-cors response only rejects on network failure (Luma down,
    // blocked by an extension or firewall, or offline).
    const probe = new AbortController();
    fetch(embedUrl.href, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: probe.signal,
    }).catch(() => {
      if (!probe.signal.aborted) setUnreachable(true);
    });

    return () => {
      clearTimeout(timer);
      window.removeEventListener("load", markLoaded);
      probe.abort();
    };
  }, [hydrating]);

  return {
    failed: unreachable || (timedOut && !loaded),
    onLoad: () => setLoaded(true),
  };
}

function Events() {
  const { failed, onLoad } = useLumaFailed();
  return (
    <Section
      padding="lg"
      variant="hero"
      isFirst
      title={<h1>Community Events</h1>}
      subtitle={
        <p>
          Join the Unity Catalog community at upcoming syncs, meetups, and
          talks.
        </p>
      }
    >
      <div className="relative z-1 mx-auto max-w-[48rem]">
        <iframe
          id="luma-calendar"
          src={embedUrl.href}
          title="Upcoming Unity Catalog events"
          className="block h-[720px] w-full rounded-2xl border border-neutral-800 bg-[#232323] shadow-[0_30px_60px_-30px_rgb(0_0_0/0.7)]"
          hidden={failed}
          onLoad={onLoad}
          allowFullScreen
        ></iframe>
        <p
          id="luma-fallback"
          role="status"
          className="rounded-xl border border-neutral-800 bg-neutral-900 px-6 py-16 text-center text-lg"
          hidden={!failed}
        >
          Luma failed to load the calendar. Please refresh the page or go
          directly to the Full Calendar link below.
        </p>
        <div className="mt-10 flex justify-center">
          <Button href={calendarUrl} color="secondary">
            View full calendar
          </Button>
        </div>
      </div>
    </Section>
  );
}
