import type { HomepageSettings } from "@/lib/homepage";

type Props = { settings: HomepageSettings };

export default function ContactSection({ settings }: Props) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-8">
      <div className="overflow-hidden rounded-3xl bg-gradient-to-r from-blue-700 to-blue-600 p-8 text-white shadow-xl sm:p-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="text-3xl font-bold">{settings.contact_title}</h2>
            <p className="mt-3 text-blue-100">
              {settings.contact_description}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <a
              href={settings.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"
            >
              Facebook
            </a>
            <a
              href={settings.line_url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600"
            >
              LINE {settings.line_id}
            </a>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-6 text-blue-50">
          <a href={`tel:${settings.phone_primary.replace(/\D/g, "")}`}>โทร {settings.phone_primary}</a>
          <a href={`tel:${settings.phone_secondary.replace(/\D/g, "")}`}>โทร {settings.phone_secondary}</a>
        </div>
      </div>
    </section>
  );
}
