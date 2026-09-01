"use client";

import React from "react";
import { X, RotateCcw } from "lucide-react";
import { INFOS_STATUT } from "@/lib/statuts";
import type { StatutProduit } from "@prisma/client";

export interface ActiveFilterBadgesProps {
  searchParams: { get: (k: string) => string | null };
  majUrl: (modifs: Record<string, string | null>) => void;
  taxonomieNoms?: { familleNom?: string; categorieNom?: string; sousCategorieNom?: string };
}

export default function ActiveFilterBadges({
  searchParams,
  majUrl,
  taxonomieNoms = {},
}: ActiveFilterBadgesProps) {
  const q = searchParams.get("q");
  const statutsParam = searchParams.get("statuts");
  const gradeParam = searchParams.get("grade");
  const emplacement = searchParams.get("emplacement");
  const cpu = searchParams.get("cpu");
  const ram = searchParams.get("ram");
  const stockage = searchParams.get("stockage");
  const format = searchParams.get("format");
  const typeDisque = searchParams.get("type_disque");
  const capaciteDisque = searchParams.get("capacite_disque");
  const tailleEcran = searchParams.get("taille_ecran");
  const aTarifer = searchParams.get("a_tarifer") === "1";
  const plus30j = searchParams.get("plus30j") === "1";
  const sansLot = searchParams.get("sans_lot") === "1";

  const statuts = (statutsParam ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is StatutProduit => Boolean(s));

  const grades = (gradeParam ?? "")
    .split(",")
    .map((g) => g.trim())
    .filter(Boolean);

  const badges: { id: string; libelle: string; onSupprimer: () => void }[] = [];

  if (q) {
    badges.push({
      id: "q",
      libelle: `Recherche : « ${q} »`,
      onSupprimer: () => majUrl({ q: null, page: "1" }),
    });
  }

  if (emplacement) {
    badges.push({
      id: "emplacement",
      libelle: emplacement === "vitrine" ? "En Vitrine" : "En Réserve",
      onSupprimer: () => majUrl({ emplacement: null, page: "1" }),
    });
  }

  grades.forEach((g) => {
    badges.push({
      id: `grade-${g}`,
      libelle: `Grade : ${g}`,
      onSupprimer: () => {
        const nouv = grades.filter((item) => item !== g);
        majUrl({ grade: nouv.length > 0 ? nouv.join(",") : null, page: "1" });
      },
    });
  });

  statuts.forEach((s) => {
    badges.push({
      id: `statut-${s}`,
      libelle: INFOS_STATUT[s]?.libelle || s,
      onSupprimer: () => {
        const nouv = statuts.filter((item) => item !== s);
        majUrl({ statuts: nouv.length > 0 ? nouv.join(",") : null, page: "1" });
      },
    });
  });

  if (cpu) {
    badges.push({
      id: "cpu",
      libelle: `CPU : ${cpu}`,
      onSupprimer: () => majUrl({ cpu: null, page: "1" }),
    });
  }

  if (ram) {
    badges.push({
      id: "ram",
      libelle: `RAM : ${ram}Go`,
      onSupprimer: () => majUrl({ ram: null, page: "1" }),
    });
  }

  if (stockage) {
    badges.push({
      id: "stockage",
      libelle: `Stockage : ${stockage}`,
      onSupprimer: () => majUrl({ stockage: null, page: "1" }),
    });
  }

  if (format) {
    badges.push({
      id: "format",
      libelle: `Format : ${format}`,
      onSupprimer: () => majUrl({ format: null, page: "1" }),
    });
  }

  if (typeDisque) {
    badges.push({
      id: "type_disque",
      libelle: `Type : ${typeDisque}`,
      onSupprimer: () => majUrl({ type_disque: null, page: "1" }),
    });
  }

  if (capaciteDisque) {
    badges.push({
      id: "capacite_disque",
      libelle: `Capacité : ${capaciteDisque}`,
      onSupprimer: () => majUrl({ capacite_disque: null, page: "1" }),
    });
  }

  if (tailleEcran) {
    badges.push({
      id: "taille_ecran",
      libelle: `Écran : ${tailleEcran}"`,
      onSupprimer: () => majUrl({ taille_ecran: null, page: "1" }),
    });
  }

  // Champs dynamiques de la matrice
  const champsDynamiques = [
    { cle: "marque", prefixe: "Marque" },
    { cle: "puissance_w", prefixe: "Puissance" },
    { cle: "type_connecteur", prefixe: "Connecteur" },
    { cle: "generation", prefixe: "Génération" },
    { cle: "type_specifique", prefixe: "Type" },
    { cle: "format_cible", prefixe: "Format" },
    { cle: "frequence_mhz", prefixe: "Fréquence" },
    { cle: "interface", prefixe: "Interface" },
    { cle: "format_physique", prefixe: "Format" },
    { cle: "capacite", prefixe: "Capacité" },
    { cle: "taille_pouces", prefixe: "Écran" },
    { cle: "resolution", prefixe: "Résolution" },
    { cle: "frequence_hz", prefixe: "Fréquence" },
    { cle: "type_dalle", prefixe: "Dalle" },
    { cle: "fondeur", prefixe: "Fondeur" },
    { cle: "gamme", prefixe: "Gamme" },
    { cle: "vram_taille", prefixe: "VRAM" },
    { cle: "type_consommable", prefixe: "Type" },
    { cle: "couleur", prefixe: "Couleur" },
    { cle: "technologie", prefixe: "Technologie" },
    { cle: "format_serveur", prefixe: "Format Serveur" }
  ];

  for (const c of champsDynamiques) {
    const val = searchParams.get(c.cle);
    if (val) {
      badges.push({
        id: c.cle,
        libelle: `${c.prefixe} : ${val}`,
        onSupprimer: () => majUrl({ [c.cle]: null, page: "1" }),
      });
    }
  }

  if (aTarifer) {
    badges.push({
      id: "a_tarifer",
      libelle: "Sans prix fixé",
      onSupprimer: () => majUrl({ a_tarifer: null, page: "1" }),
    });
  }

  if (plus30j) {
    badges.push({
      id: "plus30j",
      libelle: "En stock > 30j",
      onSupprimer: () => majUrl({ plus30j: null, page: "1" }),
    });
  }

  if (sansLot) {
    badges.push({
      id: "sans_lot",
      libelle: "Arrivage hors-lot",
      onSupprimer: () => majUrl({ sans_lot: null, page: "1" }),
    });
  }

  if (badges.length === 0) return null;

  const reinitialiserTout = () => {
    majUrl({
      q: null,
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

  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 animate-entree select-none">
      <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-warm-grey mr-1">
        Filtres actifs ({badges.length}) :
      </span>

      {badges.map((b) => (
        <span
          key={b.id}
          className="inline-flex items-center gap-1 bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 px-2.5 py-1 rounded-full text-xs font-bold text-brand-black dark:text-white shadow-2xs group hover:border-brand-orange transition-colors"
        >
          <span>{b.libelle}</span>
          <button
            type="button"
            onClick={b.onSupprimer}
            className="w-3.5 h-3.5 rounded-full flex items-center justify-center text-brand-warm-grey hover:text-brand-orange hover:bg-brand-orange/15 transition-colors ml-0.5"
            title="Supprimer ce filtre"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={reinitialiserTout}
        className="text-[11px] font-bold text-brand-orange hover:underline ml-2 flex items-center gap-1"
      >
        <RotateCcw className="w-3 h-3" /> Effacer tout
      </button>
    </div>
  );
}
