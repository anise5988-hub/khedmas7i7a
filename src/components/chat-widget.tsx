"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { IconMessageSquare, IconX } from "@/components/icons";

/**
 * Bulle d'aide flottante, présente sur toutes les pages.
 *
 * Le composant reste volontairement minuscule : le panneau de tickets
 * (formulaire, fil de discussion, pièces jointes) est chargé à la demande
 * via `next/dynamic`, et l'appel à /api/auth/me n'est fait qu'à l'ouverture.
 * Un visiteur qui n'ouvre jamais l'aide ne paie donc ni le poids ni la
 * requête.
 */
const ChatWidgetPanel = dynamic(() => import("@/components/chat-widget-panel"), {
  ssr: false,
  loading: () => null,
});

export function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Une bulle « discutez avec nous » n'a rien à faire par-dessus l'interface
  // d'un cours en visio, ni dans la console admin qui a déjà ses écrans de
  // gestion des tickets.
  if (pathname?.startsWith("/classroom") || pathname?.startsWith("/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[60] flex flex-col items-end gap-3">
      {open && <ChatWidgetPanel onClose={() => setOpen(false)} />}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#0d8d78] text-white shadow-xl transition hover:bg-[#0b7866] hover:scale-105"
        aria-label={open ? "Fermer le chat" : "Ouvrir le chat"}
      >
        {open ? <IconX className="h-6 w-6" /> : <IconMessageSquare className="h-6 w-6" />}
      </button>
    </div>
  );
}
