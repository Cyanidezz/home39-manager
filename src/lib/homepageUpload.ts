import type { SupabaseClient } from "@supabase/supabase-js";

const maxImageSize = 10 * 1024 * 1024;
export const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

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

/** True for an MP4 clip (by MIME type, or by extension when the browser reports no type). */
export function isMp4File(file: Pick<File, "name" | "type">) {
  if (file.type === "video/mp4") return true;
  return file.type === "" && file.name.toLowerCase().endsWith(".mp4");
}

export async function uploadHomepageVideo(
  supabase: SupabaseClient,
  file: File,
  folder: string
) {
  if (!isMp4File(file)) throw new Error("วิดีโอรองรับเฉพาะไฟล์ .mp4");
  if (file.size > MAX_VIDEO_SIZE) throw new Error("วิดีโอต้องมีขนาดไม่เกิน 50 MB");

  const path = `${folder}/${crypto.randomUUID()}.mp4`;
  const { error } = await supabase.storage.from("homepage-videos").upload(path, file, {
    cacheControl: "3600",
    contentType: "video/mp4",
    upsert: false,
  });

  if (error) throw error;
  return supabase.storage.from("homepage-videos").getPublicUrl(path).data.publicUrl;
}

/** Room gallery upload: MP4 goes to the video bucket, everything else must be an image. */
export function uploadHomepageMedia(supabase: SupabaseClient, file: File, folder: string) {
  return isMp4File(file)
    ? uploadHomepageVideo(supabase, file, folder)
    : uploadHomepageImage(supabase, file, folder);
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
