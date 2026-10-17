import Link from "next/link";
import type { ReactNode } from "react";

const widths = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
} as const;

type Props = {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: string;
  back?: { href: string; label: string };
  /** Right-hand controls: buttons, status pills, filters. */
  actions?: ReactNode;
  /** Match the page content's max width so header and body line up. */
  width?: keyof typeof widths;
};

/** The white title bar shared by the admin list/detail pages (same look as the dashboard's). */
export default function PageHeader({ title, subtitle, eyebrow, back, actions, width = "7xl" }: Props) {
  return (
    <header className="border-b border-sand-200 bg-white">
      <div
        className={`mx-auto flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8 ${widths[width]}`}
      >
        <div className="min-w-0">
          {back && (
            <Link href={back.href} className="text-sm font-medium text-brand-700 hover:text-brand-900">
              ← {back.label}
            </Link>
          )}
          {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">{eyebrow}</p>}
          <h1 className={`text-2xl font-bold tracking-tight ${back ? "mt-2" : ""}`}>{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-sand-500">{subtitle}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}
