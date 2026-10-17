import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home 39 Hatyai",
    short_name: "Home 39",
    description: "ระบบจัดการห้องพักและข้อมูล Home 39 หาดใหญ่",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#fff9f2",
    theme_color: "#f6cba6",
    orientation: "portrait-primary",
    categories: ["business", "productivity"],
    lang: "th",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
