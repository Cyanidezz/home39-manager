import { homepageImageDisplayUrl, type HomepageSettings } from "@/lib/homepage";

type Props = { settings: HomepageSettings };

export default function Hero({ settings }: Props) {
  // With a banner photo the copy stays white (with a shadow) so it reads on any image;
  // without one, a soft peach gradient and dark brown copy keep the page light and warm.
  const hasImage = Boolean(settings.banner_image_url);

  return (
    <section
      className={`relative overflow-hidden bg-gradient-to-br ${
        hasImage
          ? "from-brand-700 via-brand-600 to-brand-500 text-white"
          : "from-brand-100 via-brand-200 to-brand-300 text-brand-950"
      }`}
    >
      {settings.banner_image_url && (
        <div
          className="pointer-events-none absolute inset-0 bg-cover"
          style={{
            backgroundImage: `url(${homepageImageDisplayUrl(settings.banner_image_url)})`,
            backgroundPosition: `${settings.banner_image_position_x}% ${settings.banner_image_position_y}%`,
            transformOrigin: `${settings.banner_image_position_x}% ${settings.banner_image_position_y}%`,
            transform: `scale(${settings.banner_image_zoom / 100})`,
          }}
        />
      )}
      <div className="relative mx-auto grid min-h-[470px] max-w-7xl items-center px-4 py-16 sm:px-8">
        <div>
          <p
            className={`mb-4 inline-flex rounded-full border px-4 py-2 text-sm font-medium ${
              hasImage ? "border-white/25 bg-white/10" : "border-brand-300 bg-white/60 text-brand-800"
            }`}
          >
            {settings.banner_badge}
          </p>
          <h1
            className={`max-w-2xl text-4xl font-bold leading-tight sm:text-6xl ${
              hasImage ? "drop-shadow-md" : ""
            }`}
          >
            {settings.banner_title}
            <span className="block">{settings.banner_highlight}</span>
          </h1>
          <p
            className={`mt-6 max-w-xl text-lg leading-8 ${
              hasImage ? "text-white drop-shadow-md" : "text-brand-900"
            }`}
          >
            {settings.banner_description}
          </p>
          <a
            href="#rooms"
            className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-lg hover:bg-brand-50"
          >
            ดูห้องพัก ↓
          </a>
        </div>
      </div>
    </section>
  );
}
