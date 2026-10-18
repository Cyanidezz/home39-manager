/** Longest side, in pixels, that uploaded homepage photos are scaled down to. */
export const MAX_IMAGE_DIMENSION = 2400;
const JPEG_QUALITY = 0.85;
/** Files at or below this size with an acceptable resolution are uploaded untouched. */
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;

/** Size that fits inside `max` on the longest side, keeping the aspect ratio (never upscales). */
export function fitWithin(width: number, height: number, max = MAX_IMAGE_DIMENSION) {
  const longest = Math.max(width, height);
  if (longest <= max) return { width, height, scaled: false };
  const ratio = max / longest;
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
    scaled: true,
  };
}

/** Only still JPEG/PNG/WebP are re-encoded; GIF (animation) and HEIC (not decodable everywhere) pass through. */
export function isResizableImage(file: Pick<File, "type">) {
  return file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp";
}

/**
 * Downscales a large photo in the browser before upload. Falls back to the original file
 * whenever resizing is not possible or would not help.
 */
export async function downscaleImage(
  file: File,
  options: { maxDimension?: number; skipBelowBytes?: number } = {}
): Promise<File> {
  const { maxDimension = MAX_IMAGE_DIMENSION, skipBelowBytes = SKIP_BELOW_BYTES } = options;
  if (!isResizableImage(file) || typeof createImageBitmap !== "function") return file;

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const target = fitWithin(bitmap.width, bitmap.height, maxDimension);
    if (!target.scaled && file.size <= skipBelowBytes) {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, target.width, target.height);
    bitmap.close();

    // PNG with transparency keeps its format; everything else becomes JPEG.
    const keepPng = file.type === "image/png";
    const outType = keepPng ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, outType, JPEG_QUALITY)
    );
    if (!blob || blob.size >= file.size) return file;

    const extension = keepPng ? "png" : "jpg";
    const baseName = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([blob], `${baseName}.${extension}`, { type: outType, lastModified: Date.now() });
  } catch {
    return file;
  }
}
