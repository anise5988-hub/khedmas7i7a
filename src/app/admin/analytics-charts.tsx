"use client";

type SeriesPoint = { date: string; value: number };
type CountRow = { subject?: string; status?: string; governorate?: string; count: number };

function SparkBar({ title, points, color, formatValue }: { title: string; points: SeriesPoint[]; color: string; formatValue?: (v: number) => string }) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const total = points.reduce((sum, p) => sum + p.value, 0);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-bold text-slate-200">{title}</h3>
        <span className="text-lg font-bold text-white">{formatValue ? formatValue(total) : total}</span>
      </div>
      <p className="text-[11px] text-slate-500">30 derniers jours</p>
      <div className="mt-4 flex h-20 items-end gap-[3px]">
        {points.map((p) => (
          <div
            key={p.date}
            className="flex-1 rounded-t-sm transition hover:opacity-80"
            style={{ height: `${Math.max(3, (p.value / max) * 100)}%`, backgroundColor: color }}
            title={`${p.date}: ${formatValue ? formatValue(p.value) : p.value}`}
          />
        ))}
      </div>
    </div>
  );
}

function DistributionList({ title, rows, labelKey, colorFor }: { title: string; rows: CountRow[]; labelKey: "subject" | "status" | "governorate"; colorFor?: (label: string) => string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[.04] p-5">
      <h3 className="text-sm font-bold text-slate-200">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-4 text-xs text-slate-500">Pas encore de données.</p>
      ) : (
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => {
            const label = r[labelKey] as string;
            return (
              <div key={label}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300">{label}</span>
                  <span className="font-bold text-white">{r.count}</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-white/5">
                  <div
                    className="h-1.5 rounded-full"
                    style={{ width: `${(r.count / max) * 100}%`, backgroundColor: colorFor ? colorFor(label) : "#72d6bf" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#f59e0b",
  CONFIRMED: "#0d8d78",
  COMPLETED: "#72d6bf",
  CANCELLED: "#f43f5e",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: "En attente",
  CONFIRMED: "Confirmée",
  COMPLETED: "Terminée",
  CANCELLED: "Annulée",
};

export function AnalyticsCharts({
  registrationsByDay,
  bookingsByDay,
  revenueTndByDay,
  popularSubjects,
  bookingStatusDistribution,
  teachersByGovernorate,
}: {
  registrationsByDay: SeriesPoint[];
  bookingsByDay: SeriesPoint[];
  revenueTndByDay: SeriesPoint[];
  popularSubjects: { subject: string; count: number }[];
  bookingStatusDistribution: { status: string; count: number }[];
  teachersByGovernorate: { governorate: string; count: number }[];
}) {
  const statusRows = bookingStatusDistribution.map((r) => ({ status: STATUS_LABELS[r.status] ?? r.status, count: r.count, _raw: r.status }));

  return (
    <div className="mt-8 space-y-4">
      <div>
        <h2 className="text-xl font-bold">Évolution</h2>
        <p className="text-sm text-slate-400">Activité réelle de la plateforme sur les 30 derniers jours.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <SparkBar title="Nouvelles inscriptions" points={registrationsByDay} color="#72d6bf" />
        <SparkBar title="Réservations" points={bookingsByDay} color="#0d8d78" />
        <SparkBar title="Revenus (recharges validées)" points={revenueTndByDay} color="#f59e0b" formatValue={(v) => `${v.toFixed(0)} DT`} />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <DistributionList title="Matières les plus enseignées" rows={popularSubjects} labelKey="subject" />
        <DistributionList
          title="Statut des réservations"
          rows={statusRows.map((r) => ({ status: r.status, count: r.count }))}
          labelKey="status"
          colorFor={(label) => {
            const raw = statusRows.find((r) => r.status === label)?._raw;
            return (raw && STATUS_COLORS[raw]) || "#72d6bf";
          }}
        />
        <DistributionList title="Professeurs par gouvernorat" rows={teachersByGovernorate} labelKey="governorate" />
      </div>
    </div>
  );
}
