import { safeHttpUrl, type HomepageSettings } from "@/lib/homepage";

type Props = { settings: HomepageSettings };

export default function ContactSection({ settings }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-brand-100 to-brand-200 p-8 text-brand-950 shadow-sm sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold">{settings.contact_title}</h2>
            <p className="mt-3 text-brand-800">
              {settings.contact_description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={safeHttpUrl(settings.facebook_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white px-5 py-3 font-semibold text-brand-700 hover:bg-brand-50"
            >
              Facebook
            </a>
            <a
              href={safeHttpUrl(settings.line_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-700 px-5 py-3 font-semibold text-white hover:bg-emerald-800"
            >
              LINE {settings.line_id}
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-brand-300 pt-6 text-brand-900">
          <a href={`tel:${settings.phone_primary.replace(/\D/g, "")}`}>โทร {settings.phone_primary}</a>
          <a href={`tel:${settings.phone_secondary.replace(/\D/g, "")}`}>โทร {settings.phone_secondary}</a>
        </div>
      </div>
    </section>
  );
}
