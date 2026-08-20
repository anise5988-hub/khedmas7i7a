import { PageShell } from "@/components/page-shell";

export function WorkspacePage({ eyebrow, title, description, items }: { eyebrow: string; title: string; description: string; items: string[] }) {
  return <PageShell eyebrow={eyebrow} title={title} description={description}><section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <div key={item} className="rounded-2xl border border-slate-200 bg-white p-6"><span className="text-2xl text-[#0d8d78]">✦</span><h2 className="mt-5 text-lg font-bold">{item}</h2><p className="mt-2 text-sm leading-6 text-slate-500">Cette section sera alimentée par ton compte et tes données sécurisées.</p></div>)}</div></section></PageShell>;
}
