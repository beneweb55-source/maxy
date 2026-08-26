import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconeChevronGauche, IconeCrayon, IconeImprimante, IconeVitrine, IconeCorbeille } from "@/components/icons";
import BadgeStatut from "@/components/BadgeStatut";
import { formaterDA } from "@/lib/caisse";
import type { StatutProduit } from "@prisma/client";

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
  const [loading, setLoading] = useState(true);

  // La cleFamille est "reference|categorie"
  const [reference, categorie] = cleFamille.split("|");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams(searchParams?.toString() || "");
    params.set("categorie", categorie ?? "");
    params.set("reference_exacte", reference ?? "");
    
    // On veut tous les produits de la famille (pas seulement la 1ere page de 50 si possible, 
    // mais on garde la pagination standard par défaut. L'idéal est de passer limit=1000).
    fetch(`/api/produits?${params.toString()}`)
      .then(r => r.json())
      .then(d => { setProduits(d.produits); setLoading(false); })
      .catch(e => { console.error(e); setLoading(false); });
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
    <div className="space-y-6 animate-entree">
      {/* En-tête Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => majUrl({ vue: "categorie", cle: null })}
          className="btn btn-secondaire px-2"
          title="Retour"
        >
          <IconeChevronGauche taille={16} />
        </button>
        <h2 className="text-2xl font-bold text-brand-black leading-tight">
          {reference}
        </h2>
      </div>

      {/* Résumé de la Famille */}
      <div className="carte p-4 sm:p-6 bg-brand-light-grey/10">
        <div className="flex flex-col sm:flex-row gap-6">
          {premier.image_url && (
            <div className="h-32 w-32 rounded-lg bg-white border border-brand-light-grey/50 flex items-center justify-center overflow-hidden shrink-0">
              <img src={premier.image_url} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 space-y-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <div className="text-sm text-brand-warm-grey uppercase tracking-wide">Exemplaires</div>
                <div className="text-2xl font-bold">{unites}</div>
              </div>
              <div>
                <div className="text-sm text-brand-warm-grey uppercase tracking-wide">Disponibles</div>
                <div className="text-2xl font-bold text-emerald-600">{dispos}</div>
              </div>
              <div>
                <div className="text-sm text-brand-warm-grey uppercase tracking-wide">À tester</div>
                <div className="text-2xl font-bold text-amber-600">{aTester}</div>
              </div>
              <div>
                <div className="text-sm text-brand-warm-grey uppercase tracking-wide">Prix de vente</div>
                <div className="text-2xl font-bold text-brand-orange">
                  {prixMin === null 
                    ? "Non tarifé" 
                    : prixMin === prixMax 
                      ? formaterDA(prixMin) 
                      : `${formaterDA(prixMin)} - ${formaterDA(prixMax!)}`}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-brand-light-grey/30">
              <button
                onClick={() => ouvrirEdition(produits, reference!)}
                className="btn btn-secondaire text-xs"
              >
                <IconeCrayon taille={14} /> Modifier toute la famille
              </button>
              {produits.some(p => p.statut !== "vendu") && (
                <button
                  onClick={() => ouvrirSuppressionUnites(produits)}
                  className="btn btn-secondaire text-xs text-danger hover:border-danger hover:bg-danger/5"
                >
                  <IconeCorbeille taille={14} /> Supprimer toute la famille
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des exemplaires */}
      <h3 className="text-lg font-bold text-brand-black">Exemplaires physiques</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {produits.map((p) => (
          <div key={p.id} className="carte p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold font-mono text-brand-black">{p.code_interne}</div>
                <div className="text-xs text-brand-warm-grey mt-0.5">
                  Arrivé le {new Date(p.date_entree).toLocaleDateString("fr-FR")}
                </div>
              </div>
              <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm mt-1">
              <div>
                <span className="text-brand-warm-grey text-xs block">Prix achat</span>
                <span className="font-medium">{formaterDA(p.prix_achat)}</span>
              </div>
              <div>
                <span className="text-brand-warm-grey text-xs block">Prix vente</span>
                <span className="font-medium text-brand-orange">
                  {p.prix_vente_fixe ? formaterDA(p.prix_vente_fixe) : "—"}
                </span>
              </div>
            </div>

            <div className="flex gap-1 mt-auto pt-2 border-t border-brand-light-grey/30">
              <button
                onClick={() => ouvrirEdition([p], p.code_interne)}
                className="p-1.5 rounded-md hover:bg-brand-light-grey/50 text-brand-warm-grey transition"
                title="Modifier cet exemplaire"
              >
                <IconeCrayon taille={16} />
              </button>
              <button
                onClick={() => basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne)}
                className={`p-1.5 rounded-md transition ${
                  p.en_vitrine ? "text-brand-orange bg-brand-orange/10" : "text-brand-warm-grey hover:bg-brand-light-grey/50"
                }`}
                title={p.en_vitrine ? "Retirer de la vitrine" : "Mettre en vitrine"}
              >
                <IconeVitrine taille={16} />
              </button>
              {p.statut !== "vendu" && (
                <button
                  onClick={() => ouvrirSuppressionUnites([p])}
                  className="p-1.5 rounded-md hover:bg-danger/10 text-brand-warm-grey hover:text-danger transition ml-auto"
                  title="Supprimer"
                >
                  <IconeCorbeille taille={16} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
