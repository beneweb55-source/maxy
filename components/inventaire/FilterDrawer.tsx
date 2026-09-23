"use client";

import React from "react";
import {
  Filter,
  X,
  RotateCcw,
  Cpu,
  Eye,
  Archive,
  Tag,
  Calendar,
  Check,
  Package,
  Sparkles,
  Store,
  Share2
} from "lucide-react";
import { INFOS_STATUT, STATUTS_PRODUIT } from "@/lib/statuts";
import type { StatutProduit } from "@prisma/client";
import {
  MATRICE_EQUIPEMENTS,
  determinerProfilEquipement,
  type ProfilEquipement
} from "@/lib/matrice-specifications";
import { CHAMPS_MATRICE_FILTRES } from "@/lib/filtres-produits";

/**
 * Clés de facettes que le serveur ne lit PAS — et que le tiroir n'affiche donc
 * plus — mais qu'un lien partagé ou un onglet ancien peut encore porter.
 * Elles sont remises à zéro pour que « Réinitialiser » rende vraiment la liste
 * entière, au lieu d'en laisser une filtrée sans qu'aucune pastille ne
 * l'explique.
 */
const CLES_FACETTES_HERITEES = [
  "cpu_gamme",
  "cpu_generation",
  "ram_taille",
  "stockage_principal",
  "taille_ecran_aio",
  "clavier_layout",
  "generation_serveur",
  "taille_ecran_pos",
  "cpu_modele",
  "fonctions",
] as const;

/**
 * Valeurs de grade réellement présentes en base, à côté du vocabulaire courant
 * de l'application. Mesuré : `Bon état` (14), `Très bon état` (10), `Usé` (5)
 * — soit 29 unités qu'aucune pastille n'atteignait, parce que le tiroir ne
 * proposait que `Grade A+`, `Grade B`, `Grade C`, `Pour pièces`, dont aucune
 * n'existe encore en base.
 */
const GRADES_HERITES = ["Bon état", "Très bon état", "Usé"] as const;

/** Le vocabulaire de grade que l'application écrit elle-même. */
const GRADES_STANDARD = [
  { id: "Neuf", label: "Neuf / Emballé" },
  { id: "Grade A+", label: "Grade A+ (Impeccable)" },
  { id: "Grade A", label: "Grade A (Très bon état)" },
  { id: "Grade B", label: "Grade B (Traces d'usage)" },
  { id: "Grade C", label: "Grade C (Abîmé / Rayé)" },
  { id: "Pour pièces", label: "Pour pièces / HS" },
] as const;

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

  /**
   * Les seules facettes du profil que le serveur sait lire.
   *
   * Le tiroir rendait TOUS les attributs marqués `filtre: true`, y compris dix
   * clés que `construireFiltresProduits` ignore : la pastille s'allumait, la
   * liste ne bougeait pas et aucun badge ne s'affichait — c'est le gros de
   * « des filtres ne marchent pas ». Les câbler serait pire que les retirer :
   * mesuré, cinq ne ramèneraient aucune ligne et quatre ramèneraient du bruit
   * (`ram_taille` → 610 lignes pour un simple `contains "8"`).
   */
  const facettesUtiles = (profil?.attributs ?? []).filter(
    (attr) =>
      attr.filtre &&
      Boolean(attr.options?.length) &&
      (CHAMPS_MATRICE_FILTRES as readonly string[]).includes(attr.cle)
  );

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
  const enVitrineActif = searchParams.get("en_vitrine") === "1";
  const posteReseauxActif = searchParams.get("poste_reseaux") === "1";
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
    // Le bouton s'annonce « Réinitialiser tous les filtres ». Il en oubliait
    // neuf — a_classer, a_jeter, sans_photo, sans_etiquette, du, au, q, lot et
    // emplacement selon l'écran — si bien qu'après un « Reset » la liste
    // restait filtrée sans qu'aucune pastille ne l'explique.
    const modifs: Record<string, string | null> = {
      q: null,
      statuts: null,
      grade: null,
      emplacement: null,
      lot: null,
      sans_lot: null,
      sans_photo: null,
      sans_etiquette: null,
      a_tarifer: null,
      a_classer: null,
      a_jeter: null,
      en_vitrine: null,
      poste_reseaux: null,
      plus30j: null,
      du: null,
      au: null,
      page: "1",
    };

    // Les facettes matérielles viennent de la liste que le serveur lit, pour
    // qu'une clé ajoutée demain soit réinitialisée sans qu'on y pense.
    for (const champ of CHAMPS_MATRICE_FILTRES) {
      modifs[champ] = null;
    }

    // Plus les clés mortes qu'un ancien lien peut encore porter.
    for (const champ of CLES_FACETTES_HERITEES) {
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
      <div className="relative w-full max-w-[90vw] sm:max-w-md bg-white dark:bg-brand-paper shadow-2xl h-full flex flex-col border-l border-brand-light-grey/60 dark:border-white/10 z-10">
        
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
              className="text-xs font-bold text-brand-warm-grey hover:text-danger flex items-center gap-1 p-2 rounded-xl hover:bg-brand-light-grey/30 transition-colors"
              title="Réinitialiser tous les filtres"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">Reset</span>
            </button>
            <button
              type="button"
              onClick={onFermer}
              className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/30"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Corps des filtres avec défilement fluide */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">

          {/* 1. FACETTES TECHNIQUES DYNAMIQUES DE LA MATRICE */}
          {profil && facettesUtiles.length > 0 && (
            <div className="space-y-5 p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20">
              <div className="flex items-center justify-between pb-2 border-b border-brand-orange/15">
                <div className="flex items-center gap-2 text-xs font-black text-brand-orange uppercase tracking-wider">
                  <Sparkles className="w-4 h-4" />
                  Spécifications : {categorieNom || profil.familleNom}
                </div>
              </div>

              {facettesUtiles.map((attr) => {
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

          {/* Aucune facette utile pour cette famille : on retombe sur les deux
              critères que le serveur honore partout (CPU, RAM), plutôt que sur
              une liste de pastilles qui n'agiraient pas. */}
          {facettesUtiles.length === 0 && (
            <div className="space-y-4 p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20 dark:border-brand-orange/15">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand-orange dark:text-brand-orange uppercase tracking-wider">
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
                            ? "bg-brand-orange text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-brand-orange/30 dark:border-white/10 text-brand-black dark:text-white hover:border-brand-orange/50"
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
                            ? "bg-brand-orange text-white shadow-xs"
                            : "bg-white dark:bg-brand-paper border border-brand-orange/30 dark:border-white/10 text-brand-black dark:text-white hover:border-brand-orange/50"
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
              {GRADES_STANDARD.map((g) => {
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

            {/* Ces valeurs existent en base mais hors du vocabulaire ci-dessus.
                Sans elles, 29 unités restaient inatteignables : le bouton
                « Grade B » ne rendait rien tant qu'on n'écrivait pas « Usé ». */}
            <div className="mt-2.5">
              <label className="block text-[10px] font-bold text-brand-warm-grey uppercase tracking-wider mb-1.5">
                Valeurs déjà en base
              </label>
              <div className="flex flex-wrap gap-1.5">
                {GRADES_HERITES.map((g) => {
                  const actif = gradesActifs.includes(g);
                  return (
                    <button
                      key={g}
                      type="button"
                      onClick={() => basculerGrade(g)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all active:scale-95 ${
                        actif
                          ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                          : "bg-white dark:bg-brand-paper text-brand-warm-grey border-dashed border-brand-light-grey dark:border-white/10 hover:border-brand-orange/40"
                      }`}
                    >
                      {actif && <Check className="w-3 h-3" />}
                      <span>{g}</span>
                    </button>
                  );
                })}
              </div>
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

              <button
                type="button"
                onClick={() => majUrl({ en_vitrine: enVitrineActif ? null : "1", page: "1" })}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all ${
                  enVitrineActif
                    ? "bg-orange-500/15 border-orange-500 text-orange-700 dark:text-orange-300 font-extrabold"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-orange-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-orange-500" />
                  <span>Exposé en vitrine</span>
                </div>
                {enVitrineActif && <Check className="w-4 h-4 text-orange-500" />}
              </button>

              <button
                type="button"
                onClick={() => majUrl({ poste_reseaux: posteReseauxActif ? null : "1", page: "1" })}
                className={`w-full flex items-center justify-between p-3 rounded-xl text-xs font-bold border transition-all ${
                  posteReseauxActif
                    ? "bg-blue-500/15 border-blue-500 text-blue-700 dark:text-blue-300 font-extrabold"
                    : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-blue-400"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-blue-500" />
                  <span>Posté sur les réseaux sociaux</span>
                </div>
                {posteReseauxActif && <Check className="w-4 h-4 text-blue-500" />}
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
                className="select select-sm w-full h-12 min-h-[48px] rounded-lg bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 font-bold text-base"
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
            className="btn btn-secondaire flex-1 py-3 min-h-[48px] text-xs font-bold rounded-xl"
          >
            Réinitialiser
          </button>
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-primaire flex-1 py-3 min-h-[48px] text-xs font-bold rounded-xl shadow-xs"
          >
            Voir les résultats
          </button>
        </div>

      </div>
    </div>
  );
}
