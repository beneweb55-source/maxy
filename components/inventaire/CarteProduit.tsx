"use client";

import React from "react";
import Link from "next/link";
import { type StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import { IconeCorbeille, IconeCrayon, IconePlus, IconeVitrine, IconeArchive, IconeBillet } from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";

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
  estSelectionne?: boolean;
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
  estSelectionne = false,
  onToggleSelection,
  basculerVitrineIds,
  ouvrirEdition,
  ouvrirSuppressionUnites,
  ouvrirClassification,
  ouvrirAjout,
  ouvrirVente,
  t,
}: CarteProduitProps) {
  // Prix de vente affiché
  let prixVente = produit.prix_vente_fixe;
  if (produit.statut === "vendu" && produit.prix_vente_reel !== null) {
    prixVente = produit.prix_vente_reel;
  }

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

        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start pointer-events-none">
          <BadgeStatut statut={produit.statut} aJeter={produit.a_jeter} />
          {produit.en_vitrine && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <IconeVitrine taille={12} /> {t("inventaire.vitrine")}
            </span>
          )}
        </div>

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

      {/* Actions Barre */}
      {peutModifier && (
        <div className="px-2 py-1.5 bg-brand-light-grey/20 dark:bg-white/5 border-t border-brand-light-grey/40 dark:border-white/5 flex items-center gap-1">
          {produit.statut !== "vendu" && (
            <button
              type="button"
              disabled={envoi}
              onClick={(e) => {
                e.preventDefault();
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
            </button>
          )}

          {produit.statut !== "vendu" && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                ouvrirSuppressionUnites([produit]);
              }}
              title={t("inventaire.supprimer")}
              className="p-2 rounded-md text-brand-warm-grey hover:bg-danger/10 hover:text-danger transition-colors"
            >
              <IconeCorbeille taille={16} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
