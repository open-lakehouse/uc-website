const REPO = "unitycatalog/unitycatalog";
const API = `https://api.github.com/repos/${REPO}`;

/** Compact star counts: 3571 → "3.6k", 1200 → "1.2k", 999 → "999". */
export function formatStarCount(count: number): string {
  if (!Number.isFinite(count) || count < 0) return "";
  if (count < 1000) return String(Math.round(count));
  const thousands = count / 1000;
  const rounded =
    thousands >= 10 ? Math.round(thousands) : Math.round(thousands * 10) / 10;
  return `${rounded}`.replace(/\.0$/, "") + "k";
}

// Every page renders the header, so share one request per build: unauthenticated
// GitHub API calls are limited to 60 per hour per IP.
let starsRequest: Promise<number | null> | undefined;

/** Build-time / server fetch of public stargazer count. No token required. */
export function fetchGithubStars(): Promise<number | null> {
  starsRequest ??= requestGithubStars();
  return starsRequest;
}

async function requestGithubStars(): Promise<number | null> {
  try {
    const res = await fetch(API, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "unitycatalog-website",
      },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { stargazers_count?: number };
    return typeof data.stargazers_count === "number"
      ? data.stargazers_count
      : null;
  } catch {
    return null;
  }
}
