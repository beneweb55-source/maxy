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
  Check
} from "lucide-react";
import { INFOS_STATUT, STATUTS_PRODUIT } from "@/lib/statuts";
import type { StatutProduit } from "@prisma/client";

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
  // Contexte de navigation actuel (Anti-redondance)
  const familleIdActif = searchParams.get("famille_id");
  const categorieIdActif = searchParams.get("categorie_id");
  const sousCategorieIdActif = searchParams.get("sous_categorie_id");

  // Filtres actifs
  const statutsActifs = (searchParams.get("statuts") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StatutProduit => Boolean(s));

  const gradesActifs = (searchParams.get("grade") ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const emplacementActif = searchParams.get("emplacement") ?? "";
  const cpuActif = searchParams.get("cpu") ?? "";
  const ramActif = searchParams.get("ram") ?? "";
  const stockageActif = searchParams.get("stockage") ?? "";
  const formatActif = searchParams.get("format") ?? "";
  const typeDisqueActif = searchParams.get("type_disque") ?? "";
  const capaciteDisqueActif = searchParams.get("capacite_disque") ?? "";
  const tailleEcranActif = searchParams.get("taille_ecran") ?? "";
  const lotActif = searchParams.get("lot") ?? "";
  const sansLotActif = searchParams.get("sans_lot") === "1";
  const aTariferActif = searchParams.get("a_tarifer") === "1";
  const plus30jActif = searchParams.get("plus30j") === "1";

  // Détection contextuelle de la famille/catégorie pour filtres spécifiques
  const ctx = (familleNom + " " + categorieNom).toUpperCase();
  const estOrdinateur = ctx.includes("ORDINATEUR") || ctx.includes("PC") || ctx.includes("PORTABLE") || ctx.includes("TOUR") || ctx.includes("STATION");
  const estStockage = ctx.includes("STOCKAGE") || ctx.includes("DISQUE") || ctx.includes("SSD") || ctx.includes("HDD") || ctx.includes("NVME");
  const estEcran = ctx.includes("ÉCRAN") || ctx.includes("ECRAN") || ctx.includes("MONITEUR");

  // Toggle helper pour filtres multi-valeurs
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
    majUrl({
      statuts: null,
      grade: null,
      emplacement: null,
      cpu: null,
      ram: null,
      stockage: null,
      format: null,
      type_disque: null,
      capacite_disque: null,
      taille_ecran: null,
      lot: null,
      sans_lot: null,
      a_tarifer: null,
      plus30j: null,
      page: "1",
    });
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
                Filtres & Affinement POS
              </h2>
              <p className="text-[11px] text-brand-warm-grey">
                Sélection tactile par puces contextuelles
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={reinitialiserTout}
              className="text-xs font-bold text-brand-warm-grey hover:text-danger flex items-center gap-1 p-1.5 rounded-lg hover:bg-brand-light-grey/30"
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

          {/* FACETTES CONTEXTUELLES : ORDINATEURS */}
          {estOrdinateur && (
            <div className="space-y-4 p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-blue-800 dark:text-blue-300 uppercase tracking-wider">
                <Cpu className="w-3.5 h-3.5" /> Spécifications PC / Processeur
              </div>

              {/* Processeurs */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Famille CPU</label>
                <div className="flex flex-wrap gap-1.5">
                  {["i3", "i5", "i7", "i9", "Ryzen 5", "Ryzen 7", "Xeon"].map((val) => {
                    const actif = cpuActif === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ cpu: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
                  {["8", "16", "32", "64"].map((val) => {
                    const actif = ramActif === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ ram: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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

              {/* Format PC */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Facteur de forme</label>
                <div className="flex flex-wrap gap-1.5">
                  {["Portable", "Tour", "Mini PC", "Station"].map((val) => {
                    const actif = formatActif === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ format: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
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
            </div>
          )}

          {/* FACETTES CONTEXTUELLES : STOCKAGE */}
          {estStockage && (
            <div className="space-y-4 p-3.5 rounded-xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-900/40">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-cyan-800 dark:text-cyan-300 uppercase tracking-wider">
                <HardDrive className="w-3.5 h-3.5" /> Spécifications Disques & SSD
              </div>

              {/* Type de stockage */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Technologie</label>
                <div className="flex flex-wrap gap-1.5">
                  {["NVMe", "SATA", "HDD", "SAS"].map((val) => {
                    const actif = typeDisqueActif === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ type_disque: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          actif
                            ? "bg-cyan-600 text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-cyan-200 dark:border-cyan-900 text-brand-black dark:text-white hover:border-cyan-400"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Capacité */}
              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Capacité</label>
                <div className="flex flex-wrap gap-1.5">
                  {["256Go", "512Go", "1To", "2To", "4To"].map((val) => {
                    const actif = capaciteDisqueActif === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ capacite_disque: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          actif
                            ? "bg-cyan-600 text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-cyan-200 dark:border-cyan-900 text-brand-black dark:text-white hover:border-cyan-400"
                        }`}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* FACETTES CONTEXTUELLES : ÉCRANS */}
          {estEcran && (
            <div className="space-y-4 p-3.5 rounded-xl bg-sky-50/50 dark:bg-sky-950/20 border border-sky-200/60 dark:border-sky-900/40">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-sky-800 dark:text-sky-300 uppercase tracking-wider">
                <Monitor className="w-3.5 h-3.5" /> Spécifications Moniteurs
              </div>

              <div>
                <label className="block text-[11px] font-bold text-brand-warm-grey mb-1.5">Diagonale d'écran</label>
                <div className="flex flex-wrap gap-1.5">
                  {["22", "24", "27", "32"].map((val) => {
                    const actif = tailleEcranActif === val;
                    return (
                      <button
                        key={val}
                        type="button"
                        onClick={() => majUrl({ taille_ecran: actif ? null : val, page: "1" })}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          actif
                            ? "bg-sky-600 text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-sky-200 dark:border-sky-900 text-brand-black dark:text-white hover:border-sky-400"
                        }`}
                      >
                        {val}"
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* EMPLACEMENT PHYSIQUE (Vitrine vs Réserve) */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-brand-black dark:text-white uppercase tracking-wider">
              Emplacement physique
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => majUrl({ emplacement: null, page: "1" })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all text-center ${
                  !emplacementActif
                    ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey"
                }`}
              >
                Tous
              </button>
              <button
                type="button"
                onClick={() => majUrl({ emplacement: "vitrine", page: "1" })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                  emplacementActif === "vitrine"
                    ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey hover:border-brand-orange"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Vitrine
              </button>
              <button
                type="button"
                onClick={() => majUrl({ emplacement: "reserve", page: "1" })}
                className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all ${
                  emplacementActif === "reserve"
                    ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey hover:border-brand-black"
                }`}
              >
                <Archive className="w-3.5 h-3.5" /> Réserve
              </button>
            </div>
          </div>

          {/* ÉTATS / GRADES */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-brand-black dark:text-white uppercase tracking-wider">
              Grade & État physique
            </label>
            <div className="flex flex-wrap gap-1.5">
              {["Neuf", "Grade A", "Grade B", "À réparer", "Pour pièces"].map((g) => {
                const actif = gradesActifs.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => basculerGrade(g)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      actif
                        ? "bg-brand-black text-white dark:bg-white dark:text-brand-black shadow-xs"
                        : "bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-black"
                    }`}
                  >
                    {actif && <Check className="w-3 h-3" />}
                    {g}
                  </button>
                );
              })}
            </div>
          </div>

          {/* STATUTS */}
          <div className="space-y-2">
            <label className="block text-xs font-extrabold text-brand-black dark:text-white uppercase tracking-wider">
              Statut du stock
            </label>
            <div className="flex flex-wrap gap-1.5">
              {STATUTS_PRODUIT.map((s) => {
                const actif = statutsActifs.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => basculerStatut(s)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      actif
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-orange"
                    }`}
                  >
                    {actif && <Check className="w-3 h-3" />}
                    {INFOS_STATUT[s].libelle}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ARRIVAGES / LOTS */}
          {lotsDisponibles.length > 0 && (
            <div className="space-y-2">
              <label className="block text-xs font-extrabold text-brand-black dark:text-white uppercase tracking-wider">
                Arrivage / Lot
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => majUrl({ sans_lot: sansLotActif ? null : "1", lot: null, page: "1" })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    sansLotActif
                      ? "bg-brand-black text-white dark:bg-white dark:text-brand-black shadow-xs"
                      : "bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-black"
                  }`}
                >
                  Sans arrivage (Indépendant)
                </button>
                {lotsDisponibles.map((l) => {
                  const actif = lotActif === String(l.id);
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => majUrl({ lot: actif ? null : String(l.id), sans_lot: null, page: "1" })}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        actif
                          ? "bg-brand-black text-white dark:bg-white dark:text-brand-black shadow-xs"
                          : "bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-black"
                      }`}
                    >
                      {l.libelle}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ALERTES MÉTIER & GESTION */}
          <div className="space-y-2 border-t border-brand-light-grey/40 dark:border-white/10 pt-4">
            <label className="block text-xs font-extrabold text-brand-black dark:text-white uppercase tracking-wider">
              Alertes & Filtres Rapides
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => majUrl({ a_tarifer: aTariferActif ? null : "1", page: "1" })}
                className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                  aTariferActif
                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey hover:border-amber-500"
                }`}
              >
                Sans prix de vente fixé
              </button>
              <button
                type="button"
                onClick={() => majUrl({ plus30j: plus30jActif ? null : "1", page: "1" })}
                className={`p-2.5 rounded-xl text-xs font-bold border text-left transition-all ${
                  plus30jActif
                    ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey hover:border-rose-600"
                }`}
              >
                En stock depuis +30j
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 flex items-center justify-between">
          <button
            type="button"
            onClick={reinitialiserTout}
            className="text-xs font-bold text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
          >
            Effacer tous les filtres
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-primaire text-xs py-2 px-5 rounded-xl font-bold shadow-xs"
          >
            Afficher les résultats
          </button>
        </div>
      </div>
    </div>
  );
}
