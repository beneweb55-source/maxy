"use client";

import React, { useState, useEffect } from "react";
import { 
  FolderTree, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  RefreshCw, 
  Filter,
  ArrowUpDown,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  SlidersHorizontal,
  PackageCheck
} from "lucide-react";
import Link from "next/link";

interface AuditCategory {
  id: number;
  nom: string;
  niveau: 1 | 2 | 3;
  chemin_complet: string;
  famille_nom: string;
  parent_id: number | null;
  parent_nom: string | null;
  produits_count: number;
  modeles_count: number;
  enfants_count: number;
  statut: "vide" | "optimal" | "charge" | "surpeuple";
}

interface AuditData {
  resume: {
    total: number;
    vides: number;
    optimales: number;
    chargees: number;
    surpeuplees: number;
  };
  categories: AuditCategory[];
}

export default function PageAuditCategories() {
  const [data, setData] = useState<AuditData | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Filtres
  const [q, setQ] = useState("");
  const [filtreStatut, setFiltreStatut] = useState<string>("tous");
  const [filtreNiveau, setFiltreNiveau] = useState<number | "tous">("tous");

  const chargerAudit = async () => {
    setLoading(true);
    setErreur(null);
    try {
      const res = await fetch("/api/admin/audit-categories");
      if (!res.ok) throw new Error("Erreur de chargement de l'audit");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setErreur(err.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void chargerAudit();
  }, []);

  const categoriesFiltrees = (data?.categories || []).filter((c) => {
    if (filtreStatut !== "tous" && c.statut !== filtreStatut) return false;
    if (filtreNiveau !== "tous" && c.niveau !== filtreNiveau) return false;
    if (!q.trim()) return true;
    const qLower = q.toLowerCase();
    return (
      c.nom.toLowerCase().includes(qLower) ||
      c.chemin_complet.toLowerCase().includes(qLower) ||
      String(c.id).includes(qLower)
    );
  });

  return (
    <div className="min-h-screen bg-brand-bg dark:bg-brand-black text-brand-black dark:text-white p-4 sm:p-8 space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-brand-light-grey/60 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-black text-brand-orange uppercase tracking-wider mb-1">
            <FolderTree className="w-4 h-4" /> Administration & Diagnostic Stock
          </div>
          <h1 className="text-xl sm:text-2xl font-black font-outfit text-brand-black dark:text-white">
            Audit de l'Arborescence & Densité des Catégories
          </h1>
          <p className="text-xs text-brand-warm-grey">
            Vue à plat de toutes les familles, catégories et sous-types avec compteurs réels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={chargerAudit}
            disabled={loading}
            className="btn btn-secondaire text-xs py-2.5 px-4 rounded-xl font-bold flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Actualiser
          </button>

          <Link
            href="/inventaire"
            className="btn btn-primaire text-xs py-2.5 px-4 rounded-xl font-black shadow-xs flex items-center gap-2"
          >
            Retour à l'inventaire
          </Link>
        </div>
      </div>

      {/* Résumé KPIs */}
      {data?.resume && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
          
          <div 
            onClick={() => setFiltreStatut("tous")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filtreStatut === "tous" 
                ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-md" 
                : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10 hover:border-brand-orange/60"
            }`}
          >
            <span className="text-[11px] font-extrabold uppercase opacity-70">Total Catégories</span>
            <div className="text-2xl font-black font-outfit mt-1">{data.resume.total}</div>
          </div>

          <div 
            onClick={() => setFiltreStatut("vide")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filtreStatut === "vide" 
                ? "bg-red-600 text-white border-red-600 shadow-md" 
                : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10 hover:border-red-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-red-500">Vides (0 produit)</span>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-2xl font-black font-outfit mt-1 text-red-500">{data.resume.vides}</div>
          </div>

          <div 
            onClick={() => setFiltreStatut("optimal")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filtreStatut === "optimal" 
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md" 
                : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10 hover:border-emerald-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-emerald-500">Optimales (1-50)</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black font-outfit mt-1 text-emerald-500">{data.resume.optimales}</div>
          </div>

          <div 
            onClick={() => setFiltreStatut("charge")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filtreStatut === "charge" 
                ? "bg-amber-600 text-white border-amber-600 shadow-md" 
                : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10 hover:border-amber-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-amber-500">Chargées (51-100)</span>
              <TrendingUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-outfit mt-1 text-amber-500">{data.resume.chargees}</div>
          </div>

          <div 
            onClick={() => setFiltreStatut("surpeuple")}
            className={`p-4 rounded-2xl border transition-all cursor-pointer ${
              filtreStatut === "surpeuple" 
                ? "bg-purple-600 text-white border-purple-600 shadow-md" 
                : "bg-white dark:bg-brand-paper border-brand-light-grey/60 dark:border-white/10 hover:border-purple-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-extrabold uppercase text-purple-500">Surpeuplées (&gt;100)</span>
              <SlidersHorizontal className="w-4 h-4 text-purple-500" />
            </div>
            <div className="text-2xl font-black font-outfit mt-1 text-purple-500">{data.resume.surpeuplees}</div>
          </div>

        </div>
      )}

      {/* Barre de Recherche et Filtres */}
      <div className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-white dark:bg-brand-paper rounded-2xl border border-brand-light-grey/60 dark:border-white/10">
        
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-brand-warm-grey absolute left-3.5 top-3" />
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher par nom, chemin ou ID..."
            className="input w-full pl-10 rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 font-bold text-xs h-10"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          
          <select
            value={filtreNiveau}
            onChange={(e) => setFiltreNiveau(e.target.value === "tous" ? "tous" : Number(e.target.value))}
            className="select select-sm rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 font-bold text-xs h-10"
          >
            <option value="tous">Tous les niveaux</option>
            <option value={1}>Niveau 1 (Familles)</option>
            <option value={2}>Niveau 2 (Catégories)</option>
            <option value={3}>Niveau 3 (Sous-catégories)</option>
          </select>

          <select
            value={filtreStatut}
            onChange={(e) => setFiltreStatut(e.target.value)}
            className="select select-sm rounded-xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 font-bold text-xs h-10"
          >
            <option value="tous">Tous les statuts</option>
            <option value="vide">Vides (0)</option>
            <option value="optimal">Optimales (1-50)</option>
            <option value="charge">Chargées (51-100)</option>
            <option value="surpeuple">Surpeuplées (&gt;100)</option>
          </select>

        </div>

      </div>

      {/* Tableau Plat */}
      <div className="bg-white dark:bg-brand-paper rounded-2xl border border-brand-light-grey/60 dark:border-white/10 overflow-hidden shadow-xs">
        
        {loading ? (
          <div className="p-12 text-center text-brand-warm-grey text-sm font-bold animate-pulse">
            Chargement de la cartographie des catégories...
          </div>
        ) : erreur ? (
          <div className="p-8 text-center text-danger text-sm font-bold">
            {erreur}
          </div>
        ) : categoriesFiltrees.length === 0 ? (
          <div className="p-12 text-center text-brand-warm-grey text-sm">
            Aucune catégorie ne correspond aux filtres actuels.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/20 dark:bg-white/5 text-brand-warm-grey font-black uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">ID</th>
                  <th className="py-3 px-4">Niveau</th>
                  <th className="py-3 px-4">Arborescence & Nom</th>
                  <th className="py-3 px-4 text-center">Sous-types</th>
                  <th className="py-3 px-4 text-center">Modèles</th>
                  <th className="py-3 px-4 text-center">Stock Produits</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-grey/30 dark:divide-white/5 font-medium">
                {categoriesFiltrees.map((c) => {
                  return (
                    <tr 
                      key={c.id}
                      className="hover:bg-brand-light-grey/15 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-brand-warm-grey">
                        #{c.id}
                      </td>

                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                          c.niveau === 1 
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                            : c.niveau === 2
                            ? "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300"
                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                        }`}>
                          Niv. {c.niveau}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-extrabold text-brand-black dark:text-white">
                          {c.nom}
                        </div>
                        <div className="text-[11px] text-brand-warm-grey mt-0.5">
                          {c.chemin_complet}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-brand-warm-grey">
                        {c.enfants_count}
                      </td>

                      <td className="py-3 px-4 text-center font-bold text-brand-black dark:text-white">
                        {c.modeles_count}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-xl font-black text-xs ${
                          c.produits_count === 0
                            ? "bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400"
                            : c.produits_count > 100
                            ? "bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400"
                            : "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
                        }`}>
                          {c.produits_count}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-center">
                        {c.statut === "vide" && (
                          <span className="text-[11px] font-bold text-red-500">Vide (Masquée)</span>
                        )}
                        {c.statut === "optimal" && (
                          <span className="text-[11px] font-bold text-emerald-500">Optimal</span>
                        )}
                        {c.statut === "charge" && (
                          <span className="text-[11px] font-bold text-amber-500">Chargé</span>
                        )}
                        {c.statut === "surpeuple" && (
                          <span className="text-[11px] font-bold text-purple-500">Surpeuplé</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {c.produits_count > 0 && (
                          <Link
                            href={`/inventaire?vue=tableau&${c.niveau === 1 ? `famille_id=${c.id}` : c.niveau === 2 ? `categorie_id=${c.id}` : `sous_categorie_id=${c.id}`}`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange hover:underline"
                          >
                            Voir <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
}
