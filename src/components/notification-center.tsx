"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "SYSTEM";
  read: boolean;
  createdAt: string;
  link?: string | null;
};

export function NotificationCenter({ dark = false }: { dark?: boolean }) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 15000); // refresh every 15s

    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  async function fetchNotifications() {
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const headers: Record<string, string> = userId ? { "x-user-id": userId } : {};

      const res = await fetch("/api/notifications", { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {}
  }

  async function handleMarkAsRead(id?: string) {
    setLoading(true);
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (userId) headers["x-user-id"] = userId;

      const res = await fetch("/api/notifications", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {} finally {
      setLoading(false);
    }
  }

  function formatTime(dateStr: string) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);

    if (diffMin < 2) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    return d.toLocaleDateString("fr-TN", { day: "numeric", month: "short" });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`group relative flex items-center justify-center rounded-2xl p-2.5 transition-all duration-300 shadow-sm ${
          dark
            ? "bg-white/10 text-slate-200 hover:bg-white/20 hover:text-white border border-white/10"
            : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300"
        }`}
        aria-label="Notifications"
        title="Centre de notifications"
      >
        <svg
          className="h-5 w-5 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white ring-2 ring-white shadow-md animate-bounce">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {open && (
        <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl z-50 animate-scale-up text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-[#11233f]">Notifications</span>
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-extrabold text-rose-600">
                  {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleMarkAsRead()}
                className="text-xs font-bold text-[#0d8d78] hover:underline disabled:opacity-50"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          {/* List */}
          <div className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                <svg className="mx-auto h-8 w-8 text-slate-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                Aucune notification pour le moment.
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <div
                  key={n.id}
                  onClick={() => {
                    if (!n.read) handleMarkAsRead(n.id);
                    if (n.link) window.location.href = n.link;
                  }}
                  className={`group relative flex items-start gap-3 rounded-2xl p-3 text-left transition cursor-pointer ${
                    !n.read ? "bg-[#e5f7f2]/60 border border-[#0d8d78]/20" : "hover:bg-slate-50 border border-transparent"
                  }`}
                >
                  {/* Clean SVG Icon by Type */}
                  <div className="mt-0.5 shrink-0">
                    {n.type === "SUCCESS" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}
                    {n.type === "WARNING" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                    )}
                    {n.type === "SYSTEM" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-purple-100 text-purple-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    )}
                    {n.type === "INFO" && (
                      <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!n.read ? "text-[#11233f]" : "text-slate-700"}`}>
                        {n.title}
                      </p>
                      <span className="text-[10px] text-slate-400 shrink-0">{formatTime(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500 leading-snug line-clamp-2">
                      {n.message}
                    </p>
                  </div>

                  {!n.read && (
                    <span className="h-2 w-2 rounded-full bg-[#0d8d78] shrink-0 mt-2" />
                  )}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="mt-3 border-t border-slate-100 pt-2.5 text-center">
            <Link
              href="/dashboard/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-bold text-[#0d8d78] hover:underline"
            >
              Voir toutes les notifications →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
