export type SlipKind = "jpeg" | "png" | "webp" | "heic" | "pdf";

const heicBrands = new Set(["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1", "heif"]);

function startsWith(bytes: Uint8Array, signature: number[], offset = 0) {
  return signature.every((value, index) => bytes[offset + index] === value);
}

function ascii(bytes: Uint8Array, start: number, length: number) {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

/** Identifies an uploaded slip by its leading bytes rather than the client-supplied type. */
export function sniffSlipKind(bytes: Uint8Array): SlipKind | null {
  if (bytes.length < 12) return null;
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return "webp";
  if (ascii(bytes, 0, 5) === "%PDF-") return "pdf";
  if (ascii(bytes, 4, 4) === "ftyp" && heicBrands.has(ascii(bytes, 8, 4))) return "heic";
  return null;
}

const kindByMime: Record<string, SlipKind> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heic",
  "application/pdf": "pdf",
};

/** True when the declared MIME type agrees with what the bytes actually are. */
export function matchesDeclaredType(bytes: Uint8Array, declaredType: string) {
  const expected = kindByMime[declaredType];
  return expected !== undefined && sniffSlipKind(bytes) === expected;
}
