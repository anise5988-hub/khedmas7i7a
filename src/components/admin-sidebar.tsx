"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconHome,
  IconUsers,
  IconUser,
  IconTeacher,
  IconShield,
  IconCalendar,
  IconVideo,
  IconStar,
  IconBookOpen,
  IconGraduationCap,
  IconFilter,
  IconEdit,
  IconMonitor,
  IconNewspaper,
  IconWallet,
  IconDollarSign,
  IconBarChart,
  IconCreditCard,
  IconTarget,
  IconSettings,
  IconSearch,
  IconMessageSquare,
  IconBell,
  IconFileText,
  IconX,
} from "@/components/icons";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Vue d'ensemble",
    items: [{ label: "Dashboard", href: "/admin", icon: IconHome }],
  },
  {
    label: "Utilisateurs",
    items: [
      { label: "Tous les utilisateurs", href: "/admin/users", icon: IconUsers },
      { label: "Élèves", href: "/admin/students", icon: IconUser },
      { label: "Professeurs", href: "/admin/teachers", icon: IconTeacher },
      { label: "Vérifications", href: "/admin/teacher-verifications", icon: IconShield },
    ],
  },
  {
    label: "Activité",
    items: [
      { label: "Réservations", href: "/admin/bookings", icon: IconCalendar },
      { label: "Classes en direct", href: "/admin/classes", icon: IconVideo },
      { label: "Avis", href: "/admin/reviews", icon: IconStar },
    ],
  },
  {
    label: "Contenu pédagogique",
    items: [
      { label: "Matières", href: "/admin/subjects", icon: IconBookOpen },
      { label: "Niveaux", href: "/admin/levels", icon: IconGraduationCap },
      { label: "Sections Bac", href: "/admin/sections", icon: IconFilter },
      { label: "Cursus", href: "/admin/education", icon: IconEdit },
      { label: "Contenu Homepage", href: "/admin/content", icon: IconMonitor },
      { label: "Actualités", href: "/admin/news", icon: IconNewspaper },
    ],
  },
  {
    label: "Finance",
    items: [
      { label: "Portefeuilles", href: "/admin/wallets", icon: IconWallet },
      { label: "Retraits", href: "/admin/withdrawals", icon: IconDollarSign },
      { label: "Transactions", href: "/admin/transactions", icon: IconBarChart },
      { label: "Paiements", href: "/admin/payments", icon: IconCreditCard },
      { label: "Coupons", href: "/admin/coupons", icon: IconTarget },
    ],
  },
  {
    label: "Système",
    items: [
      { label: "Paramètres", href: "/admin/settings", icon: IconSettings },
      { label: "SEO", href: "/admin/seo", icon: IconSearch },
      { label: "Support", href: "/admin/support", icon: IconMessageSquare },
      { label: "Notifications", href: "/admin/notifications", icon: IconBell },
      { label: "Journal d'activité", href: "/admin/logs", icon: IconFileText },
    ],
  },
];

export function AdminSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform bg-[#0a1322] border-r border-white/10 transition-transform duration-300 lg:translate-x-0 lg:static lg:z-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
            <Link href="/" className="flex items-center gap-2 font-[family-name:var(--font-dm-sans)] text-xl font-bold tracking-tight text-white">
              ProfySpace
              <span className="rounded-md bg-[#72d6bf] px-1.5 py-0.5 text-[10px] font-extrabold text-[#101b2d]">
                .admin
              </span>
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <IconX />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p className="mb-1.5 px-2 text-[11px] font-bold uppercase tracking-widest text-slate-500">
                  {group.label}
                </p>
                <ul className="space-y-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
                            active
                              ? "bg-[#72d6bf]/15 text-[#72d6bf]"
                              : "text-slate-400 hover:bg-white/5 hover:text-white"
                          }`}
                        >
                          <item.icon className="h-[18px] w-[18px] shrink-0" />
                          <span className="flex-1 truncate">{item.label}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>

          <div className="border-t border-white/10 px-4 py-4">
            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
            >
              <IconX className="h-[18px] w-[18px]" />
              <span>Quitter l&apos;admin</span>
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
