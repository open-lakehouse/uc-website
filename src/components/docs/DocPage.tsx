import {
  BookOpen,
  ChevronRight,
  GraduationCap,
  Lightbulb,
  type LucideIcon,
  Wrench,
} from "lucide-react";
import { Suspense, useEffect } from "react";
import { useLocation } from "./lib/router";
import OnThisPage from "./layout/OnThisPage";
import Pager from "./layout/Pager";
import Shell from "./layout/Shell";
import PageActions from "./PageActions";
import MdxComponents from "./mdx-components";
import { type PageMeta, usePageModule } from "./site";

const DIATAXIS: Record<string, { label: string; Icon: LucideIcon }> = {
  tutorial: { label: "Tutorial", Icon: GraduationCap },
  "how-to": { label: "Guide", Icon: Wrench },
  reference: { label: "Reference", Icon: BookOpen },
  explanation: { label: "Concept", Icon: Lightbulb },
};

// nav.yml groups pages under Diátaxis-named subsections; the type tag already
// says that, so those labels drop out of the trail.
const TYPE_SECTIONS = new Set([
  "Tutorials",
  "How-to guides",
  "Concepts",
  "Reference",
]);

export default function DocPage({ page }: { page: PageMeta }) {
  const kind = DIATAXIS[page.diataxis];
  const trail = page.section.filter((s) => s && !TYPE_SECTIONS.has(s));

  return (
    <Shell aside={<OnThisPage headings={page.headings} />}>
      <article className="prose">
        {/* Chrome, not content: crawlers that read the HTML keep it out of snippets. */}
        <div className="page-head" data-nosnippet="">
          <p className="eyebrow">
            {kind && (
              <span className="kind" data-kind={page.diataxis}>
                <kind.Icon size={13} aria-hidden="true" />
                {kind.label}
              </span>
            )}
            {trail.length > 0 && (
              <span className="trail">
                {trail.map((s, i) => (
                  <span key={s} className="crumb">
                    {i > 0 && <ChevronRight size={13} aria-hidden="true" />}
                    {s}
                  </span>
                ))}
              </span>
            )}
          </p>
          <PageActions page={page} />
        </div>
        <h1>{page.title}</h1>
        {page.summary && <p className="lead">{page.summary}</p>}
        <Suspense>
          <PageBody page={page} />
        </Suspense>
      </article>
      <Pager prev={page.prev} next={page.next} />
    </Shell>
  );
}

function PageBody({ page }: { page: PageMeta }) {
  const { default: Content } = usePageModule(page);
  const { hash } = useLocation();
  // Client-side navigation doesn't reset scroll; anchor links still should
  // land, and their target heading only exists once the body has rendered.
  useEffect(() => {
    if (hash)
      document
        .getElementById(decodeURIComponent(hash.slice(1)))
        ?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [page.route, hash]);
  return (
    <MdxComponents>
      <Content />
    </MdxComponents>
  );
}
