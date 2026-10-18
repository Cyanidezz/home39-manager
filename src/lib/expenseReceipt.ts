import type { SupabaseClient } from "@supabase/supabase-js";
import { downscaleImage } from "@/lib/imageResize";

const BUCKET = "expense-receipts";
const MAX_RECEIPT_SIZE = 10 * 1024 * 1024;
/** Receipts only need to stay readable: a smaller size and lower threshold than the homepage photos. */
const RECEIPT_MAX_DIMENSION = 1600;
const RECEIPT_SKIP_BELOW_BYTES = 300 * 1024;
const SIGNED_URL_SECONDS = 300;

const extensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Shrinks the photo, checks it and stores it; returns the object path to keep on the expense. */
export async function uploadExpenseReceipt(supabase: SupabaseClient, original: File) {
  if (!extensions[original.type]) throw new Error("แนบได้เฉพาะรูป JPG, PNG หรือ WebP");
  const file = await downscaleImage(original, { maxDimension: RECEIPT_MAX_DIMENSION, skipBelowBytes: RECEIPT_SKIP_BELOW_BYTES });
  if (file.size > MAX_RECEIPT_SIZE) throw new Error("รูปหลักฐานต้องมีขนาดไม่เกิน 10 MB");

  const path = `${crypto.randomUUID()}.${extensions[file.type] ?? "jpg"}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}

export async function receiptUrl(supabase: SupabaseClient, path: string) {
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  return data?.signedUrl ?? null;
}

/** Best effort: a leftover file is harmless, a failed cleanup must not block saving or deleting the expense. */
export async function removeExpenseReceipt(supabase: SupabaseClient, path: string) {
  await supabase.storage.from(BUCKET).remove([path]);
}
