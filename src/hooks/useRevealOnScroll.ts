import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Fades `.reveal` elements in as they scroll into view by adding `.visible`
 * (styles in src/styles/tokens.css), like the script in Layout.astro. It
 * looks for new elements after each navigation has rendered: the location
 * changes before a lazily loaded page is in the DOM.
 */
export function useRevealOnScroll() {
  const router = useRouter();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    const observePage = () => {
      // Also drops the elements of the page navigated away from.
      observer.disconnect();
      document
        .querySelectorAll(".reveal:not(.visible)")
        .forEach((el) => observer.observe(el));
    };
    observePage();
    const unsubscribe = router.subscribe("onRendered", observePage);
    return () => {
      unsubscribe();
      observer.disconnect();
    };
  }, [router]);
}
