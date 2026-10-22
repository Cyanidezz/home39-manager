import convert from "heic-convert";

// A HEIC file only a few KB long can declare a huge picture; decoding it would exhaust
// the server's memory. Pixels are limited before the decoder sees the file (a 48 MP phone photo fits).
export const maxHeicPixels = 50_000_000;
export const maxHeicSide = 16_384;

/** Largest width x height declared by the file's `ispe` (image spatial extents) boxes, or null if none. */
export function declaredHeicSize(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let found: { width: number; height: number } | null = null;
  for (let i = 4; i + 16 <= bytes.length; i++) {
    // box layout: size(4) 'ispe' version/flags(4) width(4) height(4)
    if (bytes[i] !== 0x69 || bytes[i + 1] !== 0x73 || bytes[i + 2] !== 0x70 || bytes[i + 3] !== 0x65) continue;
    const width = view.getUint32(i + 8);
    const height = view.getUint32(i + 12);
    if (!found || width * height > found.width * found.height) found = { width, height };
  }
  return found;
}

export function convertHeicToJpeg(buffer: Uint8Array) {
  const size = declaredHeicSize(buffer);
  if (
    !size ||
    size.width === 0 ||
    size.height === 0 ||
    size.width > maxHeicSide ||
    size.height > maxHeicSide ||
    size.width * size.height > maxHeicPixels
  ) {
    return Promise.reject(new Error("HEIC image size is missing or too large"));
  }
  return convert({ buffer, format: "JPEG", quality: 0.85 });
}
