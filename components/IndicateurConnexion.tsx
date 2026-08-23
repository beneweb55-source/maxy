"use client";

import { useOfflineSync } from "@/hooks/useOfflineSync";

export default function IndicateurConnexion() {
  const { estEnLigne, fileAttente } = useOfflineSync();

  if (estEnLigne && fileAttente === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 rounded-lg px-2 sm:px-3 py-1.5 text-xs font-medium transition-colors ${
      !estEnLigne ? "bg-brand-red/10 text-brand-red border border-brand-red/20" : "bg-brand-orange/10 text-brand-orange border border-brand-orange/20"
    }`}>
      {!estEnLigne ? (
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-brand-red opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-red"></span>
          </span>
          <span className="hidden sm:inline">Hors ligne</span>
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-orange opacity-75"></span>
            <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-orange"></span>
          </span>
          <span className="hidden sm:inline">Synchronisation...</span>
        </span>
      )}
      
      {fileAttente > 0 && (
        <span className="ml-1 rounded-full bg-black/5 px-1.5 py-0.5 text-[10px]">
          {fileAttente} <span className="hidden sm:inline">attente{fileAttente > 1 ? 's' : ''}</span>
        </span>
      )}
    </div>
  );
}
