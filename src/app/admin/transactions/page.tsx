"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { IconSearch } from "@/components/icons";

type Transaction = {
  id: string;
  userName: string;
  userEmail: string;
  method: string;
  amountTnd: number;
  reference: string;
  status: string;
  createdAt: string;
};

export default function AdminTransactionsPage() {
  const [deposits, setDeposits] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/admin/deposits")
      .then((res) => (res.ok ? res.json() : { deposits: [] }))
      .then((data) => {
        setDeposits(data.deposits || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = deposits.filter(
    (d) =>
      d.userName.toLowerCase().includes(search.toLowerCase()) ||
      d.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      d.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#101b2d] px-4 py-8 sm:px-6 sm:py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="flex items-center gap-1 font-[family-name:var(--font-dm-sans)] text-2xl font-bold tracking-tight">
              <span>ProfySpace</span>
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-xs font-extrabold text-[#101b2d]">.admin</span>
            </Link>
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-slate-300">
              Journal des Transactions
            </span>
          </div>

          <Link
            href="/admin"
            className="rounded-full border border-white/20 bg-white/5 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/10"
          >
            ← Retour au Dashboard
          </Link>
        </div>

        <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Journal Financier ({deposits.length})</h1>
            <p className="mt-1 text-sm text-slate-400">
              Historique complet des mouvements financiers et des références de transaction.
            </p>
          </div>

          <div className="relative">
            <IconSearch className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher référence, nom..."
              className="rounded-xl border border-white/20 bg-white/10 pl-9 pr-4 py-2 text-xs text-white placeholder-slate-400 outline-none focus:border-[#72d6bf]"
            />
          </div>
        </div>

        <div className="mt-6 overflow-x-auto rounded-3xl border border-white/10 bg-white/[.04] p-2 shadow-xl">
          {loading ? (
            <div className="py-20 text-center text-slate-400">Chargement des transactions...</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-slate-400">Aucune transaction trouvée.</div>
          ) : (
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="border-b border-white/10 text-xs font-bold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="px-4 py-3.5">Utilisateur</th>
                  <th className="px-4 py-3.5">Méthode</th>
                  <th className="px-4 py-3.5">Montant</th>
                  <th className="px-4 py-3.5">Référence</th>
                  <th className="px-4 py-3.5">Statut</th>
                  <th className="px-4 py-3.5 text-right">Date & Heure</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((d) => (
                  <tr key={d.id} className="transition hover:bg-white/[.03]">
                    <td className="px-4 py-4">
                      <p className="font-bold text-white">{d.userName}</p>
                      <p className="text-xs text-slate-400">{d.userEmail}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded bg-white/10 px-2 py-0.5 text-xs font-bold text-[#72d6bf]">
                        {d.method}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-[#72d6bf] text-base">{d.amountTnd.toFixed(3)} DT</td>
                    <td className="px-4 py-4 font-mono text-xs text-amber-300">{d.reference}</td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          d.status === "PAID"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : d.status === "PENDING"
                            ? "bg-amber-500/20 text-amber-300"
                            : "bg-rose-500/20 text-rose-300"
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-slate-400 font-mono">
                      {new Date(d.createdAt).toLocaleDateString("fr-TN")} {new Date(d.createdAt).toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" })}
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