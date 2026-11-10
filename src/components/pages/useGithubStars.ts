import { useEffect, useState } from "react";

// Same cache as the Astro header script, so a visitor moving between the two
// sites reuses one count.
const STARS_KEY = "uc:github-stars:v1";
const STARS_TTL_MS = 60 * 60 * 1000;

/**
 * The repo's star count: the build-time count first, then a fresh one from
 * the public GitHub API, cached in localStorage for an hour.
 */
export function useGithubStars(buildTimeCount: number | null): number | null {
  const [count, setCount] = useState(buildTimeCount);

  useEffect(() => {
    let cancelled = false;
    const paint = (value: number) => {
      if (!cancelled) setCount(value);
    };

    async function refresh() {
      try {
        const cached = localStorage.getItem(STARS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached) as { count: number; at: number };
          if (
            typeof parsed.count === "number" &&
            Date.now() - parsed.at < STARS_TTL_MS
          ) {
            paint(parsed.count);
            return;
          }
        }
        const res = await fetch(
          "https://api.github.com/repos/unitycatalog/unitycatalog",
          { headers: { Accept: "application/vnd.github+json" } },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { stargazers_count?: number };
        if (typeof data.stargazers_count !== "number") return;
        localStorage.setItem(
          STARS_KEY,
          JSON.stringify({ count: data.stargazers_count, at: Date.now() }),
        );
        paint(data.stargazers_count);
      } catch {
        /* keep build-time value */
      }
    }

    void refresh();
    return () => {
      cancelled = true;
    };
  }, []);

  return count;
}
