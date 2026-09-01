"use client";

<<<<<<< HEAD
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { type StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import {
  IconeCorbeille,
  IconeCrayon,
  IconePlus,
  IconeVitrine,
  IconeBillet,
  IconeCodeBarres,
  IconeCoche,
} from "@/components/icons";
=======
import React from "react";
import Link from "next/link";
import { type StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import { IconeCorbeille, IconeCrayon, IconePlus, IconeVitrine, IconeArchive, IconeBillet } from "@/components/icons";
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f
import BoutonImpression from "@/components/BoutonImpression";
import { useToast } from "@/components/toast";

export interface LigneProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  categorie_id?: number | null;
  categorie_rel?: {
    nom: string;
    parent: { nom: string; parent: { nom: string } | null } | null;
  } | null;
  modele_id?: number | null;
  modele?: { id: number; nom: string; image_url?: string | null } | null;
  statut: StatutProduit;
  a_jeter: boolean;
  en_vitrine: boolean;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  numero_serie?: string | null;
  grade?: string | null;
  emplacement?: string | null;
  lot_id: number | null;
  fournisseur: string | null;
  date_entree: string;
  jours_stock: number;
  image_url: string | null;
  nb_images: number;
  etiquette_imprimee: boolean;
}

interface CarteProduitProps {
  produit: LigneProduit;
  estSocial: boolean;
  peutModifier: boolean;
  envoi: boolean;
<<<<<<< HEAD
  selectionne?: boolean;
=======
  estSelectionne?: boolean;
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f
  onToggleSelection?: (id: number) => void;
  basculerVitrineIds: (ids: number[], enVitrine: boolean, libelle: string) => void;
  ouvrirEdition: (unites: LigneProduit[], titre: string) => void;
  ouvrirSuppressionUnites: (unites: LigneProduit[]) => void;
  ouvrirClassification: (unites: LigneProduit[]) => void;
  ouvrirAjout?: (source?: LigneProduit) => void;
  ouvrirVente?: (produit: LigneProduit) => void;
  t: (key: string, args?: any) => string;
}

export default function CarteProduit({
  produit,
  estSocial,
  peutModifier,
  envoi,
<<<<<<< HEAD
  selectionne = false,
=======
  estSelectionne = false,
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f
  onToggleSelection,
  basculerVitrineIds,
  ouvrirEdition,
  ouvrirSuppressionUnites,
  ouvrirClassification,
  ouvrirAjout,
  ouvrirVente,
  t,
}: CarteProduitProps) {
  const router = useRouter();
  const { afficher } = useToast();
  const [copieSN, setCopieSN] = useState(false);

  // Prix de vente affiché
  let prixVente = produit.prix_vente_fixe;
  if (produit.statut === "vendu" && produit.prix_vente_reel !== null) {
    prixVente = produit.prix_vente_reel;
  }

<<<<<<< HEAD
  function handleCardClick() {
    router.push(`/produits/${produit.id}`);
  }

  function copierCodeInterne(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(produit.code_interne);
    setCopieSN(true);
    afficher(`Code ${produit.code_interne} copié dans le presse-papier.`);
    setTimeout(() => setCopieSN(false), 2000);
  }

  return (
    <div
      onClick={handleCardClick}
      className={`group relative flex flex-col rounded-xl border bg-white dark:bg-brand-paper shadow-sm transition-all hover:border-brand-smooth hover:shadow-md overflow-hidden h-full cursor-pointer ${
        selectionne
          ? "border-brand-orange ring-2 ring-brand-orange/50 bg-brand-orange/[0.02]"
          : "border-brand-light-grey dark:border-white/10"
      }`}
    >
      {/* Checkbox de sélection (Absolute Top-Right) */}
      {onToggleSelection && (
        <div
          className="absolute top-2 right-2 z-10"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <label className="relative flex items-center justify-center p-1 cursor-pointer">
            <input
              type="checkbox"
              checked={selectionne}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection(produit.id);
              }}
              className="w-5 h-5 rounded border-2 border-brand-light-grey dark:border-white/30 text-brand-orange focus:ring-brand-orange focus:ring-offset-0 accent-brand-orange cursor-pointer shadow-sm bg-white/95 dark:bg-brand-paper/95 transition-all hover:scale-110"
            />
          </label>
        </div>
      )}

      {/* Zone Image */}
      <div className="relative aspect-video sm:aspect-square bg-brand-light-grey/20 dark:bg-black/20 overflow-hidden">
        {produit.image_url ? (
          <img
            src={produit.image_url}
            alt={produit.reference}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-brand-warm-grey opacity-50 uppercase text-xs font-bold font-outfit tracking-wider">
            {t("inventaire.sansPhoto")}
          </div>
        )}
=======
  const cheminArbo = produit.categorie_rel
    ? [
        produit.categorie_rel.parent?.parent?.nom,
        produit.categorie_rel.parent?.nom,
        produit.categorie_rel.nom,
      ].filter(Boolean).join(" › ")
    : produit.categorie;

  return (
    <div
      className={`group flex flex-col rounded-xl border bg-white dark:bg-brand-paper shadow-sm transition-all hover:border-brand-smooth hover:shadow-md overflow-hidden h-full ${
        estSelectionne
          ? "border-brand-orange ring-2 ring-brand-orange/30"
          : "border-brand-light-grey dark:border-white/10"
      }`}
    >
      {/* Zone Image Clickable -> Fiche Produit */}
      <div className="relative aspect-video sm:aspect-square bg-brand-light-grey/20 dark:bg-black/20 overflow-hidden">
        <Link
          href={`/produits/${produit.id}`}
          className="block w-full h-full outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-inset"
        >
          {produit.image_url ? (
            <img
              src={produit.image_url}
              alt={produit.reference}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-brand-warm-grey opacity-50 uppercase text-xs font-bold font-outfit tracking-wider">
              {t("inventaire.sansPhoto")}
            </div>
          )}
        </Link>
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start pointer-events-none">
          <BadgeStatut statut={produit.statut} aJeter={produit.a_jeter} />
          {produit.en_vitrine && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <IconeVitrine taille={12} /> {t("inventaire.vitrine")}
            </span>
          )}
        </div>
<<<<<<< HEAD
      </div>

      {/* Contenu principal */}
      <div className="flex-1 flex flex-col p-3.5">
        <div className="mb-2">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="font-mono text-[11px] font-bold text-brand-warm-grey dark:text-brand-grey bg-brand-light-grey/40 dark:bg-white/5 px-1.5 py-0.5 rounded border border-brand-light-grey/40 dark:border-white/5">
              {produit.code_interne}
            </span>
            <span className="text-[11px] text-brand-warm-grey dark:text-brand-grey truncate">
              {produit.categorie}
            </span>
          </div>
          <h4
            className="font-semibold text-brand-black dark:text-white leading-tight line-clamp-2 text-sm"
            title={produit.reference}
          >
            {produit.reference}
          </h4>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 bg-brand-light-grey/15 dark:bg-white/5 rounded-lg p-2 border border-brand-light-grey/30 dark:border-white/5">
          {!estSocial && (
            <div className="flex flex-col">
              <span className="text-[9px] font-bold uppercase tracking-wider text-brand-warm-grey dark:text-brand-grey">
                {t("inventaire.achat")}
              </span>
              <span className="font-bold text-brand-black dark:text-white text-xs whitespace-nowrap">
                {formaterDA(produit.prix_achat)}
              </span>
              {produit.cout_reparations > 0 && (
                <span className="text-[9px] text-brand-warm-grey mt-0.5 whitespace-nowrap">
                  +{formaterDA(produit.cout_reparations)}
                </span>
              )}
            </div>
          )}
          <div
            className={`flex flex-col ${
              estSocial ? "col-span-2 text-center items-center" : "text-right"
            }`}
          >
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-orange/80">
              {t("inventaire.colPrixVente")}
=======

        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
          {onToggleSelection && (
            <input
              type="checkbox"
              checked={estSelectionne}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection(produit.id);
              }}
              className="accent-brand-orange w-4 h-4 rounded cursor-pointer shadow-md bg-white border border-slate-300"
              title="Sélectionner pour actions groupées"
            />
          )}
          <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-black/60 text-white backdrop-blur-md">
            {produit.code_interne}
          </span>
          {produit.jours_stock > 30 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/90 text-white backdrop-blur-sm">
              {produit.jours_stock}j
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f
            </span>
          )}
        </div>
      </div>

      {/* Contenu Carte */}
      <div className="flex flex-col flex-1 p-3">
        {/* Catégorie */}
        <div
          className="text-[11px] font-medium text-brand-warm-grey dark:text-brand-grey truncate mb-1"
          title={cheminArbo}
        >
          {cheminArbo}
        </div>

        {/* Référence */}
        <Link
          href={`/produits/${produit.id}`}
          className="font-bold text-sm text-brand-black dark:text-white line-clamp-2 hover:text-brand-orange transition-colors leading-snug mb-2"
          title={produit.reference}
        >
          {produit.reference}
        </Link>

        {/* Prix & Info Lot */}
        <div className="mt-auto pt-2 border-t border-brand-light-grey/40 dark:border-white/5 flex items-end justify-between">
          <div>
            {!estSocial && (
              <div className="text-[10px] text-brand-warm-grey font-medium">
                Achat:{" "}
                <span className="font-bold text-brand-black dark:text-brand-warm-grey">
                  {formaterDA(produit.prix_achat)}
                </span>
              </div>
            )}
            <div className="text-xs text-brand-warm-grey">
              {produit.lot_id ? `Lot #${produit.lot_id}` : "Sans arrivage"}
            </div>
          </div>

          <div className="text-right">
            <div className="text-[10px] font-bold uppercase tracking-wider text-brand-orange">
              Vente
            </div>
            <div className="font-black text-sm text-brand-orange">
              {prixVente !== null ? formaterDA(prixVente) : "—"}
            </div>
          </div>
        </div>
      </div>

<<<<<<< HEAD
      {/* Footer d'actions compact : +  Billet  S/N  Crayon  Printer  Statut  Trash */}
      {peutModifier && (
        <div
          className="flex items-center justify-between gap-1 px-2 py-1.5 bg-brand-light-grey/30 dark:bg-black/30 border-t border-brand-light-grey/50 dark:border-white/5"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          {/* + : Ajouter exemplaire rapide */}
          {ouvrirAjout && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                ouvrirAjout(produit);
              }}
              title="Ajouter un exemplaire"
              aria-label="Ajouter un exemplaire"
              className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
            >
              <IconePlus taille={15} />
            </button>
          )}

          {/* Billet : Facturer / Vendre */}
          {produit.statut === "en_vente" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (ouvrirVente) {
                  ouvrirVente(produit);
                } else {
                  router.push(`/pos?vendre_produit_id=${produit.id}`);
                }
              }}
              title="Vendre / Facturer ce produit"
              aria-label="Vendre"
              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
            >
              <IconeBillet taille={15} />
            </button>
          )}

          {/* S/N : Copier / Afficher le code interne */}
          <button
            type="button"
            onClick={copierCodeInterne}
            title={copieSN ? "Copié !" : `Copier le code : ${produit.code_interne}`}
            aria-label="Copier le code interne"
            className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
          >
            {copieSN ? <IconeCoche taille={14} className="text-succes" /> : <IconeCodeBarres taille={14} />}
          </button>

          {/* Crayon : Éditer */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              ouvrirEdition([produit], produit.code_interne);
            }}
            title={t("inventaire.editer")}
            aria-label="Éditer"
            className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
          >
            <IconeCrayon taille={15} />
          </button>

          {/* Printer : Imprimer étiquette */}
          <BoutonImpression
            ids={[produit.id]}
            dejaImprimee={produit.etiquette_imprimee}
            className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
          />

          {/* Vitrine / Statut */}
=======
      {/* Actions Barre */}
      {peutModifier && (
        <div className="px-2 py-1.5 bg-brand-light-grey/20 dark:bg-white/5 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center gap-1">
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f
          {produit.statut !== "vendu" && (
            <button
              type="button"
              disabled={envoi}
              onClick={(e) => {
                e.preventDefault();
<<<<<<< HEAD
                e.stopPropagation();
                void basculerVitrineIds([produit.id], !produit.en_vitrine, produit.code_interne);
              }}
              title={produit.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
              aria-label="Vitrine"
              className={`p-1.5 rounded-lg transition-colors disabled:opacity-40 ${
                produit.en_vitrine
                  ? "text-brand-orange bg-brand-orange/15 hover:bg-brand-orange/25"
                  : "text-brand-warm-grey hover:bg-brand-light-grey/60 hover:text-brand-orange dark:hover:bg-white/10"
              }`}
            >
              <IconeVitrine taille={15} />
=======
                basculerVitrineIds([produit.id], !produit.en_vitrine, produit.code_interne);
              }}
              title={produit.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
              className={`p-2 rounded-md transition-colors disabled:opacity-40 ${
                produit.en_vitrine
                  ? "text-brand-orange bg-brand-orange/10"
                  : "text-brand-warm-grey hover:bg-brand-light-grey/40 hover:text-brand-orange dark:hover:bg-white/10"
              }`}
            >
              <IconeVitrine taille={16} />
            </button>
          )}

          <BoutonImpression
            ids={[produit.id]}
            dejaImprimee={produit.etiquette_imprimee}
            className="p-2 rounded-md text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
          />

          {produit.statut !== "vendu" && ouvrirVente && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                ouvrirVente(produit);
              }}
              title="Vendre & créer la facture"
              className="p-2 rounded-md text-brand-orange hover:bg-brand-orange/10 transition-colors"
            >
              <IconeBillet taille={16} />
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              ouvrirClassification([produit]);
            }}
            title="Modifier la classification"
            className="p-2 rounded-md text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-orange transition-colors ml-auto"
          >
            <IconeArchive taille={16} />
          </button>

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              ouvrirEdition([produit], produit.code_interne);
            }}
            title={t("inventaire.editer")}
            className="p-2 rounded-md text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
          >
            <IconeCrayon taille={16} />
          </button>

          {ouvrirAjout && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                ouvrirAjout(produit);
              }}
              title="Ajouter un exemplaire (Copier)"
              className="p-2 rounded-md text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
            >
              <IconePlus taille={16} />
>>>>>>> 902325d359575a44b8eb5656f24610180059d32f
            </button>
          )}

          {/* Trash : Supprimer */}
          {produit.statut !== "vendu" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                ouvrirSuppressionUnites([produit]);
              }}
              title={t("inventaire.supprimer")}
              aria-label="Supprimer"
              className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-danger/10 hover:text-danger transition-colors"
            >
              <IconeCorbeille taille={15} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
