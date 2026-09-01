"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/contexte";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import GalerieCarte from "./GalerieCarte";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  IconeBillet,
  IconeImage,
  IconeVitrine,
  IconeEtiquette,
} from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";
import ModaleVente, { ArticleAVendre } from "@/components/ventes/ModaleVente";
import ModaleMiseEnVente from "@/components/ventes/ModaleMiseEnVente";
import GestionnaireQuantite from "@/components/produits/GestionnaireQuantite";

interface UniteVendable {
  id: number;
  code_interne: string;
  numero_serie?: string | null;
  grade?: string | null;
  prix_achat?: number;
  prix_vente_fixe: number | null;
  etiquette_imprimee: boolean;
}

interface UniteStock {
  id: number;
  code_interne: string;
  numero_serie?: string | null;
  grade?: string | null;
  statut: StatutProduit;
  prix_achat?: number;
  prix_vente_fixe: number | null;
  etiquette_imprimee: boolean;
}

interface CarteVitrine {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  image_url: string | null;
  images: string[];
  quantite: number;
  ids_en_vitrine: number[];
  vendables: UniteVendable[];
  unites_stock?: UniteStock[];
}

interface ReponseVitrine {
  total: number;
  produits: CarteVitrine[];
}

export default function Vitrine({ role }: { role: Role }) {
  const router = useRouter();
  const { afficher } = useToast();
  const t = useT();
  const [donnees, setDonnees] = useState<ReponseVitrine | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [apercuPhotos, setApercuPhotos] = useState<{
    photos: string[];
    index: number;
    titre: string;
  } | null>(null);

  // Modale Mise en vente (fixation de prix et statut en_vente)
  const [modalMiseEnVente, setModalMiseEnVente] = useState<CarteVitrine | null>(null);

  // Modale Vente & Facturation
  const [modalVente, setModalVente] = useState(false);
  const [articlesPourVente, setArticlesPourVente] = useState<ArticleAVendre[]>([]);

  const peutRetirer = role === "gerant" || role === "technicien" || role === "dev" || role === "social_media";
  const peutVendre = role === "gerant" || role === "dev" || role === "social_media";

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const res = await fetch("/api/vitrine");
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement de la vitrine.");
      }
      setDonnees((await res.json()) as ReponseVitrine);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function retirer(carte: CarteVitrine) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/produits/masse/vitrine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: carte.ids_en_vitrine, en_vitrine: false }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du retrait.", "erreur");
        return;
      }
      afficher(`${carte.reference} retiré de la vitrine.`);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  function unitesVendables(carte: CarteVitrine): UniteVendable[] {
    return carte.vendables.filter((v) => (v.prix_vente_fixe ?? 0) > 0);
  }

  function ouvrirMiseEnVente(carte: CarteVitrine) {
    setModalMiseEnVente(carte);
  }

  function ouvrirVenteDirecte(carte: CarteVitrine) {
    const dispo = unitesVendables(carte);
    if (dispo.length === 0) {
      ouvrirMiseEnVente(carte);
      return;
    }
    const articles: ArticleAVendre[] = dispo.map((v) => ({
      id: v.id,
      code_interne: v.code_interne,
      reference: carte.reference,
      numero_serie: v.numero_serie,
      grade: v.grade,
      prix_achat: v.prix_achat,
      prix_vente_fixe: v.prix_vente_fixe ?? carte.prix_vente_fixe,
      prix_vente_reel: v.prix_vente_fixe ?? carte.prix_vente_fixe,
      etiquette_imprimee: v.etiquette_imprimee,
      statut: "en_vente",
    }));
    setArticlesPourVente(articles);
    setModalVente(true);
  }

  const produits = donnees?.produits ?? [];

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <div>
          <h1 className="inline-flex items-center gap-2 text-3xl font-extrabold tracking-tight text-brand-black">
            <IconeVitrine taille={26} />
            {t("vitrine.titre")}
          </h1>
          <p className="mt-1 text-sm text-brand-warm-grey">
            {t("vitrine.sousTitre")}
          </p>
        </div>
      </div>

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}

      {donnees === null && !erreur && (
        <p className="text-sm text-brand-warm-grey">{t("vitrine.chargement")}</p>
      )}

      {donnees !== null && produits.length === 0 && (
        <div className="carte border-dashed p-10 text-center text-sm text-brand-warm-grey">
          <p className="font-bold text-base text-brand-black">{t("vitrine.videTitre")}</p>
          <p className="mt-1.5 max-w-md mx-auto text-xs">
            {t("vitrine.videDescription")}
          </p>
          <Link href="/inventaire" className="btn btn-primaire mt-4 inline-flex items-center gap-2">
            {t("vitrine.allerInventaire")}
          </Link>
        </div>
      )}

      {produits.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {produits.map((p) => {
            const dispo = unitesVendables(p);
            const vendable = dispo.length > 0;
            const prix = p.prix_vente_fixe ?? (dispo[0]?.prix_vente_fixe ?? null);

            return (
              <Link
                key={p.id}
                href={`/produits/${p.id}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs transition hover:shadow-md hover:border-brand-orange/40 text-left block"
              >
                {/* Image du produit avec Galerie intégrée */}
                <div
                  onClick={(e) => {
                    if (p.images.length > 0) {
                      e.preventDefault();
                      e.stopPropagation();
                      setApercuPhotos({
                        photos: p.images,
                        index: 0,
                        titre: `${p.reference} (${p.code_interne})`,
                      });
                    }
                  }}
                  className="relative block h-44 w-full overflow-hidden bg-slate-50 text-left focus:outline-none cursor-pointer"
                >
                  <GalerieCarte images={p.images} reference={p.reference} />

                  <span className="absolute left-2 top-2">
                    <BadgeStatut statut={p.statut} />
                  </span>

                  {p.images.length > 1 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      <IconeImage taille={11} />
                      {p.images.length}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                      {p.code_interne}
                    </span>
                    {p.categorie && (
                      <span className="text-[11px] font-semibold text-slate-500 truncate max-w-[120px]">
                        {p.categorie}
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-sm font-bold text-slate-900 leading-snug group-hover:text-brand-orange transition-colors">
                    {p.reference}
                  </h3>

                  <div className="mt-auto flex items-center justify-between pt-2 border-t border-slate-100 gap-2">
                    <span className="text-base font-black text-slate-900 font-mono">
                      {prix !== null ? formaterDA(prix) : "—"}
                    </span>
                    <div className="flex items-center gap-1">
                      <GestionnaireQuantite
                        produitId={p.id}
                        quantiteActuelle={p.quantite}
                        unitesIds={p.ids_en_vitrine}
                        peutModifier={peutRetirer}
                        onChangement={() => void charger()}
                        taille="sm"
                      />
                    </div>
                  </div>

                  {/* Actions Métier : Vendre & Facturer directement / Mettre en vente */}
                  {peutVendre && (
                    <div 
                      className="space-y-1.5 pt-1"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      {vendable ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={envoi}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              ouvrirVenteDirecte(p);
                            }}
                            className="btn btn-primaire flex-1 justify-center min-h-[42px] text-xs font-bold gap-1.5 shadow-sm rounded-md"
                          >
                            <IconeBillet taille={15} />
                            <span>{t("vitrine.vendre")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              ouvrirMiseEnVente(p);
                            }}
                            title="Modifier le prix ou mettre en vente"
                            className="btn btn-secondaire px-2.5 min-h-[42px] text-xs rounded-md"
                          >
                            <IconeEtiquette taille={14} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            ouvrirMiseEnVente(p);
                          }}
                          className="btn btn-secondaire w-full justify-center min-h-[42px] text-xs font-bold text-brand-orange border-brand-orange/30 hover:bg-brand-orange/10 gap-1.5 rounded-md"
                        >
                          <IconeEtiquette taille={14} />
                          Mettre en vente
                        </button>
                      )}
                    </div>
                  )}

                  {/* Barre d'outils secondaire : Impression & Retrait */}
                  <div 
                    className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {dispo.length > 0 ? (
                      <BoutonImpression 
                        ids={dispo.map((v) => v.id)} 
                        dejaImprimee={dispo.every((v) => v.etiquette_imprimee)} 
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-900"
                        texte={t("vitrine.imprimer")}
                      />
                    ) : (
                      <span className="text-[11px] text-amber-600 font-medium">Prix non fixé</span>
                    )}

                    {peutRetirer && (
                      <button
                        type="button"
                        disabled={envoi}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void retirer(p);
                        }}
                        className="text-[11px] font-semibold text-slate-400 hover:text-red-600 transition"
                        title="Retirer ce modèle de la vitrine"
                      >
                        {t("vitrine.retirerVitrine")}
                      </button>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ===================== MODALE MISE EN VENTE ===================== */}
      {modalMiseEnVente && (
        <ModaleMiseEnVente
          ouverte={modalMiseEnVente !== null}
          reference={modalMiseEnVente.reference}
          categorie={modalMiseEnVente.categorie}
          unites={(modalMiseEnVente.unites_stock ?? modalMiseEnVente.vendables).map((u) => ({
            id: u.id,
            code_interne: u.code_interne,
            prix_vente_fixe: u.prix_vente_fixe,
          }))}
          prixActuel={modalMiseEnVente.prix_vente_fixe}
          onFermer={() => setModalMiseEnVente(null)}
          onSucces={async () => {
            setModalMiseEnVente(null);
            await charger();
          }}
        />
      )}

      {/* ===================== MODALE VENTE & FACTURATION (RÉUTILISÉE À L'IDENTIQUE DE L'INVENTAIRE) ===================== */}
      {modalVente && (
        <ModaleVente
          ouverte={modalVente}
          unites={articlesPourVente}
          onFermer={() => setModalVente(false)}
          onSucces={async () => {
            setModalVente(false);
            await charger();
          }}
        />
      )}

      {apercuPhotos && (
        <VisionneusePhotos
          photos={apercuPhotos.photos}
          index={apercuPhotos.index}
          onFermer={() => setApercuPhotos(null)}
          onNaviguer={(i) => setApercuPhotos((a) => (a ? { ...a, index: i } : a))}
          lienTelechargement={(i) => `${apercuPhotos.photos[i]}?download=1`}
          titre={apercuPhotos.titre}
        />
      )}
    </div>
  );
}
