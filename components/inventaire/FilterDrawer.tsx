"use client";

import React from "react";
import { 
  Filter, 
  X, 
  RotateCcw, 
  Cpu, 
  HardDrive, 
  Monitor, 
  ShieldCheck, 
  Eye, 
  Archive, 
  Layers, 
  Tag, 
  Calendar,
  Check,
  Zap,
  Tv,
  Printer,
  Package,
  Server,
  Sparkles
} from "lucide-react";
import { INFOS_STATUT, STATUTS_PRODUIT } from "@/lib/statuts";
import type { StatutProduit } from "@prisma/client";
import { 
  MATRICE_EQUIPEMENTS, 
  determinerProfilEquipement,
  type ProfilEquipement 
} from "@/lib/matrice-specifications";

export interface FilterDrawerProps {
  ouvert: boolean;
  onFermer: () => void;
  searchParams: { get: (k: string) => string | null };
  majUrl: (modifs: Record<string, string | null>) => void;
  lotsDisponibles?: { id: number; libelle: string }[];
  familleNom?: string;
  categorieNom?: string;
}

export default function FilterDrawer({
  ouvert,
  onFermer,
  searchParams,
  majUrl,
  lotsDisponibles = [],
  familleNom = "",
  categorieNom = "",
}: FilterDrawerProps) {
  // Détection contextuelle du profil d'équipement selon la matrice métier
  const profil = determinerProfilEquipement(categorieNom, familleNom);

  // Filtres universels actifs
  const statutsActifs = (searchParams.get("statuts") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StatutProduit => Boolean(s));

  const gradesActifs = (searchParams.get("grade") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const emplacementActif = searchParams.get("emplacement") ?? "";
  const lotActif = searchParams.get("lot") ?? "";
  const sansLotActif = searchParams.get("sans_lot") === "1";
  const aTariferActif = searchParams.get("a_tarifer") === "1";
  const plus30jActif = searchParams.get("plus30j") === "1";

  // Toggle helper pour filtres multi-valeurs (statuts)
  const basculerStatut = (statut: StatutProduit) => {
    let nouveaux: StatutProduit[];
    if (statutsActifs.includes(statut)) {
      nouveaux = statutsActifs.filter((s) => s !== statut);
    } else {
      nouveaux = [...statutsActifs, statut];
    }
    majUrl({ statuts: nouveaux.length > 0 ? nouveaux.join(",") : null, page: "1" });
  };

  const basculerGrade = (grade: string) => {
    let nouveaux: string[];
    if (gradesActifs.includes(grade)) {
      nouveaux = gradesActifs.filter((g) => g !== grade);
    } else {
      nouveaux = [...gradesActifs, grade];
    }
    majUrl({ grade: nouveaux.length > 0 ? nouveaux.join(",") : null, page: "1" });
  };

  const reinitialiserTout = () => {
    const modifs: Record<string, string | null> = {
      statuts: null,
      grade: null,
      emplacement: null,
      lot: null,
      sans_lot: null,
      a_tarifer: null,
      plus30j: null,
      page: "1",
    };

    // Réinitialiser également tous les attributs de la matrice
    const tousChamps = [
      "marque", "format", "cpu", "ram", "stockage", "format_cible", "type_specifique",
      "generation", "frequence_mhz", "type_disque", "interface", "format_physique",
      "capacite", "capacite_disque", "taille_ecran", "taille_pouces", "resolution",
      "frequence_hz", "type_dalle", "puissance_w", "type_connecteur", "fondeur",
      "gamme", "vram_taille", "type_consommable", "couleur", "technologie", "format_serveur",
      "cpu_gamme", "cpu_generation", "ram_taille", "stockage_principal", "taille_ecran_aio",
      "clavier_layout", "generation_serveur"
    ];

    for (const champ of tousChamps) {
      modifs[champ] = null;
    }

    majUrl(modifs);
  };

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-entree-rapide">
      {/* Overlay Backdrop cliquable */}
      <div className="absolute inset-0" onClick={onFermer} />

      {/* Panneau latéral coulissant (Drawer) */}
      <div className="relative w-full max-w-md bg-white dark:bg-brand-paper shadow-2xl h-full flex flex-col border-l border-brand-light-grey/60 dark:border-white/10 z-10">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base font-outfit text-brand-black dark:text-white">
                Filtres & Spécifications POS
              </h2>
              <p className="text-[11px] text-brand-warm-grey">
                {profil ? `Affinement intelligent : ${profil.familleNom}` : "Sélection tactile par puces contextuelles"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reinitialiserTout}
              className="text-xs font-bold text-brand-warm-grey hover:text-danger flex items-center gap-1 p-1.5 rounded-lg hover:bg-brand-light-grey/30 transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onFermer}
              className="p-1.5 text-brand-warm-grey hover:text-brand-black dark:hover:text-white rounded-lg hover:bg-brand-light-grey/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps des filtres avec défilement fluide */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* 1. FACETTES TECHNIQUES DYNAMIQUES DE LA MATRICE */}
          {profil && (
            <div className="space-y-5 p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20">
              <div className="flex items-center justify-between pb-2 border-b border-brand-orange/15">
                <div className="flex items-center gap-2 text-xs font-black text-brand-orange uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Spécifications : {categorieNom || profil.familleNom}
                </div>
              </div>

              {profil.attributs
                .filter((attr) => attr.filtre && attr.options && attr.options.length > 0)
                .map((attr) => {
                  const valeurActive = searchParams.get(attr.cle) ?? "";

                  return (
                    <div key={attr.cle} className="space-y-1.5">
                      <label className="block text-[11px] font-bold text-brand-black dark:text-white uppercase tracking-wider">
                        {attr.label}
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {attr.options?.map((opt) => {
                          const actif = valeurActive === opt.valeur;
                          return (
                            <button
                              key={opt.valeur}
                              type="button"
                              onClick={() => majUrl({ [attr.cle]: actif ? null : opt.valeur, page: "1" })}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                                actif
                                  ? "bg-brand-orange text-white shadow-xs"
                                  : "bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 text-brand-black dark:text-white hover:border-brand-orange/60"
                              }`}
                            >
                              {opt.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Si aucun profil spécifique n'est actif, afficher les facettes de base matériel */}
          {!profil && (
            <div className="space-y-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                <Cpu className="w-4 h-4" /> Spécifications Générales
              </div>

              {/* Processeurs */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Famille CPU</label>
                <div className="flex flex-wrap gap-1.5">
                  {["i3", "i5", "i7", "i9", "Ryzen 5", "Ryzen 7", "Xeon"].map((val) => {
                    const actif = searchParams.get("cpu") === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ cpu: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          actif
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-blue-200 dark:border-blue-900 text-brand-black dark:text-white hover:border-blue-400"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* RAM */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Mémoire RAM</label>
                <div className="flex flex-wrap gap-1.5">
                  {["8", "16", "32", "64", "128"].map((val) => {
                    const actif = searchParams.get("ram") === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ ram: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          actif
                            ? "bg-blue-600 text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-blue-200 dark:border-blue-900 text-brand-black dark:text-white hover:border-blue-400"
                        }`}
                      >
                        {val} Go
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* 2. STATUT COMMERCIAL DU STOCK */}
          <div>
            <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
              Statut du stock
            </label>
            <div className="flex flex-wrap gap-2">
              {STATUTS_PRODUIT.map((s) => {
                const actif = statutsActifs.includes(s);
                const info = INFOS_STATUT[s];
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => basculerStatut(s)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      actif
                        ? `${info.badge} border-current shadow-xs`
                        : "bg-white dark:bg-brand-paper text-brand-warm-grey border-brand-light-grey/80 dark:border-white/10 hover:border-brand-black dark:hover:border-white"
                    }`}
                  >
                    {actif && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{info.libelle}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. GRADE PHYSIQUE / COSMÉTIQUE */}
          <div>
            <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
              État & Grade Cosmétique
            </label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: "Neuf", label: "Neuf / Emballé" },
                { id: "Grade A+", label: "Grade A+ (Impeccable)" },
                { id: "Grade A", label: "Grade A (Très bon état)" },
                { id: "Grade B", label: "Grade B (Traces d'usage)" },
                { id: "Grade C", label: "Grade C (Abîmé / Rayé)" },
                { id: "Pour pièces", label: "Pour pièces / HS" },
              ].map((g) => {
                const actif = gradesActifs.includes(g.id);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => basculerGrade(g.id)}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-95 ${
                      actif
                        ? "bg-brand-orange/15 text-brand-orange border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper text-brand-warm-grey border-brand-light-grey/80 dark:border-white/10 hover:border-brand-orange/40"
                    }`}
                  >
                    <span>{g.label}</span>
                    {actif && <Check className="w-3.5 h-3.5 text-brand-orange" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 4. EMPLACEMENT PHYSIQUE */}
          <div>
            <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
              Emplacement physique
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => majUrl({ emplacement: emplacementActif === "vitrine" ? null : "vitrine", page: "1" })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  emplacementActif === "vitrine"
                    ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                }`}
              >
                <Eye className="w-4 h-4" /> En Vitrine / Magasin
              </button>

              <button
                type="button"
                onClick={() => majUrl({ emplacement: emplacementActif === "reserve" ? null : "reserve", page: "1" })}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-all ${
                  emplacementActif === "reserve"
                    ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                }`}
              >
                <Archive className="w-4 h-4" /> En Réserve / Stock
              </button>
            </div>
          </div>

          {/* 5. FILTRES OPÉRATIONNELS RAPIDES */}
          <div>
            <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
              Filtres Opérationnels
            </label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => majUrl({ a_tarifer: aTariferActif ? null : "1", page: "1" })}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all ${
                  aTariferActif
                    ? "bg-amber-500/15 border-amber-500 text-amber-700 dark:text-amber-300 font-extrabold"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-amber-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-amber-500" />
                  <span>Articles à tarifer (sans prix fixé)</span>
                </div>
                {aTariferActif && <Check className="w-4 h-4 text-amber-500" />}
              </button>

              <button
                type="button"
                onClick={() => majUrl({ plus30j: plus30jActif ? null : "1", page: "1" })}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all ${
                  plus30jActif
                    ? "bg-red-500/15 border-red-500 text-red-700 dark:text-red-300 font-extrabold"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-red-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-red-500" />
                  <span>Stock dormant (&gt; 30 jours en rayon)</span>
                </div>
                {plus30jActif && <Check className="w-4 h-4 text-red-500" />}
              </button>

              <button
                type="button"
                onClick={() => majUrl({ sans_lot: sansLotActif ? null : "1", page: "1" })}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all ${
                  sansLotActif
                    ? "bg-indigo-500/15 border-indigo-500 text-indigo-700 dark:text-indigo-300 font-extrabold"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-indigo-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-indigo-500" />
                  <span>Articles hors-lot (Arrivage unitaire)</span>
                </div>
                {sansLotActif && <Check className="w-4 h-4 text-indigo-500" />}
              </button>
            </div>
          </div>

          {/* 6. FILTRER PAR LOT D'ARRIVAGE */}
          {lotsDisponibles.length > 0 && (
            <div>
              <label className="block text-xs font-extrabold text-brand-black dark:text-white mb-2 uppercase tracking-wider">
                Lot d'arrivage source
              </label>
              <select
                value={lotActif}
                onChange={(e) => majUrl({ lot: e.target.value || null, page: "1" })}
                className="select select-sm w-full rounded-xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 font-bold text-xs"
              >
                <option value="">Tous les lots</option>
                {lotsDisponibles.map((l) => (
                  <option key={l.id} value={String(l.id)}>
                    {l.libelle}
                  </option>
                ))}
              </select>
            </div>
          )}

        </div>

        {/* Footer avec bouton d'application */}
        <div className="p-4 border-t border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 flex gap-3">
          <button
            type="button"
            onClick={reinitialiserTout}
            className="btn btn-secondaire flex-1 py-3 text-xs font-bold rounded-xl"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-primaire flex-1 py-3 text-xs font-bold rounded-xl shadow-xs"
          >
            Voir les résultats
          </button>
        </div>

      </div>
    </div>
  );
}
