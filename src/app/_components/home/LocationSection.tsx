"use client";

import { useState } from "react";
import {
  googleMapsDirectionsEmbedUrl,
  googleMapsDirectionsLink,
  googleMapsEmbedUrl,
  parseNearbyPlace,
  safeHttpUrl,
  type HomepageSettings,
} from "@/lib/homepage";
import Icon from "@/components/Icon";

type Props = { settings: HomepageSettings };

export default function LocationSection({ settings }: Props) {
  const [selected, setSelected] = useState<number | null>(null);

  const places = settings.nearby_places.map((text) => ({ text, ...parseNearbyPlace(text) }));
  const route = selected !== null ? places[selected] : undefined;

  const mapSrc = route
    ? googleMapsDirectionsEmbedUrl(route.name, route.meters)
    : googleMapsEmbedUrl(settings.map_url);
  const mapsLink = route
    ? googleMapsDirectionsLink(route.name, route.meters)
    : safeHttpUrl(settings.map_url);

  return (
    <section className="border-y border-sand-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-sand-200 bg-sand-100">
            <iframe
              key={mapSrc}
              src={mapSrc}
              title={route ? `เส้นทางจาก Home 39 ไป ${route.name}` : `แผนที่ ${settings.location_title}`}
              className="h-full w-full border-0"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              allowFullScreen
            />
          </div>
          {route && (
            <p role="status" className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-sand-600">
              <span className="font-semibold text-brand-700">
                เส้นทางจาก Home 39 ไป {route.name}
                {route.meters !== null &&
                  ` (${route.meters >= 1000 ? `${route.meters / 1000} กม.` : `${route.meters} ม.`})`}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="font-semibold text-brand-700 underline hover:text-brand-900"
              >
                กลับไปดูที่ตั้ง Home 39
              </button>
            </p>
          )}
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-600">
            Location
          </p>
          <h2 className="mt-2 text-3xl font-bold">{settings.location_title}</h2>
          <p className="mt-4 leading-7 text-sand-500">
            {settings.location_description}
          </p>
          <a
            href={mapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-xl bg-brand-300 px-5 py-3 font-semibold text-brand-950 hover:bg-brand-400"
          >
            {route ? `เปิดเส้นทางไป ${route.name} ใน Google Maps` : "เปิดเส้นทางใน Google Maps"}
          </a>
          <div className="mt-7">
            <p className="font-semibold">สถานที่ใกล้เคียง</p>
            <p className="mt-1 text-sm text-sand-500">แตะสถานที่เพื่อดูเส้นทางจาก Home 39 บนแผนที่</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {places.map((place, index) => {
                const active = selected === index;
                return (
                  <li key={`${place.text}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setSelected(active ? null : index)}
                      aria-pressed={active}
                      className={`flex h-full w-full items-center gap-3 rounded-lg border px-4 py-3 text-left ${
                        active
                          ? "border-brand-400 bg-brand-100"
                          : "border-sand-200 bg-sand-50 hover:border-brand-300 hover:bg-brand-50"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-100">
                        <Icon name="pin" className="h-5 w-5 text-brand-600" />
                      </span>
                      <span className="font-medium">{place.text}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
