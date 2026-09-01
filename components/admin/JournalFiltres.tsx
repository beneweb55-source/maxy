"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

export function JournalFiltres({ 
  utilisateurs, 
  actions 
}: { 
  utilisateurs: { id: number, username: string, role: string }[],
  actions: { id: string, label: string }[]
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [userId, setUserId] = useState(searchParams.get("user") || "");
  const [actionId, setActionId] = useState(searchParams.get("action") || "");

  const handleFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (userId) {
      params.set("user", userId);
    } else {
      params.delete("user");
    }

    if (actionId) {
      params.set("action", actionId);
    } else {
      params.delete("action");
    }

    router.push(pathname + "?" + params.toString());
  }, [userId, actionId, pathname, router, searchParams]);

  // Handle immediate change
  useEffect(() => {
    handleFilter();
  }, [userId, actionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center bg-brand-paper p-4 rounded-xl border border-brand-light-grey/50 shadow-sm mb-4">
      <div className="flex flex-col flex-1 sm:flex-initial">
        <label className="libelle mb-1">Filtrer par utilisateur</label>
        <select 
          className="champ min-h-[48px] text-base w-full sm:max-w-[200px] cursor-pointer"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        >
          <option value="">Tous les utilisateurs</option>
          {utilisateurs.map(u => (
            <option key={u.id} value={u.id}>{u.username} ({u.role})</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col flex-1 sm:flex-initial">
        <label className="libelle mb-1">Filtrer par type d'action</label>
        <select 
          className="champ min-h-[48px] text-base w-full sm:max-w-[220px] cursor-pointer"
          value={actionId}
          onChange={(e) => setActionId(e.target.value)}
        >
          <option value="">Toutes les actions</option>
          {actions.map(a => (
            <option key={a.id} value={a.id}>{a.label}</option>
          ))}
        </select>
      </div>

      <div className="flex sm:ml-auto items-end h-full mt-4 sm:mt-0">
        {(userId || actionId) && (
          <button 
            type="button"
            onClick={() => {
              setUserId("");
              setActionId("");
            }}
            className="min-h-[40px] px-3 py-1.5 text-xs font-bold text-brand-warm-grey hover:text-brand-orange transition-colors flex items-center"
          >
            Réinitialiser les filtres
          </button>
        )}
      </div>
    </div>
  );
}
