import type { SupabaseClient } from "@supabase/supabase-js";

const maxImageSize = 10 * 1024 * 1024;

const extensionByType: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
};

/** Picks the stored extension from the MIME type (HEIC by extension), rejecting SVG and the like. */
export function homepageImageExtension(file: Pick<File, "name" | "type">) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase() || "";
  if (nameExtension === "heic" || nameExtension === "heif") {
    return { extension: nameExtension, contentType: `image/${nameExtension}` };
  }
  const extension = extensionByType[file.type];
  return extension ? { extension, contentType: file.type } : null;
}

export async function uploadHomepageImage(
  supabase: SupabaseClient,
  file: File,
  folder: string
) {
  const image = homepageImageExtension(file);
  if (!image) throw new Error("รองรับไฟล์ JPG, PNG, WebP, GIF และ HEIC เท่านั้น");
  if (file.size > maxImageSize) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 10 MB");

  const path = `${folder}/${crypto.randomUUID()}.${image.extension}`;
  const contentType = image.contentType;
  const { error } = await supabase.storage.from("homepage").upload(path, file, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });

  if (error) throw error;
  return supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl;
}
