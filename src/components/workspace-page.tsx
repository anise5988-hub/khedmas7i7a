import { PageShell } from "@/components/page-shell";
import { IconSparkles } from "@/components/icons";

export function WorkspacePage({ eyebrow, title, description, items }: { eyebrow: string; title: string; description: string; items: string[] }) {
  return (
    <PageShell eyebrow={eyebrow} title={title} description={description}>
      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#e5f7f2] text-[#0d8d78]">
                <IconSparkles className="h-5 w-5" />
              </div>
              <h2 className="mt-4 text-base font-bold text-[#11233f]">{item}</h2>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Cette section est connectée à votre compte et à vos données sécurisées Profy.
              </p>
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
