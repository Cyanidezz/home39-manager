import type { ReactNode } from "react";

/** Shared button looks so every card's actions line up. */
export const primaryButton =
  "inline-flex items-center gap-2 rounded-lg bg-brand-300 px-4 py-2 text-sm font-semibold text-brand-950 hover:bg-brand-400";
export const secondaryButton =
  "inline-flex items-center gap-2 rounded-lg border border-sand-300 bg-white px-4 py-2 text-sm font-semibold text-brand-800 hover:bg-brand-50";

type CardProps = {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  /** Action buttons, kept in one row at the bottom with the same gap on every card. */
  footer?: ReactNode;
};

/** One card of the room page: icon + title, a body, and an optional action row. */
export function InfoCard({ icon, title, children, footer }: CardProps) {
  return (
    <section className="rounded-2xl border border-sand-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-3 text-lg font-semibold">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
          {icon}
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
      {footer && <div className="mt-6 flex flex-wrap gap-3">{footer}</div>}
    </section>
  );
}

/** Label/value rows with identical height and dividers, used by every card. */
export function InfoRows({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <dl className="divide-y divide-sand-100">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0">
          <dt className="shrink-0 text-sand-500">{row.label}</dt>
          <dd className="text-right font-semibold text-sand-900">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Empty-state text used when a card has nothing to show yet. */
export function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-sand-500">{children}</p>;
}
