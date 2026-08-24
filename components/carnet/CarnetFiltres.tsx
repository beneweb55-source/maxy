"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";
import { IconeRecherche } from "@/components/icons";

const CATEGORIES = [
  "developpement", "inventaire", "caisse", "tests", 
  "maintenance", "ui_ux", "reseau", "materiel", 
  "administration", "recherche", "correction", "autre"
];

const PERIODES = [
  { id: "aujourdhui", label: "Aujourd'hui" },
  { id: "semaine", label: "Cette semaine" },
  { id: "mois", label: "Ce mois" }
];

export function CarnetFiltres({ utilisateurs }: { utilisateurs: { id: number, username: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [q, setQ] = useState(searchParams.get("q") || "");
  const [auteur, setAuteur] = useState(searchParams.get("auteur") || "");
  const [categorie, setCategorie] = useState(searchParams.get("categorie") || "");
  const [periode, setPeriode] = useState(searchParams.get("periode") || "");

  const handleFilter = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (q) params.set("q", q);
    else params.delete("q");

    if (auteur) params.set("auteur", auteur);
    else params.delete("auteur");

    if (categorie) params.set("categorie", categorie);
    else params.delete("categorie");

    if (periode) params.set("periode", periode);
    else params.delete("periode");

    router.push(pathname + "?" + params.toString());
  }, [q, auteur, categorie, periode, pathname, router, searchParams]);

  // Handle immediate change (debounce pour la recherche)
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleFilter();
    }, 300);
    return () => clearTimeout(timeout);
  }, [q, auteur, categorie, periode]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="bg-brand-white border border-brand-light-grey/50 p-4 rounded-xl shadow-sm mb-6 flex flex-col gap-4">
      {/* Recherche texte */}
      <div className="relative">
        <IconeRecherche className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey" />
        <input 
          type="text"
          placeholder="Rechercher un rapport, un mot-clé..."
          className="champ pl-9 w-full"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select 
          className="champ py-2 text-sm cursor-pointer"
          value={auteur}
          onChange={(e) => setAuteur(e.target.value)}
        >
          <option value="">Tous les auteurs</option>
          {utilisateurs.map(u => (
            <option key={u.id} value={u.id}>{u.username}</option>
          ))}
        </select>

        <select 
          className="champ py-2 text-sm cursor-pointer capitalize"
          value={categorie}
          onChange={(e) => setCategorie(e.target.value)}
        >
          <option value="">Toutes catégories</option>
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
          ))}
        </select>

        <select 
          className="champ py-2 text-sm cursor-pointer"
          value={periode}
          onChange={(e) => setPeriode(e.target.value)}
        >
          <option value="">Toute période</option>
          {PERIODES.map(p => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>
      </div>

      {(q || auteur || categorie || periode) && (
        <div className="flex justify-end">
          <button 
            type="button"
            onClick={() => {
              setQ("");
              setAuteur("");
              setCategorie("");
              setPeriode("");
            }}
            className="text-xs font-medium text-brand-grey hover:text-brand-orange transition-colors"
          >
            Réinitialiser
          </button>
        </div>
      )}
    </div>
  );
}
