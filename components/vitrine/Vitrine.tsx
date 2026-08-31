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

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
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
  const [prixMiseEnVente, setPrixMiseEnVente] = useState("");
  const [unitesSelectionMiseEnVente, setUnitesSelectionMiseEnVente] = useState<number[]>([]);

  // Modale Vente & Facturation
  const [modalVente, setModalVente] = useState(false);
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [clientRc, setClientRc] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientAi, setClientAi] = useState("");
  const [clientNis, setClientNis] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [typeFacture, setTypeFacture] = useState("normale");
  const [modePaiement, setModePaiement] = useState("especes");
  const [especesRecues, setEspecesRecues] = useState("");
  const [garantieMois, setGarantieMois] = useState(6);
  const [etiquetteValidee, setEtiquetteValidee] = useState(false);
  const [avertissement, setAvertissement] = useState<string | null>(null);

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
    setPrixMiseEnVente(carte.prix_vente_fixe ? String(carte.prix_vente_fixe) : "");
    const ids = (carte.unites_stock ?? carte.vendables).map((u) => u.id);
    setUnitesSelectionMiseEnVente(ids);
  }

  async function validerMiseEnVente() {
    if (!modalMiseEnVente || unitesSelectionMiseEnVente.length === 0) return;
    const prix = Number(prixMiseEnVente);
    if (!prix || prix <= 0) {
      afficher("Veuillez saisir un prix de vente valide supérieur à 0.", "erreur");
      return;
    }
    setEnvoi(true);
    try {
      const res = await fetch("/api/produits/masse/prix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: unitesSelectionMiseEnVente,
          prix_vente_fixe: prix,
        }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la mise en vente.", "erreur");
        return;
      }
      afficher(`${unitesSelectionMiseEnVente.length} exemplaire(s) mis en vente à ${formaterDA(prix)}.`);
      setModalMiseEnVente(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
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

  function ouvrirVente() {
    setClientNom("");
    setClientTel("");
    setClientAdresse("");
    setClientRc("");
    setClientNif("");
    setClientAi("");
    setClientNis("");
    setCanal("");
    setDateVente(aujourdhuiIso());
    setTypeFacture("normale");
    setModePaiement("especes");
    setEspecesRecues("");
    setGarantieMois(6);
    setEtiquetteValidee(false);
    setAvertissement(null);
    setModalVente(true);
  }

  const lignesPanier = Array.from(panier.values());
  const totalPanier = lignesPanier.reduce((s, l) => s + l.prix, 0);
  const monnaieARendre = Number(especesRecues) > 0 ? Math.max(0, Number(especesRecues) - totalPanier) : 0;

  async function enregistrerVente(confirmer: boolean) {
    if (lignesPanier.length === 0) return;
    if (modePaiement === "credit" && !clientNom.trim()) {
      afficher("Veuillez saisir le nom du client pour une vente à crédit.", "erreur");
      return;
    }
    setEnvoi(true);
    try {
      const commun = {
        canal: canal.trim() || undefined,
        date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
        client_nom: clientNom.trim() || undefined,
        client_tel: clientTel.trim() || undefined,
        client_adresse: clientAdresse.trim() || undefined,
        client_rc: clientRc.trim() || undefined,
        client_nif: clientNif.trim() || undefined,
        client_ai: clientAi.trim() || undefined,
        client_nis: clientNis.trim() || undefined,
        type_facture: typeFacture,
        mode_paiement: modePaiement,
        etiquette_imprimee: etiquetteValidee || undefined,
        confirmer: confirmer || undefined,
      };
    
      const res =
        lignesPanier.length === 1
          ? await fetch("/api/ventes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_id: lignesPanier[0]!.id,
                prix_vente_reel: lignesPanier[0]!.prix,
                ...commun,
              }),
            })
          : await fetch("/api/ventes/groupee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_ids: lignesPanier.map((l) => l.id),
                prix_total: totalPanier,
                ...commun,
              }),
            });

      const corps = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            confirmation_required?: boolean;
            message?: string;
            error?: string;
            facture_id?: number;
            facture_numero?: string;
          }
        | null;

      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la vente.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setAvertissement(corps.message ?? "Prix sous la marge minimum. Confirmer ?");
        return;
      }

      afficher(
        `Vente enregistrée avec succès — facture ${corps?.facture_numero ?? ""} créée.`
      );
      setModalVente(false);
      setPanier(new Map());
      await charger();
      if (corps?.facture_id) {
        window.open(`/factures/${corps.facture_id}`, "_blank");
      }
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
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
              onClick={ouvrirVente}
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
        <Modale
          titre={`Mise en vente — ${modalMiseEnVente.reference}`}
          ouverte={modalMiseEnVente !== null}
          onFermer={() => setModalMiseEnVente(null)}
        >
          <div className="space-y-4">
            <p className="text-xs text-brand-warm-grey">
              Fixez le prix de vente unitaire pour rendre les exemplaires de ce modèle disponibles à la vente en boutique et en caisse.
            </p>

            <div>
              <label className="libelle mb-1.5" htmlFor="prix-fixe-input">
                Prix de vente fixe (DA) *
              </label>
              <input
                id="prix-fixe-input"
                type="number"
                value={prixMiseEnVente}
                onChange={(e) => setPrixMiseEnVente(e.target.value)}
                placeholder="Ex. 45000"
                autoFocus
                className="champ text-lg font-mono font-bold"
              />
            </div>

            {/* Sélection des exemplaires concernés */}
            {(() => {
              const unites = modalMiseEnVente.unites_stock ?? modalMiseEnVente.vendables;
              if (unites.length <= 1) return null;

              return (
                <div className="space-y-2 pt-2 border-t border-brand-light-grey/50">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>Exemplaires concernés ({unitesSelectionMiseEnVente.length}/{unites.length})</span>
                    <button
                      type="button"
                      onClick={() =>
                        setUnitesSelectionMiseEnVente(
                          unitesSelectionMiseEnVente.length === unites.length ? [] : unites.map((u) => u.id)
                        )
                      }
                      className="text-brand-orange hover:underline text-xs font-semibold"
                    >
                      {unitesSelectionMiseEnVente.length === unites.length ? "Tout désélectionner" : "Tout sélectionner"}
                    </button>
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-1.5 rounded-xl bg-brand-light-grey/20 p-2 text-xs">
                    {unites.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 cursor-pointer p-1 rounded hover:bg-brand-white/80">
                        <input
                          type="checkbox"
                          checked={unitesSelectionMiseEnVente.includes(u.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setUnitesSelectionMiseEnVente([...unitesSelectionMiseEnVente, u.id]);
                            } else {
                              setUnitesSelectionMiseEnVente(unitesSelectionMiseEnVente.filter((id) => id !== u.id));
                            }
                          }}
                          className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4"
                        />
                        <span className="font-mono font-bold text-brand-black">{u.code_interne}</span>
                        {u.prix_vente_fixe && (
                          <span className="text-brand-warm-grey">({formaterDA(u.prix_vente_fixe)})</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })()}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalMiseEnVente(null)}
                className="btn btn-secondaire"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoi || !prixMiseEnVente.trim() || Number(prixMiseEnVente) <= 0 || unitesSelectionMiseEnVente.length === 0}
                onClick={validerMiseEnVente}
                className="btn btn-primaire"
              >
                {envoi ? "Application..." : "Valider et Mettre en vente"}
              </button>
            </div>
          </div>
        </Modale>
      )}

      {/* ===================== MODALE VENTE & FACTURATION ===================== */}
      <Modale
        titre={`Vente & Facturation — ${lignesPanier.length} article${lignesPanier.length > 1 ? "s" : ""}`}
        ouverte={modalVente}
        onFermer={() => setModalVente(false)}
      >
        <div className="space-y-4 max-h-[80dvh] overflow-y-auto pr-1">
          {/* Liste des articles du panier */}
          <ul className="max-h-36 space-y-1.5 overflow-y-auto rounded-xl bg-brand-light-grey/25 p-3 text-xs">
            {lignesPanier.map((l) => (
              <li key={l.id} className="flex justify-between items-center gap-2">
                <span className="truncate" title={l.reference}>
                  <span className="font-mono font-bold text-brand-orange mr-1.5">{l.code_interne}</span>
                  <span className="font-medium text-brand-black">{l.reference}</span>
                </span>
                <span className="shrink-0 font-bold font-mono text-brand-black">{formaterDA(l.prix)}</span>
              </li>
            ))}
          </ul>

          <div className="flex justify-between items-center p-3 rounded-xl bg-brand-orange/10 border border-brand-orange/20">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-black">Total à Encaisser</span>
            <span className="text-xl font-black font-mono text-brand-orange">{formaterDA(totalPanier)}</span>
          </div>

          {/* Type de Document & Mode de Paiement */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="libelle mb-1.5" htmlFor="type-facture-vitrine">
                Type de Facture
              </label>
              <select
                id="type-facture-vitrine"
                value={typeFacture}
                onChange={(e) => setTypeFacture(e.target.value)}
                className="champ text-xs font-bold"
              >
                <option value="normale">Facture Normale (Standard)</option>
                <option value="tva">Facture avec TVA</option>
                <option value="proforma">Devis / Facture Proforma</option>
              </select>
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="mode-paiement-vitrine">
                Mode de Paiement
              </label>
              <select
                id="mode-paiement-vitrine"
                value={modePaiement}
                onChange={(e) => setModePaiement(e.target.value)}
                className="champ text-xs font-bold"
              >
                <option value="especes">Espèces</option>
                <option value="carte">Carte Bancaire / CIB</option>
                <option value="virement">Virement CCP</option>
                <option value="cheque">Chèque</option>
                <option value="credit">Vente à Crédit</option>
              </select>
            </div>
          </div>

          {/* Calcul de Monnaie si Espèces */}
          {modePaiement === "especes" && (
            <div className="p-3.5 rounded-xl bg-brand-light-grey/25 border border-brand-light-grey/60 space-y-2">
              <label className="libelle text-xs" htmlFor="especes-recues-vitrine">
                Montant Reçu en Espèces (DA)
              </label>
              <div className="flex items-center gap-3">
                <input
                  id="especes-recues-vitrine"
                  type="number"
                  value={especesRecues}
                  onChange={(e) => setEspecesRecues(e.target.value)}
                  placeholder={String(totalPanier)}
                  className="champ flex-1 font-bold font-mono text-base"
                />
                {monnaieARendre > 0 && (
                  <div className="flex flex-col text-right">
                    <span className="text-[10px] font-bold uppercase text-brand-grey">Monnaie à rendre</span>
                    <span className="text-base font-black font-mono text-succes">{formaterDA(monnaieARendre)}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* RÈGLE 2 ERP/WMS : Contrôle Étiquette Produit */}
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="toggle-etiquette-vitrine" className="text-xs font-bold text-amber-900 dark:text-amber-200 cursor-pointer select-none">
                Avez-vous imprimé et collé l&apos;étiquette sur les articles ?
              </label>
              <input
                id="toggle-etiquette-vitrine"
                type="checkbox"
                checked={etiquetteValidee}
                onChange={(e) => setEtiquetteValidee(e.target.checked)}
                className="toggle toggle-warning h-6 w-11 cursor-pointer"
              />
            </div>
            {!etiquetteValidee && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
                <span className="text-[11px] text-amber-800 dark:text-amber-300">
                  Sans confirmation, l&apos;article sera réservé.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ids = lignesPanier.map((l) => l.id);
                    window.open(`/imprimer-etiquettes?ids=${ids.join(",")}`, "_blank");
                    setEtiquetteValidee(true);
                  }}
                  className="btn btn-xs bg-brand-orange text-white hover:bg-brand-orange/90 font-bold"
                >
                  Imprimer l&apos;étiquette
                </button>
              </div>
            )}
          </div>

          {/* Coordonnées Client & Canal */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-client">
                {t("vitrine.nomClient")} {modePaiement === "credit" ? "*" : ""}
              </label>
              <input
                id="vitrine-client"
                type="text"
                value={clientNom}
                onChange={(e) => setClientNom(e.target.value)}
                placeholder="Ex. Karim M."
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-tel">
                Téléphone
              </label>
              <input
                id="vitrine-tel"
                type="tel"
                value={clientTel}
                onChange={(e) => setClientTel(e.target.value)}
                placeholder="0X XX XX XX XX"
                className="champ"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-date">
                Date de vente
              </label>
              <input
                id="vitrine-date"
                type="date"
                value={dateVente}
                max={aujourdhuiIso()}
                onChange={(e) => setDateVente(e.target.value)}
                className="champ font-mono"
              />
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="vitrine-canal">
                Canal de Vente
              </label>
              <input
                id="vitrine-canal"
                type="text"
                value={canal}
                onChange={(e) => setCanal(e.target.value)}
                placeholder="Boutique, Ouedkniss, Facebook…"
                className="champ"
              />
            </div>
          </div>

          {/* Accordéon Informations Légales & Entreprise */}
          <details className="group">
            <summary className="cursor-pointer text-xs font-bold text-brand-orange hover:underline outline-none">
              + Informations légales pour facture proforma / entreprise (Optionnel)
            </summary>
            <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-brand-light-grey/20 rounded-xl text-xs">
              <div>
                <label className="libelle mb-1" htmlFor="client-adresse-vitrine">Adresse</label>
                <input id="client-adresse-vitrine" type="text" value={clientAdresse} onChange={(e) => setClientAdresse(e.target.value)} className="champ" />
              </div>
              <div>
                <label className="libelle mb-1" htmlFor="client-rc-vitrine">RC</label>
                <input id="client-rc-vitrine" type="text" value={clientRc} onChange={(e) => setClientRc(e.target.value)} className="champ" />
              </div>
              <div>
                <label className="libelle mb-1" htmlFor="client-nif-vitrine">NIF</label>
                <input id="client-nif-vitrine" type="text" value={clientNif} onChange={(e) => setClientNif(e.target.value)} className="champ" />
              </div>
              <div>
                <label className="libelle mb-1" htmlFor="client-nis-vitrine">NIS</label>
                <input id="client-nis-vitrine" type="text" value={clientNis} onChange={(e) => setClientNis(e.target.value)} className="champ" />
              </div>
              <div className="sm:col-span-2">
                <label className="libelle mb-1" htmlFor="client-ai-vitrine">Article d&apos;imposition</label>
                <input id="client-ai-vitrine" type="text" value={clientAi} onChange={(e) => setClientAi(e.target.value)} className="champ" />
              </div>
            </div>
          </details>

          {/* Garantie Matériel */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-brand-light-grey/60 bg-brand-light-grey/15 text-xs">
            <span className="font-bold text-brand-black">Garantie Matériel :</span>
            <select
              value={garantieMois}
              onChange={(e) => setGarantieMois(Number(e.target.value))}
              className="select select-sm rounded-lg font-bold border-brand-light-grey text-xs"
            >
              <option value={1}>1 Mois</option>
              <option value={3}>3 Mois</option>
              <option value={6}>6 Mois (Standard)</option>
              <option value={12}>12 Mois (1 An)</option>
              <option value={24}>24 Mois (2 Ans)</option>
            </select>
          </div>

          {avertissement && (
            <div className="flex items-start gap-2 rounded-xl bg-brand-glow/40 px-3 py-2 text-xs text-brand-smooth">
              <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
              {avertissement}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-light-grey/50">
            {avertissement ? (
              <>
                <button
                  type="button"
                  onClick={() => setAvertissement(null)}
                  className="btn btn-secondaire text-xs"
                >
                  Revoir le prix
                </button>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => void enregistrerVente(true)}
                  className="btn btn-primaire text-xs"
                >
                  Vendre quand même
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={envoi || lignesPanier.length === 0}
                onClick={() => void enregistrerVente(false)}
                className="btn btn-primaire w-full sm:w-auto min-h-[46px] text-xs font-bold shadow-lg"
              >
                <IconeBillet taille={16} />
                {envoi ? "Enregistrement en cours..." : "Valider & Générer la Facture"}
              </button>
            )}
          </div>
        </div>
      </Modale>

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
