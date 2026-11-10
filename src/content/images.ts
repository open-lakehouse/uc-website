// WebP post thumbnails and author photos, at the sizes in image-sizes.ts,
// as props for an <img>: `<img {...postThumbnail(post, "card")} alt="" />`.
// Like Astro's <Image>, `width` and `height` are the requested 1x size and
// `srcSet` lists the 1x and 2x files.
import { allPostThumbnails, allProfilePhotos } from "content-collections";

import {
  photoSizes,
  thumbnailSizes,
  type ImageSet,
  type PhotoSize,
  type ThumbnailSize,
} from "./image-sizes";

export interface ImageProps {
  src: string;
  srcSet: string;
  width: number;
  height: number;
}

const thumbnails = new Map(allPostThumbnails.map((t) => [t.id, t]));
const photos = new Map(allProfilePhotos.map((p) => [p.id, p]));

function imageProps(
  image: ImageSet,
  width: number,
  height: number,
): ImageProps {
  return {
    src: image["1x"].src,
    srcSet: `${image["1x"].src} 1x, ${image["2x"].src} 2x`,
    width,
    height,
  };
}

export function postThumbnail(
  post: { id: string },
  size: ThumbnailSize,
): ImageProps | undefined {
  const image = thumbnails.get(post.id)?.[size];
  const [width, height] = thumbnailSizes[size];
  return image && imageProps(image, width, height);
}

export function profilePhoto(
  profile: { id: string },
  size: PhotoSize,
): ImageProps | undefined {
  const image = photos.get(profile.id)?.[size];
  const side = photoSizes[size];
  return image && imageProps(image, side, side);
}
