// Image sizes, matching the Astro <Image> calls they replace. Every size is
// generated at 1x and 2x (`densities={[1, 2]}`), as WebP. The 2x image falls
// back to the original size when the original is smaller, as Astro's does.

/** Post thumbnails: width and height (cropped to cover). */
export const thumbnailSizes = {
  /** BlogPost.astro hero. */
  hero: [1400, 788],
  /** BlogCard.astro `featured`. */
  featured: [1200, 720],
  /** BlogCard.astro `card` and `side`. */
  card: [640, 400],
  /** BlogCard.astro `row`. */
  row: [320, 200],
} as const;

/** Author photos: square size (Contributors.astro). */
export const photoSizes = {
  compact: 40,
  full: 48,
} as const;

export type ThumbnailSize = keyof typeof thumbnailSizes;
export type PhotoSize = keyof typeof photoSizes;

/** The fields imagetools emits for `as=metadata:src;width;height`. */
export interface ImageAsset {
  src: string;
  width: number;
  height: number;
}

/** One size at both densities. */
export interface ImageSet {
  "1x": ImageAsset;
  "2x": ImageAsset;
}

/** The imagetools query for one density of a size. */
export function imageQuery(width: number, height: number, density: 1 | 2) {
  return `?w=${width * density}&h=${height * density}&format=webp&as=metadata:src;width;height`;
}
