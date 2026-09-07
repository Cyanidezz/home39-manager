"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type RelatedRoom = { room_code: string } | { room_code: string }[] | null;
type RelatedTenant = { full_name: string } | { full_name: string }[] | null;

type SlipNotification = {
  id: string;
  total_amount: number | string;
  slip_submitted_at: string | null;
  rooms: RelatedRoom;
  tenants: RelatedTenant;
};

function firstRelated<T>(value: T | T[] | null) {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function formatMoney(value: number | string) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatSubmittedAt(value: string | null) {
  if (!value) return "เพิ่งส่งสลิป";

  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function SlipNotificationBell() {
  const supabase = useMemo(() => createClient(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<SlipNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadNotifications() {
      const { data, error } = await supabase
        .from("bills")
        .select(
          "id, total_amount, slip_submitted_at, rooms(room_code), tenants(full_name)"
        )
        .eq("status", "slip_submitted")
        .order("slip_submitted_at", { ascending: false })
        .limit(8);

      if (!active) return;

      if (error) {
        setLoadFailed(true);
      } else {
        setNotifications((data || []) as SlipNotification[]);
        setLoadFailed(false);
      }
      setLoading(false);
    }

    void loadNotifications();
    const interval = window.setInterval(loadNotifications, 20_000);

    function refreshWhenVisible() {
      if (document.visibilityState === "visible") void loadNotifications();
    }

    window.addEventListener("focus", loadNotifications);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", loadNotifications);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [supabase]);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsideClick(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const countLabel = notifications.length > 99 ? "99+" : String(notifications.length);

  return (
    <div
      ref={containerRef}
      className="fixed right-[4.5rem] top-3 z-[60] lg:left-[13.1rem] lg:right-auto lg:top-5"
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-300 lg:border-white/15 lg:bg-white/10 lg:text-blue-100 lg:shadow-none lg:hover:bg-white/20 lg:hover:text-white"
        aria-label={
          notifications.length > 0
            ? `มีสลิปใหม่ ${notifications.length} รายการ`
            : "การแจ้งเตือนสลิป"
        }
        aria-expanded={open}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-[18px] w-[18px]"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>

        {notifications.length > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold leading-none text-white ring-2 ring-white lg:ring-blue-800">
            {countLabel}
          </span>
        )}
      </button>

      {open && (
        <section className="absolute -right-14 top-12 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl lg:left-0 lg:right-auto">
          <header className="flex items-center justify-between border-b border-slate-100 px-4 py-3.5">
            <div>
              <h2 className="font-bold">สลิปรอตรวจสอบ</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {notifications.length > 0
                  ? `${notifications.length} รายการใหม่`
                  : "ไม่มีรายการใหม่"}
              </p>
            </div>
            {notifications.length > 0 && (
              <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                {countLabel}
              </span>
            )}
          </header>

          <div className="max-h-[min(26rem,65vh)] overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                กำลังโหลด...
              </p>
            ) : loadFailed ? (
              <p className="px-4 py-8 text-center text-sm text-red-600">
                โหลดการแจ้งเตือนไม่สำเร็จ
              </p>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  ✓
                </span>
                <p className="mt-3 text-sm font-medium text-slate-700">
                  ตรวจสอบสลิปครบแล้ว
                </p>
              </div>
            ) : (
              notifications.map((notification) => {
                const room = firstRelated(notification.rooms);
                const tenant = firstRelated(notification.tenants);
                const roomCode = room?.room_code || "-";

                return (
                  <Link
                    key={notification.id}
                    href={`/rooms/${encodeURIComponent(roomCode)}/bills/${notification.id}`}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 border-b border-slate-100 px-4 py-3.5 transition last:border-b-0 hover:bg-blue-50"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                      ▤
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <strong className="text-sm">ห้อง {roomCode}</strong>
                        <span className="shrink-0 text-sm font-semibold text-blue-700">
                          {formatMoney(notification.total_amount)} บาท
                        </span>
                      </span>
                      <span className="mt-1 block truncate text-xs text-slate-500">
                        {tenant?.full_name || "ไม่ระบุชื่อผู้เช่า"}
                      </span>
                      <span className="mt-1 block text-xs text-slate-400">
                        {formatSubmittedAt(notification.slip_submitted_at)}
                      </span>
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
