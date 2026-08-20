/* eslint-disable react/no-unescaped-entities */
"use client";

import { useEffect, useState } from "react";

type UserItem = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "STUDENT" | "TEACHER" | "ADMIN";
  createdAt: string;
  walletBalanceTnd: number;
  teacherStatus: string | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => setUsers(data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.phone.includes(search);
    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/admin" className="font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-[-.06em]">
              profy<span className="text-[#72d6bf]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Gestion des Utilisateurs
            </span>
          </div>

          <a
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </a>
        </div>

        {/* Title & Search */}
        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Tous les utilisateurs ({users.length})</h1>
            <p className="mt-1 text-sm text-slate-400">Élèves, professeurs et administrateurs enregistrés.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, email, téléphone..."
              className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
            />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-xl border border-white/20 bg-[#17253b] px-3 py-2 text-xs text-white outline-none"
            >
              <option value="ALL">Tous les rôles</option>
              <option value="STUDENT">Élèves</option>
              <option value="TEACHER">Professeurs</option>
              <option value="ADMIN">Admins</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des utilisateurs...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucun utilisateur trouvé.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Utilisateur</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Rôle</th>
                  <th className="px-4 py-3">Solde Wallet</th>
                  <th className="px-4 py-3">Statut Professeur</th>
                  <th className="px-4 py-3 text-right">Date d'inscription</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((u) => (
                  <tr key={u.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4 font-bold text-white">{u.name}</td>
                    <td className="px-4 py-4 text-xs">
                      <div>{u.email}</div>
                      <div className="text-slate-400">{u.phone}</div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          u.role === "ADMIN"
                            ? "bg-purple-500/20 text-purple-300"
                            : u.role === "TEACHER"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-blue-500/20 text-blue-300"
                        }`}
                      >
                        {u.role === "STUDENT" ? "Élève" : u.role === "TEACHER" ? "Professeur" : "Admin"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs font-semibold text-white">
                      {u.walletBalanceTnd.toFixed(3)} DT
                    </td>
                    <td className="px-4 py-4 text-xs">
                      {u.teacherStatus ? (
                        <span className="rounded bg-white/10 px-2 py-0.5 text-xs text-slate-300">
                          {u.teacherStatus}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-400">
                      {new Date(u.createdAt).toLocaleDateString("fr-TN")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </main>
  );
}
