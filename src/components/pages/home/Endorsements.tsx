import clsx from "clsx";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
  type RefObject,
} from "react";

import styles from "./Endorsements.module.css";
import { SectionHeader } from "./SectionHeader";

const endorsements = [
  {
    testimonial:
      "Microsoft is committed to the open-source community and empowering customers with choice. Databricks has been a strategic partner for years and it's great to see them open-sourcing Unity Catalog. We believe truly open standards with broad industry participation are in customers' best interests. Our collaboration with Databricks continues to elevate Microsoft Azure as the best choice for data and AI workloads.",
    name: "Jessica Hawk",
    title: "CVP Data, AI and Digital Applications, Microsoft",
    icon: "/icons/azure.svg",
  },
  {
    testimonial:
      "AWS welcomes Databricks' move to open source Unity Catalog. AWS is committed to working with the industry on open source solutions that enable choice and interoperability for customers.",
    name: "Chris Grusz",
    title: "Managing Director of Technology Partnerships, AWS",
    icon: "/icons/aws.svg",
  },
  {
    testimonial:
      "Google is committed to open, flexible solutions that empower customers to maximize the value of their data. Databricks' strategy to open up the Unity Catalog standard for data and AI aligns very well with our strategy.",
    name: "Ritika Suri",
    title: "Director, Data and AI Technology Partnerships, Google Cloud",
    icon: "/icons/google.svg",
  },
  {
    testimonial:
      "Enterprise data is essential to developing accurate generative AI applications. NVIDIA works closely with our partner ecosystem to support open-source offerings like Databricks Unity Catalog, which can help customers curate efficient and powerful development pipelines.",
    name: "Pat Lee",
    title: "VP of Strategic Enterprise Partnerships, NVIDIA",
    icon: "/icons/nvidia.svg",
  },
  {
    testimonial:
      "Salesforce Data Cloud is built from the ground up on Open Standards with Apache Parquet and Apache Iceberg. Our zero copy innovations enable customers to unlock data, derive insights and orchestrate actions across the Customer 360. Databricks' embrace of Apache Iceberg via UniForm and Unity Catalog addresses key interoperability challenges between Delta Lake and Iceberg. We are excited to have Databricks as a member of our Zero Copy Partner Network and look forward to joint innovations with the new open Unity Catalog, delivering compelling customer value in structured data, unstructured data and AI models.",
    name: "Raveendrnathan Loganathan",
    title: "Executive Vice President of Software Engineering at Salesforce",
    icon: "/icons/salesforce.svg",
  },
  {
    testimonial:
      "Databricks's decision to open source Unity Catalog is an exciting development for the data and AI community. We're excited to partner with Databricks to integrate Unity Catalog with LangChain, which allows our shared users to build advanced agents using Unity Catalog functions as tools.",
    name: "Harrison Chase",
    title: "CEO & Founder, LangChain",
    icon: "/icons/langchain.svg",
  },
  {
    testimonial:
      "Unstructured is the leading unstructured data ETL solution for LLMs - helping organizations transform their data from raw to RAG-ready. Our partnership with Unity Catalog OSS makes perfect sense, as we break down data silos and accelerate AI/ML development in enterprises. We are excited to partner with Databricks to develop this open standard for AI use cases and to standardize metadata for unstructured data – helping our customers operate at the cutting edge of AI.",
    name: "Brian Raymond",
    title: "CEO & Founder, UnstructuredIO",
    icon: "/logos/unstructured.svg",
  },
  {
    testimonial:
      "At Eventual, we have built Daft, the leading open source distributed query engine for multimodal data. We believe that unifying compute for tabular and unstructured data is not enough and that a multimodal catalog is crucial to build GenAI data lakehouses. We are excited to partner with Databricks and other AI innovators to develop the Unity Catalog open standard for modern data+AI workloads.",
    name: "Sammy Sidhu",
    title: "CEO & Founder, Eventual Computing",
    icon: "/icons/eventual.svg",
  },
  {
    testimonial:
      "At Granica, we champion data democratization and freedom from vendor lock-in. Our Safe Room technology ensures privacy, trust, and safety in generative AI workflows while supporting open standards like Unity Catalog, Delta Lake, and Apache Iceberg. Unity Catalog's vendor-neutral architecture and robust governance solutions align with our vision of providing customers with flexibility and control over their data. We are excited to contribute to this open ecosystem, driving innovation and enabling customers to seamlessly work with their data across best-of-breed platforms.",
    name: "Rahul Ponnala",
    title: "CEO & Co-Founder, Granica",
    icon: "/icons/granica.svg",
  },
  {
    testimonial:
      "Open sourcing Unity Catalog is a pivotal step towards a more collaborative and innovative data ecosystem. By making this technology accessible, Databricks is fostering an environment where the entire community can contribute to and benefit from enhanced data governance and management capabilities. This move aligns with our vision at Onehouse and Apache XTable (Incubating) to support open format interoperability that drives progress and innovation for all.",
    name: "Vinoth Chandar",
    title: "CEO & Co-Founder, Onehouse",
    icon: "/icons/onehouse.svg",
  },
  {
    testimonial:
      "Confluent's mission is to set data in motion and enable organizations to take advantage of their data everywhere. We're excited to see Databricks make a significant contribution to an open data ecosystem with Unity Catalog becoming open sourced. Tableflow on Confluent Cloud will enable easy delivery of real-time data to places like a data lake by turning data streams into Iceberg tables with a single click. By combining our industry-leading streaming capabilities with Databricks' robust data management solutions, customers will be able to put their data to work more effectively than ever.",
    name: "Shaun Clowes",
    title: "CPO, Confluent",
    icon: "/icons/confluent.svg",
  },
  {
    testimonial:
      "Together, Databricks and dbt Cloud help users break down data silos to collaborate effectively, simplify ETL to lower TCO with Delta Lake, and unify governance with Unity Catalog. We are thrilled to announce our support for Unity Catalog OSS and the open APIs. This partnership underscores our commitment to providing a unified data experience, empowering our community to achieve greater insights and drive innovation.",
    name: "Mark Porter",
    title: "CTO, dbt Labs",
    icon: "/icons/dbtlabs.svg",
  },
  {
    testimonial:
      "We are thrilled to see the opportunity for our joint customers as Databricks open-sources Unity Catalog as an open standard for data and AI. This move will provide our customers with greater choice and flexibility in their data ecosystem, ensuring seamless integration and maximizing interoperability with Fivetran's platform as they ingest critical data to Databricks.",
    name: "Anjan Kundavaram",
    title: "CPO, Fivetran",
    icon: "/icons/fivetran.svg",
  },
  {
    testimonial:
      "The exposure of native access patterns within Unity Catalog has transformed how our business is able to streamline access to data and apply governance rules at scale - with no performance impact. Databricks continued investment in a community to accelerate services to make data controls easier to build allows our customers to govern with greater ease and manage the massive volume of new data consumers being onboarded in the age of AI.",
    name: "Matthew Carroll",
    title: "CEO, Immuta",
    icon: "/icons/immuta.svg",
  },
  {
    testimonial:
      "We are excited to see the opportunity for our joint customers as Databricks open-sources Unity Catalog as an open standard for data and AI. With Unity Catalog OSS and the Informatica intelligent Data Management Cloud, customers can gain greater choice, flexibility and interoperability in their data ecosystems.",
    name: "Brett Roscoe",
    title: "GM and SVP Cloud Data Governance and Cloud Operations, Informatica",
    icon: "/icons/informatica.svg",
  },
];

/** px of enter/exit blur ramp */
const SOFT_EDGE = 56;

/** How visible each card in `track` is within `viewport`, from 0 to 1. */
function measureCards(viewport: HTMLElement, track: HTMLElement): number[] {
  const { left: rootLeft, right: rootRight } = viewport.getBoundingClientRect();
  return Array.from(track.children, (card) => {
    const rect = card.getBoundingClientRect();
    const visible =
      Math.min(rect.right, rootRight) - Math.max(rect.left, rootLeft);
    const ratio = Math.max(0, Math.min(1, visible / Math.max(rect.width, 1)));
    // Only soften cards that are spilling past the viewport — fully
    // contained cards (the 2–3 in frame) stay sharp.
    const spillLeft = Math.max(0, rootLeft - rect.left);
    const spillRight = Math.max(0, rect.right - rootRight);
    const edge = Math.min(1, Math.max(spillLeft, spillRight) / SOFT_EDGE);
    return Math.max(0, Math.min(1, ratio * (1 - edge * 0.65)));
  });
}

/**
 * Each card's visibility, for the blur and fade, kept up to date as the
 * track scrolls and the window resizes. `null` until measured, which is how
 * the page is prerendered.
 */
function useCardVisibility(
  viewport: RefObject<HTMLDivElement | null>,
  track: RefObject<HTMLDivElement | null>,
) {
  const [visibility, setVisibility] = useState<number[] | null>(null);

  useEffect(() => {
    const root = viewport.current;
    const cards = track.current;
    if (!root || !cards) return;
    const update = () => setVisibility(measureCards(root, cards));
    const frame = requestAnimationFrame(update);
    cards.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      cards.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [viewport, track]);

  return visibility;
}

export function Endorsements() {
  const viewport = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const visibility = useCardVisibility(viewport, track);

  // Drag / swipe affordance for desktop.
  const drag = useRef<{ x: number; scrollLeft: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  const scrollByCard = (dir: number) => {
    const el = track.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const computed = getComputedStyle(el);
    const gap = Number.parseFloat(computed.columnGap || computed.gap) || 16;
    const step = card ? card.offsetWidth + gap : el.clientWidth * 0.8;
    const max = el.scrollWidth - el.clientWidth;
    const atEnd = el.scrollLeft >= max - 4;
    const atStart = el.scrollLeft <= 4;
    if (dir > 0 && atEnd) el.scrollTo({ left: 0, behavior: "smooth" });
    else if (dir < 0 && atStart) el.scrollTo({ left: max, behavior: "smooth" });
    else el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    drag.current = {
      x: event.clientX,
      scrollLeft: event.currentTarget.scrollLeft,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    event.currentTarget.scrollLeft =
      drag.current.scrollLeft - (event.clientX - drag.current.x);
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
  };

  return (
    <section id="endorsements-section" className="uc-section">
      <div className="uc-container">
        <div className={styles.endorseHead}>
          <SectionHeader index="05" label="Endorsements">
            Backed by industry leaders and innovators
          </SectionHeader>
          <div className={styles.endorseNav}>
            <button
              className={styles.endorseBtn}
              type="button"
              aria-label="Previous endorsements"
              onClick={() => scrollByCard(-1)}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path
                  d="M10 3 5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </button>
            <button
              className={styles.endorseBtn}
              type="button"
              aria-label="Next endorsements"
              onClick={() => scrollByCard(1)}
            >
              <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                <path
                  d="M6 3l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                ></path>
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.endorseViewport} ref={viewport}>
          <div
            ref={track}
            className={clsx(styles.endorseTrack, dragging && styles.isDragging)}
            tabIndex={0}
            role="region"
            aria-label="Endorsement carousel"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            {endorsements.map((card, i) => {
              const vis = visibility?.[i];
              return (
                <figure
                  key={card.name}
                  className={clsx(
                    styles.endorseCard,
                    vis !== undefined && vis > 0.88 && styles.isActive,
                  )}
                  style={
                    vis === undefined
                      ? undefined
                      : ({ "--endorse-vis": vis.toFixed(3) } as CSSProperties)
                  }
                >
                  <figcaption className={styles.endorseMeta}>
                    <span className={styles.endorseLogo}>
                      <img
                        src={card.icon}
                        alt=""
                        width="96"
                        height="32"
                        loading="lazy"
                      />
                    </span>
                    <span className={styles.endorseWho}>
                      <span className={styles.endorseName}>{card.name}</span>
                      <span className={styles.endorseTitle}>{card.title}</span>
                    </span>
                  </figcaption>
                  <blockquote className={styles.endorseQuote}>
                    <p>{card.testimonial}</p>
                  </blockquote>
                </figure>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
