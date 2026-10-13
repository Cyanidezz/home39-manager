import { homepageImageDisplayUrl, type HomepageSettings } from "@/lib/homepage";

type Props = { settings: HomepageSettings };

export default function Hero({ settings }: Props) {
  return (
    <section
      className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-600 to-blue-500 text-white"
    >
      {settings.banner_image_url && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${homepageImageDisplayUrl(settings.banner_image_url)})`,
            backgroundPosition: `${settings.banner_image_position_x}% ${settings.banner_image_position_y}%`,
            transform: `scale(${settings.banner_image_zoom / 100})`,
          }}
        />
      )}
      <div className="relative mx-auto grid min-h-[470px] max-w-7xl items-center px-4 py-16 sm:px-8">
        <div>
          <p className="mb-4 inline-flex rounded-full border border-white/25 bg-white/10 px-4 py-2 text-sm font-medium">
            {settings.banner_badge}
          </p>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight drop-shadow-md sm:text-6xl">
            {settings.banner_title}
            <span className="block">{settings.banner_highlight}</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-white drop-shadow-md">
            {settings.banner_description}
          </p>
          <a
            href="#rooms"
            className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-blue-700 shadow-lg hover:bg-blue-50"
          >
            ดูห้องพัก ↓
          </a>
        </div>
      </div>
    </section>
  );
}
