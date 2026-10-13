import { googleMapsEmbedUrl, type HomepageSettings } from "@/lib/homepage";

type Props = { settings: HomepageSettings };

export default function LocationSection({ settings }: Props) {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-16 sm:px-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="aspect-[4/3] w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
          <iframe
            src={googleMapsEmbedUrl(settings.map_url)}
            title={`แผนที่ ${settings.location_title}`}
            className="h-full w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Location
          </p>
          <h2 className="mt-2 text-3xl font-bold">{settings.location_title}</h2>
          <p className="mt-4 leading-7 text-slate-500">
            {settings.location_description}
          </p>
          <a
            href={settings.map_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            เปิดเส้นทางใน Google Maps
          </a>
          <div className="mt-7">
            <p className="font-semibold">สถานที่ใกล้เคียง</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {settings.nearby_places.map((place, index) => (
                <li key={`${place}-${index}`} className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-100">📍</span>
                  <span className="font-medium">{place}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
