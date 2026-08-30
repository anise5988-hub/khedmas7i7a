type AvailabilitySlot = { id: string; dayOfWeek: number; startTime: string; endTime: string };

const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export function AvailabilityWeekGrid({ availabilities }: { availabilities: AvailabilitySlot[] }) {
  const byDay: Record<number, AvailabilitySlot[]> = {};
  for (const slot of availabilities) {
    (byDay[slot.dayOfWeek] ??= []).push(slot);
  }

  return (
    <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
      {dayLabels.map((label, i) => {
        const slots = byDay[i] ?? [];
        const active = slots.length > 0;
        return (
          <div
            key={i}
            className={`rounded-xl border p-2 text-center ${
              active
                ? "border-[#72d6bf]/40 bg-[#e5f7f2] dark:bg-[#72d6bf]/15 dark:border-[#72d6bf]/30"
                : "border-slate-100 bg-slate-50 dark:bg-white/[.03] dark:border-white/10"
            }`}
          >
            <p className={`text-[10px] font-bold uppercase ${active ? "text-[#0d8d78] dark:text-[#72d6bf]" : "text-slate-400 dark:text-slate-500"}`}>
              {label}
            </p>
            <div className="mt-1 space-y-1">
              {active ? (
                slots.map((slot) => (
                  <p key={slot.id} className="text-[9px] sm:text-[10px] font-semibold text-[#11233f] dark:text-white leading-tight">
                    {slot.startTime}–{slot.endTime}
                  </p>
                ))
              ) : (
                <p className="text-[10px] text-slate-300 dark:text-slate-600">—</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
