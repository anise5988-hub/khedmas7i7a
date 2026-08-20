
"use client";

import { useEffect, useState } from "react";

type StudentUser = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  createdAt: string;
  walletBalanceTnd: number;
};

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/users")
      .then((res) => (res.ok ? res.json() : { users: [] }))
      .then((data) => {
        const studentUsers = (data.users || []).filter((u: StudentUser) => u.role === "STUDENT");
        setStudents(studentUsers);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = students.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
  );

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <a href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </a>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Annuaire Élèves
            </span>
          </div>

          <a
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour Dashboard
          </a>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Élèves enregistrés ({students.length})</h1>
            <p className="mt-1 text-sm text-slate-400">Consultez les comptes étudiants, leurs wallets et leurs coordonnées.</p>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher élève par nom, email..."
            className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
          />
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des élèves...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucun élève trouvé.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3">Élève</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Téléphone</th>
                  <th className="px-4 py-3">Solde Wallet</th>
                  <th className="px-4 py-3 text-right">Inscrit le</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((s) => (
                  <tr key={s.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4 font-bold text-white">{s.name}</td>
                    <td className="px-4 py-4 text-xs">{s.email}</td>
                    <td className="px-4 py-4 text-xs text-slate-400">{s.phone}</td>
                    <td className="px-4 py-4 font-bold text-[#72d6bf] text-sm">
                      {s.walletBalanceTnd.toFixed(3)} DT
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-400">
                      {new Date(s.createdAt).toLocaleDateString("fr-TN")}
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
