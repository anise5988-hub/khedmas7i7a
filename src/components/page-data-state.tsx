"use client";

import { IconAlertCircle, IconSearch, IconBookOpen } from "@/components/icons";

type DataStateProps = {
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  onRetry?: () => void;
  loadingText?: string;
  children?: React.ReactNode;
};

export function PageDataState({
  loading,
  error,
  empty,
  emptyTitle = "Aucune donnée disponible",
  emptyDescription,
  onRetry,
  loadingText = "Chargement...",
  children,
}: DataStateProps) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#0d8d78] border-t-transparent" />
        <p className="text-sm text-slate-500">{loadingText}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
          <IconAlertCircle className="h-5 w-5 text-rose-600" />
        </div>
        <p className="mt-3 text-sm font-semibold text-rose-800">Erreur de chargement</p>
        <p className="mt-1 text-sm text-rose-600">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 rounded-xl bg-rose-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-rose-700"
          >
            Réessayer
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    const EmptyIcon = emptyDescription?.toLowerCase().includes("recherche") || emptyDescription?.toLowerCase().includes("filtre")
      ? IconSearch
      : IconBookOpen;

    return (
      <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100">
          <EmptyIcon className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-700">{emptyTitle}</p>
        {emptyDescription && <p className="text-sm text-slate-500">{emptyDescription}</p>}
      </div>
    );
  }

  return <>{children}</>;
}
