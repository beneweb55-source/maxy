import React from "react";
import Link from "next/link";
import { type StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import { IconeCorbeille, IconeCrayon, IconeVitrine } from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";

export interface LigneProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  a_jeter: boolean;
  en_vitrine: boolean;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
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
  basculerVitrineIds: (ids: number[], enVitrine: boolean, libelle: string) => void;
  ouvrirEdition: (unites: LigneProduit[], titre: string) => void;
  ouvrirSuppressionUnites: (unites: LigneProduit[]) => void;
  t: (key: string, args?: any) => string;
}

export default function CarteProduit({
  produit,
  estSocial,
  peutModifier,
  envoi,
  basculerVitrineIds,
  ouvrirEdition,
  ouvrirSuppressionUnites,
  t
}: CarteProduitProps) {
  // Prix de vente affiché
  let prixVente = produit.prix_vente_fixe;
  if (produit.statut === "vendu" && produit.prix_vente_reel !== null) {
    prixVente = produit.prix_vente_reel;
  }

  return (
    <div className="group flex flex-col rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper shadow-sm transition-all hover:border-brand-smooth hover:shadow-md overflow-hidden h-full">
      {/* Zone Image Clickable -> Fiche Produit */}
      <Link href={`/produits/${produit.id}`} className="block relative aspect-video sm:aspect-square bg-brand-light-grey/20 dark:bg-black/20 overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-brand-orange focus-visible:ring-inset">
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
        
        {/* Badges Overlay */}
        <div className="absolute top-2 left-2 flex flex-col gap-1.5 items-start">
          <BadgeStatut statut={produit.statut} aJeter={produit.a_jeter} />
          {produit.en_vitrine && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/90 backdrop-blur-md px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              <IconeVitrine taille={12} /> {t("inventaire.vitrine")}
            </span>
          )}
        </div>
      </Link>

      {/* Contenu principal */}
      <Link href={`/produits/${produit.id}`} className="flex-1 flex flex-col p-4 outline-none focus-visible:bg-brand-light-grey/10">
        <div className="mb-3">
          <div className="font-mono text-[11px] font-bold text-brand-warm-grey dark:text-brand-grey mb-1 bg-brand-light-grey/30 dark:bg-white/5 inline-block px-1.5 py-0.5 rounded">
            {produit.code_interne}
          </div>
          <h4 className="font-semibold text-brand-black dark:text-white leading-tight line-clamp-2" title={produit.reference}>
            {produit.reference}
          </h4>
          <div className="text-[11px] text-brand-warm-grey dark:text-brand-grey mt-1 line-clamp-1">
            {produit.categorie}
          </div>
        </div>

        <div className="mt-auto grid grid-cols-2 gap-2 bg-brand-light-grey/10 dark:bg-white/5 rounded-lg p-2 border border-brand-light-grey/30 dark:border-white/5">
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
          <div className={`flex flex-col ${estSocial ? "col-span-2 text-center items-center" : "text-right"}`}>
            <span className="text-[9px] font-bold uppercase tracking-wider text-brand-orange/80">
              {t("inventaire.colPrixVente")}
            </span>
            <span className="font-extrabold text-brand-orange text-sm whitespace-nowrap">
              {prixVente !== null ? formaterDA(prixVente) : "—"}
            </span>
          </div>
        </div>
      </Link>

      {/* Footer d'actions */}
      {peutModifier && (
        <div className="flex items-center gap-1 p-2 bg-brand-light-grey/20 dark:bg-black/20 border-t border-brand-light-grey/50 dark:border-white/5">
          {produit.statut !== "vendu" && (
            <button
              type="button"
              disabled={envoi}
              onClick={(e) => {
                e.preventDefault();
                void basculerVitrineIds([produit.id], !produit.en_vitrine, produit.code_interne);
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

          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              ouvrirEdition([produit], produit.code_interne);
            }}
            title={t("inventaire.editer")}
            className="p-2 rounded-md text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors ml-auto"
          >
            <IconeCrayon taille={16} />
          </button>

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
