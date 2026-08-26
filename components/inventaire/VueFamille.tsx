import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { encodeBase64Url } from "@/lib/base64url";
import Link from "next/link";
import { IconeChevronGauche, IconeCrayon, IconeImprimante, IconeVitrine, IconeCorbeille, IconeOeil } from "@/components/icons";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import type { StatutProduit } from "@prisma/client";
import ModaleEditionFamille, { type FamilleInfo } from "./ModaleEditionFamille";

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
  const [produits, setProduits] = useState<LigneProduit[]>([]);
  const [familleInfo, setFamilleInfo] = useState<FamilleInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [editionFamille, setEditionFamille] = useState(false);

  // La cleFamille est "reference|categorie"
  const [reference, categorie] = cleFamille.split("|");

  useEffect(() => {
    setLoading(true);
    // On hérite des filtres de l'inventaire (comme statuts, sans_photo, etc.)
    // mais on retire la recherche textuelle 'q' et la pagination 'page'
    // qui fausseraient la récupération des produits de cette famille précise.
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.delete("q");
    params.delete("page");
    params.set("categorie", categorie ?? "");
    params.set("reference_exacte", reference ?? "");
    
    const fetchProduits = fetch(`/api/produits?${params.toString()}`).then(r => r.json());
    
    // Convert to base64url explicitly like we do in route
    const encodedId = encodeBase64Url(cleFamille);
    const fetchInfo = fetch(`/api/familles/${encodeURIComponent(encodedId)}`).then(r => r.json());

    Promise.all([fetchProduits, fetchInfo])
      .then(([dp, info]) => {
        setProduits(dp.produits);
        setFamilleInfo(info.id ? info : null);
        setLoading(false);
      })
      .catch(e => {
        console.error(e);
        setLoading(false);
      });
  }, [searchParams, cleFamille, categorie, reference]);

  if (loading) {
    return <div className="p-4 text-sm text-brand-warm-grey">Chargement de la famille...</div>;
  }

  if (produits.length === 0) {
    return (
      <div className="space-y-4">
        <button onClick={() => majUrl({ vue: "categorie" })} className="btn btn-secondaire">
          <IconeChevronGauche taille={16} /> Retour
        </button>
        <div className="carte text-center p-8 text-brand-warm-grey">Aucun produit trouvé.</div>
      </div>
    );
  }

  const premier = produits[0]!;
  const unites = produits.length;
  const dispos = produits.filter(p => !["vendu", "hs", "a_reparer", "manque_piece"].includes(p.statut)).length;
  const aTester = produits.filter(p => p.statut === "en_test").length;
  
  const prix = produits.map(p => p.prix_vente_fixe).filter(v => v !== null) as number[];
  const prixMin = prix.length > 0 ? Math.min(...prix) : null;
  const prixMax = prix.length > 0 ? Math.max(...prix) : null;

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

      {/* Bannière de la Famille */}
      <div className="carte overflow-hidden !p-0 border border-brand-light-grey dark:border-white/10 shadow-lg relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-black/5 to-transparent dark:from-white/5 z-0 pointer-events-none"></div>
        <div className="p-6 relative z-10">
          <div className="flex flex-col sm:flex-row gap-8">
            <div className="h-40 w-40 sm:h-48 sm:w-48 rounded-2xl bg-white dark:bg-black/40 border-4 border-white dark:border-brand-paper shadow-md flex items-center justify-center overflow-hidden shrink-0 mx-auto sm:mx-0">
              {familleInfo?.image_url || premier.image_url ? (
                <img src={familleInfo?.image_url || premier.image_url!} alt={familleInfo?.nom || reference} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
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
          
          <div className="h-6 w-px bg-brand-light-grey dark:bg-white/10 hidden sm:block mx-2"></div>
          
          <button
            onClick={() => ouvrirEdition(produits, reference!)}
            className="btn btn-secondaire text-sm bg-transparent border-transparent hover:bg-brand-light-grey/30 dark:hover:bg-white/5 text-brand-warm-grey dark:text-brand-warm-grey"
          >
            <IconeCrayon taille={14} /> Modifier tous les produits
          </button>
          {produits.some(p => p.statut !== "vendu") && (
            <button
              onClick={() => ouvrirSuppressionUnites(produits)}
              className="btn btn-secondaire text-sm border-transparent hover:border-danger hover:bg-danger/10 text-danger bg-transparent ml-auto"
            >
              <IconeCorbeille taille={14} /> Supprimer toute la famille
            </button>
          )}
        </div>
      </div>

      {/* Liste des exemplaires */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h3 className="text-xl font-bold text-brand-black dark:text-white font-outfit">Exemplaires physiques</h3>
          <span className="bg-brand-light-grey/30 dark:bg-white/10 text-brand-black dark:text-white px-2.5 py-0.5 rounded-full text-xs font-bold">
            {produits.length}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {produits.map((p) => (
            <div key={p.id} className="carte p-0 flex flex-col border border-brand-light-grey dark:border-white/10 hover:border-brand-smooth transition-colors overflow-hidden group">
              <div className="p-4 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold font-mono text-brand-black dark:text-white text-sm bg-brand-light-grey/30 dark:bg-white/10 inline-block px-2 py-1 rounded-md">{p.code_interne}</div>
                    <div className="text-xs text-brand-warm-grey dark:text-brand-grey mt-2 font-medium">
                      Entrée le {new Date(p.date_entree).toLocaleDateString("fr-FR")}
                    </div>
                  </div>
                  <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4 bg-brand-light-grey/10 dark:bg-white/5 p-3 rounded-lg border border-brand-light-grey/30 dark:border-white/5">
                  <div>
                    <span className="text-brand-warm-grey dark:text-brand-grey text-[10px] font-bold uppercase tracking-wider block mb-1">Prix achat</span>
                    <span className="font-bold text-brand-black dark:text-white">{formaterDA(p.prix_achat)}</span>
                  </div>
                  <div>
                    <span className="text-brand-orange/80 text-[10px] font-bold uppercase tracking-wider block mb-1">Prix vente</span>
                    <span className="font-extrabold text-brand-orange">
                      {p.prix_vente_fixe ? formaterDA(p.prix_vente_fixe) : "—"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-1 p-2 bg-brand-light-grey/20 dark:bg-black/20 border-t border-brand-light-grey/50 dark:border-white/5 items-center">
                <Link
                  href={`/produits/${p.id}`}
                  className="px-3 py-1.5 rounded-md text-brand-black dark:text-white bg-white dark:bg-brand-paper hover:bg-brand-light-grey/50 dark:hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-bold mr-auto border border-brand-light-grey dark:border-white/10 shadow-sm"
                  title="Voir la fiche détaillée"
                >
                  <IconeOeil taille={14} className="text-brand-orange" /> Ouvrir
                </Link>
                <div className="flex items-center opacity-70 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => ouvrirEdition([p], p.code_interne)}
                    className="p-2 rounded-md hover:bg-white dark:hover:bg-brand-paper text-brand-warm-grey dark:text-brand-warm-grey transition-colors"
                    title="Modifier cet exemplaire"
                  >
                    <IconeCrayon taille={15} />
                  </button>
                  <button
                    onClick={() => basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne)}
                    className={`p-2 rounded-md transition-colors ${
                      p.en_vitrine ? "text-brand-orange bg-brand-orange/10" : "text-brand-warm-grey dark:text-brand-warm-grey hover:bg-white dark:hover:bg-brand-paper"
                    }`}
                    title={p.en_vitrine ? "Retirer de la vitrine" : "Mettre en vitrine"}
                  >
                    <IconeVitrine taille={15} />
                  </button>
                  {p.statut !== "vendu" && (
                    <button
                      onClick={() => ouvrirSuppressionUnites([p])}
                      className="p-2 rounded-md hover:bg-danger/10 text-brand-warm-grey dark:text-brand-warm-grey hover:text-danger transition-colors ml-1"
                      title="Supprimer"
                    >
                      <IconeCorbeille taille={15} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
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
