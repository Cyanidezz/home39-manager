import type { SupabaseClient } from "@supabase/supabase-js";

const maxImageSize = 10 * 1024 * 1024;

export async function uploadHomepageImage(
  supabase: SupabaseClient,
  file: File,
  folder: string
) {
  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const isHeic = extension === "heic" || extension === "heif";
  if (!file.type.startsWith("image/") && !isHeic) throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  if (file.size > maxImageSize) throw new Error("รูปภาพต้องมีขนาดไม่เกิน 10 MB");

  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const contentType = isHeic
    ? extension === "heif" ? "image/heif" : "image/heic"
    : file.type;
  const { error } = await supabase.storage.from("homepage").upload(path, file, {
    cacheControl: "3600",
    contentType,
    upsert: false,
  });

  if (error) throw error;
  return supabase.storage.from("homepage").getPublicUrl(path).data.publicUrl;
}
