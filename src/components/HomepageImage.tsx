import type { CSSProperties, ReactEventHandler } from "react";
import { homepageImageDisplayUrl } from "@/lib/homepage";

type Props = {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  draggable?: boolean;
  onLoad?: ReactEventHandler<HTMLImageElement>;
};

// Plain <img> on purpose: HEIC files are converted on the fly by
// /api/homepage-image and sources are admin-uploaded Supabase URLs,
// so next/image's optimizer adds config without a benefit here.
export default function HomepageImage({ src, alt, className, style, draggable, onLoad }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={homepageImageDisplayUrl(src)}
      alt={alt}
      className={className}
      style={style}
      draggable={draggable}
      onLoad={onLoad}
    />
  );
}
