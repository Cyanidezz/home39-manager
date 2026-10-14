import { NextResponse } from "next/server";
import { convertHeicToJpeg } from "@/lib/image";

export const runtime = "nodejs";

const maxImageSize = 10 * 1024 * 1024;
const homepageObjectPrefix = "/storage/v1/object/public/homepage/";

export async function GET(request: Request) {
  const imageUrl = new URL(request.url).searchParams.get("url");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!imageUrl || !supabaseUrl) {
    return NextResponse.json({ error: "ไม่พบรูปภาพ" }, { status: 404 });
  }

  let source: URL;
  try {
    source = new URL(imageUrl);
    if (
      source.origin !== new URL(supabaseUrl).origin ||
      source.username ||
      source.password ||
      !source.pathname.startsWith(homepageObjectPrefix) ||
      !/\.(heic|heif)$/i.test(source.pathname)
    ) {
      return NextResponse.json({ error: "URL รูปภาพไม่ถูกต้อง" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "URL รูปภาพไม่ถูกต้อง" }, { status: 400 });
  }

  try {
    const response = await fetch(source, { redirect: "manual" });
    if (!response.ok) {
      return NextResponse.json({ error: "โหลดรูปภาพไม่สำเร็จ" }, { status: 502 });
    }

    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > maxImageSize) {
      return NextResponse.json({ error: "รูปภาพมีขนาดใหญ่เกินไป" }, { status: 413 });
    }

    const sourceBuffer = new Uint8Array(await response.arrayBuffer());
    if (sourceBuffer.byteLength > maxImageSize) {
      return NextResponse.json({ error: "รูปภาพมีขนาดใหญ่เกินไป" }, { status: 413 });
    }

    const jpeg = await convertHeicToJpeg(sourceBuffer);
    return new Response(Buffer.from(jpeg), {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (conversionError) {
    console.error("Homepage HEIC conversion failed:", conversionError);
    return NextResponse.json({ error: "แปลงรูปภาพไม่สำเร็จ" }, { status: 415 });
  }
}