// Interactive diagrams in docs-factory posts, drawn by custom elements that
// the docs-factory emitter ships into public/. preinitModule() adds each
// module script once: into the prerendered <head>, or into the document on a
// client-side navigation. A module runs once however many diagrams use it.
import { preinitModule } from "react-dom";

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "likec4-view": React.HTMLAttributes<HTMLElement> & {
        "view-id": string;
        "dynamic-variant"?: string;
      };
      "trestle-view": React.HTMLAttributes<HTMLElement> & {
        src: string;
        label?: string | undefined;
        "color-mode"?: string;
      };
    }
  }
}

/**
 * A LikeC4 `dynamic view`, laid out as a sequence diagram. `alt` is the
 * view's text equivalent: a visually hidden caption, so crawlers and screen
 * readers get what the canvas shows.
 */
export function LikeC4View({ viewId, alt }: { viewId: string; alt?: string }) {
  preinitModule("/likec4/likec4-webcomponent.mjs", { as: "script" });
  return (
    <figure className="likec4-figure">
      <likec4-view
        view-id={viewId}
        dynamic-variant="sequence"
        className="likec4-view"
      ></likec4-view>
      {alt && <figcaption className="diagram-alt">{alt}</figcaption>}
    </figure>
  );
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * A Trestle environment diagram. The element fetches the snapshot `src`
 * names and draws its canvas in place of its children: the `alt` text, which
 * stays for crawlers and for visitors without JavaScript. React doesn't own
 * those children, so the element can replace them before or after hydration.
 */
export function TrestleView({ src, alt }: { src: string; alt?: string }) {
  preinitModule("/trestle/trestle-webcomponent.mjs", { as: "script" });
  return (
    <figure className="trestle-figure">
      <trestle-view
        src={src}
        label={alt}
        color-mode="dark"
        dangerouslySetInnerHTML={{
          __html: alt
            ? `<p class="trestle-fallback">${escapeHtml(alt)}</p>`
            : "",
        }}
      ></trestle-view>
    </figure>
  );
}
