"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  children: ReactNode;
};

const adminPrefixes = ["/dashboard", "/expenses", "/rooms", "/settings"];

const navigation = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: "▦",
    active: (path: string) => path === "/dashboard",
  },
  {
    label: "ห้องพัก",
    href: "/rooms",
    icon: "⌂",
    active: (path: string) => path.startsWith("/rooms"),
  },
  {
    label: "บันทึกรายจ่าย",
    href: "/expenses",
    icon: "฿",
    active: (path: string) => path.startsWith("/expenses"),
  },
  {
    label: "บัญชีโอนเงิน",
    href: "/settings/payment",
    icon: "⚙",
    active: (path: string) => path.startsWith("/settings/payment"),
  },
];

export default function AdminShell({ children }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const isAdmin = adminPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  async function signOut() {
    setSigningOut(true);
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push("/");
    router.refresh();
  }

  if (!isAdmin) return children;

  const navContent = (
    <>
      <div className="border-b border-brand-200 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-300 text-lg text-brand-950 shadow-md shadow-brand-200">
            🏢
          </span>
          <div>
            <p className="font-bold leading-tight text-brand-950">Home39 Manager</p>
            <p className="mt-1 text-xs text-brand-700">ระบบจัดการหอพัก</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-brand-600">
          เมนูหลัก
        </p>
        {navigation.map((item) => {
          const selected = item.active(pathname);
          return (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${
                selected
                  ? "bg-white text-brand-800 shadow-sm"
                  : "text-brand-800 hover:bg-white/70 hover:text-brand-950"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  selected ? "bg-brand-100" : "bg-white/60"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-brand-200 p-3">
        <Link
          href="/settings/homepage"
          onClick={() => setMenuOpen(false)}
          className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
            pathname.startsWith("/settings/homepage")
              ? "bg-white text-brand-800 shadow-sm"
              : "text-brand-800 hover:bg-white/70 hover:text-brand-950"
          }`}
        >
          <span
            className={`flex h-8 w-8 items-center justify-center rounded-lg ${
              pathname.startsWith("/settings/homepage") ? "bg-brand-100" : "bg-white/60"
            }`}
          >
            ▤
          </span>
          จัดการ Homepage
        </Link>
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-brand-800 hover:bg-white/70 hover:text-brand-950"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/60">
            ↗
          </span>
          ดูหน้าเว็บไซต์
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-700 hover:bg-red-100 hover:text-red-800 disabled:opacity-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100">
            ⇥
          </span>
          {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-sand-50 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-brand-200 bg-brand-100 lg:flex">
        {navContent}
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-sand-200 bg-white px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-300 text-brand-950">
              🏢
            </span>
            Home39 Manager
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-sand-200 text-xl text-sand-700"
            aria-label="เปิดเมนู"
          >
            ☰
          </button>
        </div>

        {children}
      </div>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-sand-950/50"
            aria-label="ปิดเมนู"
          />
          <aside className="relative flex h-full w-[min(85vw,300px)] flex-col border-r border-brand-200 bg-brand-100 shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-brand-700 hover:bg-white/70 hover:text-brand-950"
              aria-label="ปิดเมนู"
            >
              ×
            </button>
            {navContent}
          </aside>
        </div>
      )}
    </div>
  );
}
