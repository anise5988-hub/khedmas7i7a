"use client";

import { useEffect, useState } from "react";
import { subjects as fallbackSubjects } from "@/lib/domain/catalog";

export type CatalogSubjectOption = {
  id: string | null;
  name: string;
  cycle?: string | null;
  section?: string | null;
};

/**
 * Loads the active subject catalogue maintained by the admin back-office.
 *
 * The static domain list is only a fallback for the first paint / offline case,
 * so a subject added in admin shows up in teacher forms without a redeploy.
 */
export function useSubjectCatalog(): CatalogSubjectOption[] {
  const [options, setOptions] = useState<CatalogSubjectOption[]>(
    fallbackSubjects.map((name) => ({ id: null, name, cycle: null, section: null })),
  );

  useEffect(() => {
    let cancelled = false;

    fetch("/api/subjects")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        const list = Array.isArray(data?.subjects) ? data.subjects : [];
        const names = list
          .map((s: { name?: unknown }) => (typeof s?.name === "string" ? s.name.trim() : ""))
          .filter(Boolean);
        if (names.length === 0) return;
        setOptions(list.filter((s: { name?: unknown }) => typeof s?.name === "string"));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return options;
}