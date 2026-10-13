import convert from "heic-convert";

export function convertHeicToJpeg(buffer: Uint8Array) {
  return convert({ buffer, format: "JPEG", quality: 0.85 });
}