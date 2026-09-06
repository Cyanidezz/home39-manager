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
    href: "/dashboard#rooms",
    icon: "⌂",
    active: (path: string) => path.startsWith("/rooms"),
  },
  {
    label: "รายจ่ายจริง",
    href: "/expenses",
    icon: "฿",
    active: (path: string) => path.startsWith("/expenses"),
  },
  {
    label: "บัญชีรับโอน",
    href: "/settings/payment",
    icon: "⚙",
    active: (path: string) => path.startsWith("/settings"),
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
      <div className="border-b border-slate-200 px-5 py-5">
        <Link
          href="/dashboard"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-lg text-white shadow-md shadow-blue-200">
            🏢
          </span>
          <div>
            <p className="font-bold leading-tight text-slate-900">Home39 Manager</p>
            <p className="mt-1 text-xs text-slate-500">ระบบจัดการหอพัก</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
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
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-blue-700"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                  selected ? "bg-blue-100" : "bg-slate-100"
                }`}
              >
                {item.icon}
              </span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-blue-700"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
            ↗
          </span>
          ดูหน้าเว็บไซต์
        </Link>
        <button
          type="button"
          onClick={signOut}
          disabled={signingOut}
          className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50">
            ⇥
          </span>
          {signingOut ? "กำลังออกจากระบบ..." : "ออกจากระบบ"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        {navContent}
      </aside>

      <div className="min-w-0 flex-1">
        <div className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-bold">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-white">
              🏢
            </span>
            Home39 Manager
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-xl text-slate-700"
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
            className="absolute inset-0 bg-slate-950/50"
            aria-label="ปิดเมนู"
          />
          <aside className="relative flex h-full w-[min(85vw,300px)] flex-col bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-xl text-slate-400 hover:bg-slate-100"
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
