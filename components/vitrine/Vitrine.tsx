"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useT } from "@/lib/i18n/contexte";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import GalerieCarte from "./GalerieCarte";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  IconeAlerte,
  IconeBillet,
  IconeImage,
  IconePlus,
  IconeTelechargement,
  IconeVitrine,
  IconeEtiquette,
  IconeCoche,
} from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";
import ModaleVente, { ArticleAVendre } from "@/components/ventes/ModaleVente";
import ModaleMiseEnVente from "@/components/ventes/ModaleMiseEnVente";

interface UniteVendable {
  id: number;
  code_interne: string;
  prix_vente_fixe: number | null;
  etiquette_imprimee: boolean;
}

interface UniteStock {
  id: number;
  code_interne: string;
  statut: StatutProduit;
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

interface LignePanier {
  id: number;
  code_interne: string;
  reference: string;
  prix: number;
  etiquette_imprimee: boolean;
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

  // Panier de vente
  const [panier, setPanier] = useState<Map<number, LignePanier>>(new Map());

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

  function ajouterUnite(carte: CarteVitrine) {
    const dispo = unitesVendables(carte);
    setPanier((prev) => {
      const suivant = new Map(prev);
      const libre = dispo.find((v) => !suivant.has(v.id));
      if (!libre) {
        afficher("Plus d'exemplaire disponible à la vente pour ce modèle.", "erreur");
        return prev;
      }
      suivant.set(libre.id, {
        id: libre.id,
        code_interne: libre.code_interne,
        reference: carte.reference,
        prix: libre.prix_vente_fixe!,
        etiquette_imprimee: libre.etiquette_imprimee,
      });
      return suivant;
    });
  }

  function definirQuantitePanier(carte: CarteVitrine, qttVoulue: number) {
    const dispo = unitesVendables(carte);
    const qtt = Math.max(0, Math.min(qttVoulue, dispo.length));
    
    setPanier((prev) => {
      const suivant = new Map(prev);
      const dejaDuModele = dispo.filter((v) => suivant.has(v.id));
      const nbActuel = dejaDuModele.length;

      if (qtt > nbActuel) {
        const libres = dispo.filter((v) => !suivant.has(v.id));
        for (let i = 0; i < qtt - nbActuel; i++) {
          const l = libres[i];
          if (l) {
            suivant.set(l.id, {
              id: l.id,
              code_interne: l.code_interne,
              reference: carte.reference,
              prix: l.prix_vente_fixe!,
              etiquette_imprimee: l.etiquette_imprimee,
            });
          }
        }
      } else if (qtt < nbActuel) {
        for (let i = 0; i < nbActuel - qtt; i++) {
          suivant.delete(dejaDuModele[dejaDuModele.length - 1 - i]!.id);
        }
      }
      return suivant;
    });
  }

  function ouvrirVentePanier() {
    const articles: ArticleAVendre[] = Array.from(panier.values()).map((l) => ({
      id: l.id,
      code_interne: l.code_interne,
      reference: l.reference,
      prix_vente_fixe: l.prix,
      prix_vente_reel: l.prix,
      etiquette_imprimee: l.etiquette_imprimee,
    }));
    setArticlesPourVente(articles);
    setModalVente(true);
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
      prix_vente_fixe: v.prix_vente_fixe,
      prix_vente_reel: v.prix_vente_fixe,
      etiquette_imprimee: v.etiquette_imprimee,
    }));
    setArticlesPourVente(articles);
    setModalVente(true);
  }

  const lignesPanier = Array.from(panier.values());
  const totalPanier = lignesPanier.reduce((s, l) => s + l.prix, 0);

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

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black">{donnees.total}</strong>{" "}
          {t("vitrine.modelesVitrine", { n: "", s: donnees.total > 1 ? "s" : "" }).replace("{n} ", "")}{" "}
          <strong className="text-brand-black">
            {produits.reduce((s, p) => s + p.quantite, 0)}
          </strong>{" "}
          {t("vitrine.exemplairesStock", { n: "", s: produits.reduce((s, p) => s + p.quantite, 0) > 1 ? "s" : "" }).replace("· {n} ", "").replace("·  ", "")}
        </p>
      )}

      {!erreur && donnees === null && (
        <p className="text-sm text-brand-warm-grey">{t("vitrine.chargement")}</p>
      )}

      {donnees && produits.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <IconeVitrine taille={32} className="mx-auto mb-3 text-brand-grey" />
          <p className="font-semibold text-brand-black">{t("vitrine.vide")}</p>
          <p className="mt-1">
            {t("vitrine.videDesc")}
          </p>
          <Link href="/inventaire" className="btn btn-primaire mt-4">
            {t("navigation.inventaire")}
          </Link>
        </div>
      )}

      {produits.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {produits.map((p) => {
            const prix = p.prix_vente_reel ?? p.prix_vente_fixe;
            const dispo = unitesVendables(p);
            const nbAuPanier = dispo.filter((v) => panier.has(v.id)).length;
            const vendable = dispo.length > 0;
            const nonMisEnVente = p.quantite > dispo.length;

            return (
              <div
                key={p.id}
                className={`group flex flex-col overflow-hidden rounded-2xl border bg-brand-white/90 backdrop-blur-lg transition-all duration-300 hover:shadow-lg ${
                  nbAuPanier > 0
                    ? "border-brand-orange ring-2 ring-brand-orange shadow-md"
                    : "border-brand-light-grey/80"
                }`}
              >
                <button
                  type="button"
                  onClick={() =>
                    p.images.length > 0 &&
                    setApercuPhotos({ photos: p.images, index: 0, titre: p.code_interne })
                  }
                  title={p.images.length > 0 ? "Voir les photos en grand" : undefined}
                  aria-label={`Photos de ${p.reference}`}
                  className={`relative block aspect-square w-full overflow-hidden bg-brand-paper ${
                    p.images.length > 0 ? "cursor-zoom-in" : "cursor-default"
                  }`}
                >
                  {p.images && p.images.length > 0 ? (
                    <GalerieCarte images={p.images} reference={p.reference} />
                  ) : p.image_url ? (
                    <GalerieCarte images={[p.image_url]} reference={p.reference} />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-brand-grey">
                      <IconeImage taille={28} />
                    </span>
                  )}
                  {p.quantite > 1 && (
                    <span
                      className="absolute left-2 top-2 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-bold text-white shadow"
                      title={`${p.quantite} exemplaires identiques en stock`}
                    >
                      ×{p.quantite} en stock
                    </span>
                  )}
                  {p.images.length > 1 && (
                    <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                      <IconeImage taille={11} />
                      {p.images.length}
                    </span>
                  )}
                  {nbAuPanier > 0 && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-brand-orange px-2.5 py-1 text-xs font-bold text-white shadow-md">
                      {nbAuPanier} au panier
                    </span>
                  )}
                </button>

                <div className="flex flex-1 flex-col gap-2 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                      {p.code_interne}
                    </span>
                    {p.categorie && (
                      <span className="text-[11px] font-semibold text-brand-grey truncate max-w-[120px]">
                        {p.categorie}
                      </span>
                    )}
                  </div>

                  <h3 className="line-clamp-2 text-sm font-bold text-brand-black leading-snug">
                    {p.reference}
                  </h3>

                  <div className="mt-auto flex items-baseline justify-between pt-2 border-t border-brand-light-grey/40">
                    <span className="text-base font-black text-brand-black">
                      {prix !== null ? formaterDA(prix) : "—"}
                    </span>
                    <span className="text-xs font-medium text-brand-grey">
                      {dispo.length} vendable{dispo.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Actions Métier : Vendre / Mettre en vente */}
                  {peutVendre && (
                    <div className="space-y-1.5 pt-1">
                      {vendable ? (
                        nbAuPanier === 0 ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={envoi}
                              onClick={() => ajouterUnite(p)}
                              className="btn btn-primaire flex-1 justify-center min-h-[42px] text-xs font-bold gap-1.5"
                            >
                              <IconeBillet taille={14} />
                              {t("vitrine.vendre")}
                            </button>
                            <button
                              type="button"
                              onClick={() => ouvrirMiseEnVente(p)}
                              title="Modifier le prix ou mettre en vente"
                              className="btn btn-secondaire px-2.5 min-h-[42px] text-xs"
                            >
                              <IconeEtiquette taille={14} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex w-full items-center justify-between rounded-xl border border-brand-orange/40 bg-brand-orange/5 p-1 min-h-[42px]">
                            <button
                              type="button"
                              disabled={envoi}
                              onClick={() => definirQuantitePanier(p, nbAuPanier - 1)}
                              className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-brand-orange hover:bg-brand-orange/20 font-black text-sm"
                            >
                              -
                            </button>
                            <span className="text-xs font-black text-brand-orange">
                              {nbAuPanier} / {dispo.length}
                            </span>
                            <button
                              type="button"
                              disabled={envoi || nbAuPanier >= dispo.length}
                              onClick={() => definirQuantitePanier(p, nbAuPanier + 1)}
                              className="flex h-8 w-8 min-h-[32px] min-w-[32px] items-center justify-center rounded-lg text-brand-orange hover:bg-brand-orange/20 disabled:opacity-40 font-black text-sm"
                            >
                              +
                            </button>
                          </div>
                        )
                      ) : (
                        <button
                          type="button"
                          onClick={() => ouvrirMiseEnVente(p)}
                          className="btn btn-secondaire w-full justify-center min-h-[42px] text-xs font-bold text-brand-orange border-brand-orange/30 hover:bg-brand-orange/10 gap-1.5"
                        >
                          <IconeEtiquette taille={14} />
                          Mettre en vente
                        </button>
                      )}
                    </div>
                  )}

                  {/* Barre d'outils secondaire : Impression & Retrait */}
                  <div className="flex items-center justify-between pt-2 border-t border-brand-light-grey/40 text-xs">
                    {dispo.length > 0 ? (
                      <BoutonImpression 
                        ids={dispo.map((v) => v.id)} 
                        dejaImprimee={dispo.every((v) => v.etiquette_imprimee)} 
                        className="flex items-center gap-1 text-[11px] font-semibold text-brand-warm-grey hover:text-brand-black"
                        texte={t("vitrine.imprimer")}
                      />
                    ) : (
                      <span className="text-[11px] text-amber-600 font-medium">Prix non fixé</span>
                    )}

                    {peutRetirer && (
                      <button
                        type="button"
                        disabled={envoi}
                        onClick={() => void retirer(p)}
                        className="text-[11px] font-semibold text-brand-warm-grey hover:text-danger transition"
                        title="Retirer ce modèle de la vitrine"
                      >
                        {t("vitrine.retirerVitrine")}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Barre de vente : récapitulatif du panier, toujours visible en bas */}
      {peutVendre && lignesPanier.length > 0 && (
        <div className="sticky bottom-4 z-30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-brand-orange/30 bg-brand-white/95 p-3.5 sm:p-4 shadow-2xl backdrop-blur-md">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 rounded-xl bg-brand-orange text-white font-black text-sm items-center justify-center">
              {lignesPanier.length}
            </span>
            <div className="text-xs sm:text-sm text-brand-warm-grey">
              <span>{t("vitrine.produitsPanier", { n: lignesPanier.length })} · </span>
              <strong className="text-base sm:text-lg font-black text-brand-orange font-mono">
                {formaterDA(totalPanier)}
              </strong>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPanier(new Map())}
              className="btn btn-secondaire flex-1 sm:flex-initial min-h-[44px] text-xs font-bold"
            >
              {t("vitrine.viderPanier")}
            </button>
            <button
              type="button"
              onClick={ouvrirVentePanier}
              className="btn btn-primaire flex-1 sm:flex-initial min-h-[44px] text-xs font-bold gap-1.5 shadow-md"
            >
              <IconeBillet taille={16} />
              {t("vitrine.vendreFacturer")}
            </button>
          </div>
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

      {/* ===================== MODALE VENTE & FACTURATION ===================== */}
      {modalVente && (
        <ModaleVente
          ouverte={modalVente}
          unites={articlesPourVente}
          onFermer={() => setModalVente(false)}
          onSucces={async () => {
            setModalVente(false);
            setPanier(new Map());
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
