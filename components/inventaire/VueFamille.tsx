import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { encodeBase64Url, decodeBase64Url } from "@/lib/base64url";
import Link from "next/link";
import { IconeChevronGauche, IconeCrayon, IconeImprimante, IconeVitrine, IconeCorbeille, IconeOeil } from "@/components/icons";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import type { StatutProduit } from "@prisma/client";
import ModaleEditionFamille, { type FamilleInfo } from "./ModaleEditionFamille";
import BoutonImpression from "@/components/BoutonImpression";
import { useT } from "@/lib/i18n/contexte";

// LigneProduit from Inventaire.tsx
interface LigneProduit {
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

export default function VueFamille({
  cleFamille,
  majUrl,
  ouvrirEdition,
  ouvrirSuppressionUnites,
  basculerVitrineIds
}: {
  cleFamille: string;
  majUrl: (modifs: Record<string, string | null>) => void;
  ouvrirEdition: (unites: LigneProduit[], titre: string) => void;
  ouvrirSuppressionUnites: (unites: LigneProduit[]) => void;
  basculerVitrineIds: (ids: number[], enVitrine: boolean, libelle: string) => void;
}) {
  const searchParams = useSearchParams();
  const [stats, setStats] = useState<{
    unites: number;
    dispos: number;
    aTester: number;
    prixMin: number | null;
    prixMax: number | null;
    image_url: string | null;
  } | null>(null);
  const [familleInfo, setFamilleInfo] = useState<FamilleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editionFamille, setEditionFamille] = useState(false);
  const t = useT();

  const [erreur, setErreur] = useState<string | null>(null);

  // Sécurisation: on décode la cle puis on coupe au dernier "|"
  let reference = "";
  let categorie = "";
  try {
    const decodedCle = decodeBase64Url(cleFamille);
    const lastPipeIndex = decodedCle.lastIndexOf("|");
    reference = lastPipeIndex !== -1 ? decodedCle.substring(0, lastPipeIndex) : decodedCle;
    categorie = lastPipeIndex !== -1 ? decodedCle.substring(lastPipeIndex + 1) : "";
  } catch (e) {
    console.error("Impossible de décoder la clé:", e);
  }

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    setLoading(true);
    setErreur(null);
    
    // On hérite des filtres de l'inventaire (comme statuts, sans_photo, etc.)
    // mais on retire la recherche textuelle 'q' et la pagination 'page'
    // qui fausseraient la récupération des produits de cette famille précise.
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("q");
    params.delete("page");
    params.set("categorie", categorie ?? "");
    params.set("reference_exacte", reference ?? "");
    
    // Fetch les statistiques globales de la famille (Niveau 2)
    const fetchStats = fetch(`/api/produits/familles?categorie=${encodeURIComponent(categorie)}&reference_exacte=${encodeURIComponent(reference)}`, { signal })
      .then(async r => {
        if (!r.ok) throw new Error("Erreur lors du chargement des statistiques");
        return r.json();
      });
    
    const fetchInfo = fetch(`/api/familles/${encodeURIComponent(cleFamille)}`, { signal }).then(async r => {
      if (!r.ok) throw new Error("Erreur lors du chargement de la famille");
      return r.json();
    });

    Promise.all([fetchStats, fetchInfo])
      .then(([statsData, info]) => {
        if (signal.aborted) return;
        
        const f = statsData.familles?.[0];
        if (f) {
          setStats({
            unites: f.unites || 0,
            dispos: f.disponibles || 0,
            aTester: f.a_tester || 0,
            prixMin: f.prixMin,
            prixMax: f.prixMax,
            image_url: f.image_url || null
          });
        }
        setFamilleInfo(info.id ? info : null);
        setLoading(false);
      })
      .catch(e => {
        if (e.name === "AbortError") return;
        console.error(e);
        setErreur(e.message || "Erreur de chargement");
        setLoading(false);
      });

    return () => controller.abort();
  }, [searchParams, cleFamille, categorie, reference]);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="carte p-6 flex gap-6 items-center">
          <div className="h-24 w-24 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 flex-shrink-0"></div>
          <div className="flex-1 space-y-3">
            <div className="h-8 bg-brand-light-grey/30 dark:bg-white/5 rounded-md w-1/3"></div>
            <div className="h-4 bg-brand-light-grey/20 dark:bg-white/5 rounded-md w-2/3"></div>
          </div>
        </div>
        <div className="h-8 bg-brand-light-grey/20 dark:bg-white/5 rounded-md w-1/4 mb-4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="carte p-4 h-32 border border-brand-light-grey/50 dark:border-white/5">
              <div className="h-5 bg-brand-light-grey/30 dark:bg-white/5 rounded-md w-1/2 mb-3"></div>
              <div className="h-4 bg-brand-light-grey/20 dark:bg-white/5 rounded-md w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (erreur) {
    return (
      <div className="space-y-4">
        <button onClick={() => majUrl({ vue: "categorie", cle: null })} className="btn btn-secondaire">
          <IconeChevronGauche taille={16} /> Retour
        </button>
        <div className="alerte-erreur" role="alert">{erreur}</div>
      </div>
    );
  }

  if (!stats && !loading) {
    return (
      <div className="space-y-4">
        <button onClick={() => majUrl({ vue: "categorie", cle: null })} className="btn btn-secondaire">
          <IconeChevronGauche taille={16} /> Retour
        </button>
        <div className="carte flex flex-col items-center justify-center p-12 text-brand-warm-grey">
          <div className="w-16 h-16 bg-brand-light-grey/20 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <div className="text-lg font-bold font-outfit text-brand-black dark:text-white mb-1">Aucun produit trouvé</div>
          <div className="text-sm">Cette catégorie ne contient aucun produit avec les filtres actuels.</div>
        </div>
      </div>
    );
  }

  const unites = stats?.unites || 0;
  const dispos = stats?.dispos || 0;
  const aTester = stats?.aTester || 0;
  
  // Prix: le serveur renvoie Min/Max
  const prixMin = stats?.prixMin ?? null;
  const prixMax = stats?.prixMax ?? null;

  return (
    <div className="space-y-6 animate-entree pb-8">
      {/* En-tête Navigation (Breadcrumb) */}
      <div className="flex items-center gap-2 text-sm text-brand-warm-grey font-medium pb-2 border-b border-brand-light-grey/50">
        <button
          onClick={() => majUrl({ vue: "categorie", cle: null })}
          className="hover:text-brand-orange transition-colors flex items-center gap-1 bg-white dark:bg-brand-paper px-2 py-1 rounded-md border border-brand-light-grey dark:border-white/10 shadow-sm"
          title="Retour à la catégorie"
        >
          <IconeChevronGauche taille={14} /> {categorie}
        </button>
        <span>/</span>
        <span className="font-bold text-brand-black dark:text-white font-outfit text-lg">
          {reference}
        </span>
      </div>

      {/* Bannière de la Catégorie */}
      <div className="carte overflow-hidden !p-0 border border-brand-light-grey dark:border-white/10 shadow-lg relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-black/5 to-transparent dark:from-white/5 z-0 pointer-events-none"></div>
        <div className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="h-40 w-40 sm:h-48 sm:w-48 rounded-2xl bg-white dark:bg-black/40 border-4 border-white dark:border-brand-paper shadow-md flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0">
              {familleInfo?.image_url || stats?.image_url ? (
                <img src={familleInfo?.image_url || stats?.image_url!} alt={familleInfo?.nom || reference} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="text-brand-warm-grey text-sm uppercase font-bold opacity-50">Sans photo</span>
              )}
            </div>
            
            <div className="flex-1 flex flex-col justify-center text-center sm:text-left">
              {familleInfo?.nom ? (
                <>
                  <h3 className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-2">{familleInfo.nom}</h3>
                  <div className="inline-block text-sm font-semibold px-3 py-1 bg-brand-light-grey/30 dark:bg-white/10 rounded-full text-brand-warm-grey dark:text-brand-warm-grey self-center sm:self-start mb-4">Ref: {reference}</div>
                </>
              ) : (
                <h3 className="text-3xl font-extrabold text-brand-black dark:text-white font-outfit mb-4">{reference}</h3>
              )}
              
              {familleInfo?.description && (
                <p className="text-sm text-brand-warm-grey dark:text-brand-warm-grey/80 whitespace-pre-wrap max-w-2xl mb-6 bg-white/50 dark:bg-black/20 p-4 rounded-xl border border-brand-light-grey/50 dark:border-white/5 backdrop-blur-sm">
                  {familleInfo.description}
                </p>
              )}
              
              <div className="flex flex-wrap justify-center sm:justify-start gap-4 sm:gap-8 mt-auto">
                <div className="text-center sm:text-left">
                  <div className="text-[10px] font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider mb-1">Exemplaires</div>
                  <div className="text-2xl font-extrabold text-brand-black dark:text-white font-outfit">{unites}</div>
                </div>
                <div className="w-px bg-brand-light-grey dark:bg-white/10 hidden sm:block"></div>
                <div className="text-center sm:text-left">
                  <div className="text-[10px] font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider mb-1">Disponibles</div>
                  <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 font-outfit">{dispos}</div>
                </div>
                <div className="w-px bg-brand-light-grey dark:bg-white/10 hidden sm:block"></div>
                <div className="text-center sm:text-left">
                  <div className="text-[10px] font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider mb-1">À tester</div>
                  <div className="text-2xl font-extrabold text-amber-600 dark:text-amber-400 font-outfit">{aTester}</div>
                </div>
                <div className="w-px bg-brand-light-grey dark:bg-white/10 hidden sm:block"></div>
                <div className="text-center sm:text-left">
                  <div className="text-[10px] font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider mb-1">Prix de vente</div>
                  <div className="text-2xl font-extrabold text-brand-orange font-outfit">
                    {prixMin === null 
                      ? "Non tarifé" 
                      : prixMin === prixMax 
                        ? formaterDA(prixMin) 
                        : `${formaterDA(prixMin)} - ${formaterDA(prixMax!)}`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-brand-light-grey/20 dark:bg-black/20 px-6 py-4 border-t border-brand-light-grey/50 dark:border-white/5 flex flex-wrap gap-3 items-center justify-center sm:justify-start">
          <button
            onClick={() => setEditionFamille(true)}
            className="btn bg-white dark:bg-brand-paper hover:bg-brand-light-grey/30 dark:hover:bg-white/5 border border-brand-light-grey dark:border-white/10 text-brand-black dark:text-white text-sm shadow-sm"
          >
            <IconeCrayon taille={16} className="text-brand-orange" /> 
            <span className="font-semibold">Personnaliser la fiche</span>
          </button>
        </div>
      </div>



      {editionFamille && (
        <ModaleEditionFamille
          cleFamille={cleFamille}
          familleInfo={familleInfo}
          fermer={() => setEditionFamille(false)}
          onSucces={(nouvelleInfo) => {
            setFamilleInfo(nouvelleInfo);
            setEditionFamille(false);
          }}
        />
      )}
    </div>
  );
}
