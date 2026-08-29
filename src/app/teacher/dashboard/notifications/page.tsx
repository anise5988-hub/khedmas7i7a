"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { NotificationItem, getNotificationCategory } from "@/components/notification-center";

export default function TeacherNotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setRoleFilter] = useState<"ALL" | "UNREAD">("ALL");

  const fetchNotifications = async () => {
    try {
      const userId = typeof window !== "undefined" ? localStorage.getItem("profyspace_user_id") || "" : "";
      const headers: Record<string, string> = userId ? { "x-user-id": userId } : {};

      const res = await fetch("/api/notifications", { headers });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(() => fetchNotifications());
  }, []);

  async function handleMarkAsRead(id?: string) {
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
      }
    } catch {}
  }

  const filtered = notifications.filter((n) => (filter === "UNREAD" ? !n.read : true));
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f]">
      <SiteNavbar dark={false} />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10 space-y-6">
        {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-white p-6 sm:p-8 border border-slate-200 shadow-sm">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-[#0d8d78]">
            Espace Enseignant
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold text-[#11233f]">
            Notifications et alertes prof
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            Suivi des nouvelles réservations, paiements reçus et statut de votre dossier enseignant.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={() => handleMarkAsRead()}
            className="rounded-2xl bg-[#e5f7f2] border border-[#0d8d78]/30 px-4 py-2.5 text-xs font-bold text-[#0d8d78] transition hover:bg-[#d4f2e9]"
          >
            Tout marquer comme lu ({unreadCount})
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 text-xs font-bold">
        <button
          onClick={() => setRoleFilter("ALL")}
          className={`rounded-xl px-4 py-2 transition ${
            filter === "ALL" ? "bg-[#11233f] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Toutes ({notifications.length})
        </button>
        <button
          onClick={() => setRoleFilter("UNREAD")}
          className={`rounded-xl px-4 py-2 transition ${
            filter === "UNREAD" ? "bg-[#11233f] text-white" : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Non lues ({unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="rounded-3xl bg-white p-12 text-center text-xs text-slate-400 border border-slate-200">
            Chargement de vos notifications...
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-3xl bg-white p-12 text-center text-xs text-slate-400 border border-slate-200">
            Aucune notification pour le moment.
          </div>
        ) : (
          filtered.map((n) => {
            const category = getNotificationCategory(n.type);
            return (
            <div
              key={n.id}
              onClick={() => {
                if (!n.read) handleMarkAsRead(n.id);
                if (n.link) window.location.href = n.link;
              }}
              className={`flex items-start gap-4 rounded-3xl p-5 border transition cursor-pointer ${
                !n.read
                  ? "bg-white border-[#0d8d78]/40 shadow-sm ring-1 ring-[#0d8d78]/20"
                  : "bg-white/70 border-slate-200 hover:bg-white"
              }`}
            >
              <div className="mt-1 shrink-0">
                {category === "SUCCESS" && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}
                {category === "WARNING" && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                  </div>
                )}
                {category === "SYSTEM" && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-100 text-purple-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                )}
                {category === "INFO" && (
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className={`text-sm font-bold ${!n.read ? "text-[#11233f]" : "text-slate-700"}`}>
                    {n.title}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {new Date(n.createdAt).toLocaleDateString("fr-TN", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {n.message}
                </p>
                {n.link && (
                  <span className="mt-2 inline-block text-xs font-bold text-[#0d8d78] hover:underline">
                    Voir la section →
                  </span>
                )}
              </div>

              {!n.read && (
                <span className="h-2.5 w-2.5 rounded-full bg-[#0d8d78] shrink-0 mt-2" />
              )}
            </div>
            );
          })
        )}
            </div>
          </div>
        </main>
      );
}