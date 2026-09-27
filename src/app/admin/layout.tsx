"use client";

import { useState } from "react";
import { AdminSidebar } from "@/components/admin-sidebar";
import { IconMenu } from "@/components/icons";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#101b2d] text-white">
      <AdminSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col min-w-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-30 rounded-xl bg-[#0a1322] border border-white/10 p-2.5 text-slate-300 shadow-lg transition hover:bg-white/10 hover:text-white lg:hidden"
          aria-label="Ouvrir le menu"
        >
          <IconMenu />
        </button>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
