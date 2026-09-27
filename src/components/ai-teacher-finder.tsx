"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { IconSparkles } from "@/components/icons";

/**
 * Déclencheur de l'assistant IA.
 *
 * Ce composant est monté sur toutes les pages : il ne doit donc contenir que
 * le minimum. Le panneau de conversation (cartes de professeurs, images,
 * logique de chat) vit dans `ai-teacher-finder-panel` et n'est téléchargé
 * qu'au premier clic — voir `next/dynamic` ci-dessous.
 */
const AiTeacherFinderPanel = dynamic(() => import("@/components/ai-teacher-finder-panel"), {
  ssr: false,
  // Pas de squelette : le panneau s'ouvre en fondu, un flash de chargement
  // serait plus visible que le délai lui-même.
  loading: () => null,
});

export function AiTeacherFinder() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  // Le bouton était en position fixe et chevauchait la rangée de statistiques
  // juste sous le hero. On ne le révèle qu'une fois cette zone dépassée.
  // Le calcul est fait dans un `requestAnimationFrame` : le handler de scroll
  // ne fait donc plus de mise en page synchrone à chaque événement, ce qui
  // évite les micro-saccades pendant le défilement sur mobile.
  useEffect(() => {
    let frame = 0;
    function onScroll() {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        setVisible(window.scrollY > 260);
      });
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  // Hors de ces contextes, personne ne cherche un professeur à réserver :
  // la salle de cours, la console admin et l'espace enseignant.
  if (pathname?.startsWith("/classroom") || pathname?.startsWith("/admin") || pathname?.startsWith("/teacher")) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 left-5 z-[59] flex items-center gap-2 rounded-full bg-gradient-to-r from-[#0d8d78] to-[#11233f] pl-4 pr-5 py-3.5 text-white shadow-2xl shadow-[#0d8d78]/30 ring-1 ring-white/10 transition-all duration-300 hover:scale-105 hover:shadow-[#0d8d78]/50 active:scale-95 ${
          visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0"
        }`}
        aria-label="Trouver mon professeur avec l'IA"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15">
          <IconSparkles className="h-4 w-4 text-[#72d6bf]" />
        </span>
        <span className="hidden text-sm font-bold sm:inline">Trouver mon Prof avec IA</span>
        <span className="text-sm font-bold sm:hidden">IA Prof</span>
      </button>

      {open && <AiTeacherFinderPanel onClose={() => setOpen(false)} />}
    </>
  );
}
