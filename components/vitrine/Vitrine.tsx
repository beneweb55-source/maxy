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
  modele_id: number | null;
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

/* ─── Skeleton card for loading state ─── */
function CarteSquelette() {
  return (
    <div className="carte !p-0 overflow-hidden animate-pulse">
      <div className="aspect-[4/3] w-full bg-brand-light-grey/30 dark:bg-white/[0.04] relative">
        {/* Fake shimmer line */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/5 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      </div>
      <div className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-20 rounded-full bg-brand-light-grey/50 dark:bg-white/10" />
          <div className="h-4 w-16 rounded bg-brand-light-grey/40 dark:bg-white/[0.06]" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded-md bg-brand-light-grey/50 dark:bg-white/10" />
          <div className="h-3.5 w-1/2 rounded-md bg-brand-light-grey/40 dark:bg-white/[0.06]" />
        </div>
        <div className="border-t border-brand-light-grey/40 dark:border-white/[0.06] pt-3">
          <div className="flex items-center justify-between">
            <div className="h-6 w-28 rounded-md bg-brand-light-grey/50 dark:bg-white/10" />
            <div className="h-7 w-16 rounded-full bg-brand-light-grey/40 dark:bg-white/[0.06]" />
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <div className="h-11 flex-1 rounded-xl bg-brand-light-grey/30 dark:bg-white/[0.04]" />
          <div className="h-11 w-11 rounded-xl bg-brand-light-grey/30 dark:bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
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
      {/* ─── Header ─── */}
      <div className="relative flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-light-grey/50 dark:border-white/10 bg-gradient-to-br from-brand-paper to-white dark:from-white/5 dark:to-white/[0.02] px-4 sm:px-5 py-3 sm:py-4">
        <div>
          <h1 className="inline-flex items-center gap-2 sm:gap-2.5 text-xl sm:text-2xl lg:text-3xl font-extrabold tracking-tight text-brand-black dark:text-white">
            <span className="inline-flex items-center justify-center rounded-xl bg-brand-orange/10 p-1 sm:p-1.5">
              <IconeVitrine taille={20} className="text-brand-orange sm:hidden" />
              <IconeVitrine taille={24} className="text-brand-orange hidden sm:block" />
            </span>
            {t("vitrine.titre")}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-brand-warm-grey dark:text-brand-warm-grey">
            {t("vitrine.sousTitre")}
          </p>
        </div>
      </div>

      {/* ─── Error state ─── */}
      {erreur && (
        <div className="rounded-2xl bg-danger/10 border border-danger/30 px-4 py-3 text-xs font-bold text-danger" role="alert">
          {erreur}
        </div>
      )}

      {/* ─── Loading state ─── */}
      {donnees === null && !erreur && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <CarteSquelette key={i} />
          ))}
        </div>
      )}

      {/* ─── Empty state ─── */}
      {donnees !== null && produits.length === 0 && (
        <div className="carte border-dashed border-brand-light-grey/60 dark:border-white/[0.08] p-10 sm:p-14 text-center">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-orange/15 to-brand-orange/5 dark:from-brand-orange/10 dark:to-brand-orange/[0.03] shadow-inner">
            <IconeVitrine taille={36} className="text-brand-orange" />
          </div>
          <p className="font-extrabold text-xl text-brand-black dark:text-white">
            {t("vitrine.videTitre")}
          </p>
          <p className="mt-2.5 max-w-sm mx-auto text-sm text-brand-warm-grey leading-relaxed">
            {t("vitrine.videDescription")}
          </p>
          <Link
            href="/inventaire"
            className="btn btn-primaire mt-7 inline-flex items-center gap-2 min-h-[48px] rounded-xl shadow-lg shadow-brand-orange/20"
          >
            {t("vitrine.allerInventaire")}
          </Link>
        </div>
      )}

      {/* ─── Product grid ─── */}
      {produits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {produits.map((p) => {
            const dispo = unitesVendables(p);
            const vendable = dispo.length > 0;
            const prix = p.prix_vente_fixe ?? (dispo[0]?.prix_vente_fixe ?? null);

            return (
              <Link
                key={p.id}
                href={`/produits/${p.id}`}
                className="carte group relative flex flex-col !p-0 overflow-hidden transition-all duration-300 ease-out hover:shadow-xl hover:shadow-brand-orange/[0.07] hover:border-brand-orange/40 dark:hover:border-brand-orange/30 hover:-translate-y-1 text-left block"
              >
                {/* ─── Image area ─── */}
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
                  className="relative block aspect-[4/3] w-full overflow-hidden bg-brand-paper dark:bg-white/[0.03] text-left focus:outline-none cursor-pointer"
                >
                  <GalerieCarte images={p.images} reference={p.reference} />

                  {/* Bottom gradient for text readability on image */}
                  <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />

                  <span className="absolute left-2.5 top-2.5 z-10">
                    <BadgeStatut statut={p.statut} />
                  </span>

                  {p.images.length > 1 && (
                    <span className="absolute right-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full bg-black/50 dark:bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-md shadow-sm">
                      <IconeImage taille={11} />
                      {p.images.length}
                    </span>
                  )}
                </div>

                {/* ─── Card body ─── */}
                <div className="flex flex-1 flex-col gap-2 p-3.5 sm:p-4">
                  {/* Code + Category row */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] sm:text-xs font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                      {p.code_interne}
                    </span>
                    {p.categorie && (
                      <span className="text-[10px] sm:text-[11px] font-semibold text-brand-warm-grey truncate max-w-[100px] sm:max-w-[120px]">
                        {p.categorie}
                      </span>
                    )}
                  </div>

                  {/* Reference */}
                  <h3 className="line-clamp-2 text-sm font-bold text-brand-black dark:text-white leading-snug group-hover:text-brand-orange dark:group-hover:text-brand-orange transition-colors duration-200">
                    {p.reference}
                  </h3>

                  {/* Price + Quantity manager */}
                  <div className="mt-auto flex items-end justify-between pt-3 border-t border-brand-light-grey/40 dark:border-white/[0.06] gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-brand-orange/70 block mb-0.5">Prix</span>
                      <span className="text-base sm:text-lg font-black text-brand-orange font-mono leading-none">
                        {prix !== null ? formaterDA(prix) : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <GestionnaireQuantite
                        produitId={p.id}
                        modeleId={p.modele_id}
                        quantiteActuelle={p.quantite}
                        unitesIds={p.ids_en_vitrine}
                        peutModifier={peutRetirer}
                        onChangement={() => void charger()}
                        taille="sm"
                      />
                    </div>
                  </div>

                  {/* ─── Primary actions: Vendre & Prix ─── */}
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
                            className="btn btn-primaire flex-1 justify-center min-h-[48px] rounded-xl text-xs font-bold gap-1.5 shadow-sm"
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
                            className="btn btn-secondaire px-2.5 min-h-[48px] rounded-xl"
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
                          className="btn btn-secondaire w-full justify-center min-h-[48px] rounded-xl text-xs font-bold text-brand-orange border-brand-orange/30 hover:bg-brand-orange/10 gap-1.5"
                        >
                          <IconeEtiquette taille={14} />
                          Mettre en vente
                        </button>
                      )}
                    </div>
                  )}

                  {/* ─── Secondary actions: Imprimer & Retirer ─── */}
                  <div
                    className="flex items-center justify-between pt-2.5 border-t border-brand-light-grey/40 dark:border-white/[0.06] text-[11px]"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                  >
                    {dispo.length > 0 ? (
                      <BoutonImpression
                        ids={dispo.map((v) => v.id)}
                        dejaImprimee={dispo.every((v) => v.etiquette_imprimee)}
                        className="flex items-center gap-1 font-semibold text-brand-warm-grey hover:text-brand-black dark:hover:text-white transition-colors"
                        texte={t("vitrine.imprimer")}
                      />
                    ) : (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Prix non fixé
                      </span>
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
                        className="font-semibold text-brand-warm-grey hover:text-red-600 dark:hover:text-red-400 transition-colors"
                        title="Retirer ce modèle de la vitrine"
                      >
                        {t("vitrine.retirerVitrine")}
                      </button>
                    )}
                  </div>

                  {/* ─── Voir détails link ─── */}
                  <span
                    className="flex items-center justify-center gap-1 pt-1 text-[11px] font-semibold text-brand-warm-grey/70 group-hover:text-brand-orange dark:group-hover:text-brand-orange transition-colors duration-200"
                    aria-hidden="true"
                  >
                    Voir détails
                    <svg className="w-3 h-3 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* ═══════════════════ MODALE MISE EN VENTE ═══════════════════ */}
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

      {/* ═══════════════════ MODALE VENTE & FACTURATION ═══════════════════ */}
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
