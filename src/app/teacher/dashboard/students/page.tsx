/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { SiteNavbar } from "@/components/site-navbar";
import { IconUser } from "@/components/icons";

type StudentInfo = {
  id: string;
  name: string;
  email: string;
  phone: string;
  lastSession: string;
  totalSessions: number;
};

export default function TeacherStudentsPage() {
  const [students, setStudents] = useState<StudentInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.teacher?.bookings) {
          const studentMap = new Map<string, StudentInfo>();
          data.teacher.bookings.forEach((b: any) => {
            const studentId = b.student.email;
            const existing = studentMap.get(studentId);
            if (existing) {
              existing.totalSessions += 1;
            } else {
              studentMap.set(studentId, {
                id: b.student.id || studentId,
                name: `${b.student.firstName} ${b.student.lastName}`,
                email: b.student.email,
                phone: b.student.phone || "—",
                lastSession: b.startsAt,
                totalSessions: 1,
              });
            }
          });
          setStudents(Array.from(studentMap.values()));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#f8fafc] text-[#11233f] dark:bg-[#0c1626] dark:text-white">
      <SiteNavbar dark={false} />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-3xl font-bold dark:text-white">Mes Élèves ({students.length})</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Liste des élèves ayant réservé au moins une séance de cours avec vous.
        </p>

        {loading ? (
          <div className="py-20 text-center text-slate-400 dark:text-slate-500">Chargement des élèves...</div>
        ) : students.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3 dark:bg-white/10 dark:text-slate-400">
              <IconUser className="h-7 w-7" />
            </div>
            <h2 className="mt-3 text-lg font-bold dark:text-white">Aucun élève pour le moment.</h2>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Vos futurs élèves apparaîtront ici dès leurs premières réservations.
            </p>
          </div>
        ) : (
          <div className="mt-6 divide-y divide-slate-100 dark:divide-white/10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[.05] dark:shadow-xl">
            {students.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
                <div>
                  <h3 className="font-bold text-base dark:text-white">{s.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400"> {s.email} · {s.phone}</p>
                </div>
                <div className="text-right text-xs text-slate-400 dark:text-slate-500">
                  <span className="rounded-full bg-[#e5f7f2] text-[#0d8d78] px-3 py-1 font-bold dark:bg-[#72d6bf]/15 dark:text-[#72d6bf]">
                    {s.totalSessions} séance{s.totalSessions > 1 ? "s" : ""}
                  </span>
                  <p className="mt-1">Dernier cours : {new Date(s.lastSession).toLocaleDateString("fr-TN")}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
