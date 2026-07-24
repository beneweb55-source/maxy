"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import Modale from "@/components/Modale";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import {
  IconeAlerte,
  IconeBillet,
  IconeImage,
  IconePaquet,
  IconeRecherche,
} from "@/components/icons";

interface CarteEnVente {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  marge_prevue: number;
  jours_en_vente: number;
  image_url: string | null;
  images: string[];
}

interface LigneVente {
  id: number;
  produit_id: number;
  code_interne: string;
  reference: string;
  image_url: string | null;
  prix_vente_reel: number;
  marge: number;
  canal: string | null;
  date_vente: string;
  vendeur: string;
  vendeur_id: number;
  annulee: boolean;
  motif_annulation: string | null;
  groupe_vente: string | null;
}

interface ReponseHistorique {
  ventes: LigneVente[];
  vendeurs: { id: number; username: string }[];
  totaux: { nombre: number; chiffre_affaires: number; marge: number };
}

const CANAUX = ["Ouedkniss", "Facebook", "direct"];

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function VentesClient({ role }: { role: Role }) {
  const { afficher } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initTermine, setInitTermine] = useState(false);
  const [onglet, setOnglet] = useState<"en_vente" | "historique">("en_vente");
  const [envoi, setEnvoi] = useState(false);

  const [cartes, setCartes] = useState<CarteEnVente[] | null>(null);
  const [erreurCartes, setErreurCartes] = useState<string | null>(null);
  const [modalVente, setModalVente] = useState<CarteEnVente | null>(null);
  const [prixReel, setPrixReel] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [avertissement, setAvertissement] = useState<string | null>(null);

  // Recherche / filtres / tri de l'onglet « En vente » (côté client).
  const [rechercheEnVente, setRechercheEnVente] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [triCartes, setTriCartes] = useState("");

  // Vente groupée (bundle).
  const [modeBundle, setModeBundle] = useState(false);
  const [selection, setSelection] = useState<Set<number>>(new Set());
  const [modalBundle, setModalBundle] = useState(false);
  const [prixTotalBundle, setPrixTotalBundle] = useState("");
  const [canalBundle, setCanalBundle] = useState("");
  const [dateBundle, setDateBundle] = useState(aujourdhuiIso());
  const [avertissementBundle, setAvertissementBundle] = useState<string | null>(null);

  const [historique, setHistorique] = useState<ReponseHistorique | null>(null);
  const [erreurHistorique, setErreurHistorique] = useState<string | null>(null);
  const [filtreMois, setFiltreMois] = useState("");
  const [filtreVendeur, setFiltreVendeur] = useState("");
  const [modalAnnulation, setModalAnnulation] = useState<LigneVente | null>(null);
  const [motif, setMotif] = useState("");

  // Aperçu plein écran des photos d'un produit (galerie + téléchargement).
  const [apercuPhotos, setApercuPhotos] = useState<{
    photos: string[];
    index: number;
    titre: string;
  } | null>(null);

  const peutVendre = role === "gerant" || role === "dev" || role === "social_media";
  const estGerant = role === "gerant";
  const estSocial = role === "social_media";

  const chargerCartes = useCallback(async () => {
    try {
      const res = await fetch("/api/ventes/en-vente");
      const corps = (await res.json().catch(() => null)) as
        | { produits: CarteEnVente[] }
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreurCartes((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      setCartes((corps as { produits: CarteEnVente[] }).produits);
      setErreurCartes(null);
    } catch {
      setErreurCartes("Impossible de joindre le serveur.");
    }
  }, []);

  const chargerHistorique = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtreMois) params.set("mois", filtreMois);
      if (filtreVendeur) params.set("vendeur", filtreVendeur);
      const res = await fetch(`/api/ventes?${params.toString()}`);
      const corps = (await res.json().catch(() => null)) as
        | ReponseHistorique
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreurHistorique(
          (corps as { error?: string } | null)?.error ?? "Erreur de chargement."
        );
        return;
      }
      setHistorique(corps as ReponseHistorique);
      setErreurHistorique(null);
    } catch {
      setErreurHistorique("Impossible de joindre le serveur.");
    }
  }, [filtreMois, filtreVendeur]);

  useEffect(() => {
    void chargerCartes();
  }, [chargerCartes]);

  const ouvrirVente = useCallback((carte: CarteEnVente) => {
    setPrixReel(carte.prix_vente_fixe !== null ? String(carte.prix_vente_fixe) : "");
    setCanal("");
    setDateVente(aujourdhuiIso());
    setAvertissement(null);
    setModalVente(carte);
  }, []);

  useEffect(() => {
    if (cartes && !initTermine) {
      setInitTermine(true);
      const produitId = searchParams.get("vendre_produit_id");
      if (produitId && peutVendre) {
        const produit = cartes.find((c) => c.id === Number(produitId));
        if (produit) {
          ouvrirVente(produit);
          router.replace("/ventes");
        }
      }
    }
  }, [cartes, searchParams, peutVendre, initTermine, ouvrirVente, router]);
  useEffect(() => {
    void chargerHistorique();
  }, [chargerHistorique]);

  const categoriesEnVente = Array.from(new Set((cartes ?? []).map((c) => c.categorie))).sort();

  const cartesFiltrees = (() => {
    let liste = cartes ?? [];
    const q = rechercheEnVente.trim().toLowerCase();
    if (q) {
      liste = liste.filter(
        (c) =>
          c.reference.toLowerCase().includes(q) ||
          c.code_interne.toLowerCase().includes(q) ||
          c.categorie.toLowerCase().includes(q)
      );
    }
    if (filtreCategorie) liste = liste.filter((c) => c.categorie === filtreCategorie);
    const tri = [...liste];
    switch (triCartes) {
      case "prix_asc":
        tri.sort((a, b) => (a.prix_vente_fixe ?? 0) - (b.prix_vente_fixe ?? 0));
        break;
      case "prix_desc":
        tri.sort((a, b) => (b.prix_vente_fixe ?? 0) - (a.prix_vente_fixe ?? 0));
        break;
      case "marge_desc":
        tri.sort((a, b) => b.marge_prevue - a.marge_prevue);
        break;
      case "anciennete":
        tri.sort((a, b) => b.jours_en_vente - a.jours_en_vente);
        break;
    }
    return tri;
  })();

  const selectionnees = (cartes ?? []).filter((c) => selection.has(c.id));

  function basculerSelection(id: number) {
    setSelection((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  }

  function quitterModeBundle() {
    setModeBundle(false);
    setSelection(new Set());
  }

  function ouvrirBundle() {
    const total = selectionnees.reduce((s, c) => s + (c.prix_vente_fixe ?? 0), 0);
    setPrixTotalBundle(total > 0 ? String(total) : "");
    setCanalBundle("");
    setDateBundle(aujourdhuiIso());
    setAvertissementBundle(null);
    setModalBundle(true);
  }

  async function enregistrerVenteGroupee(confirmer: boolean) {
    setEnvoi(true);
    try {
      const res = await fetch("/api/ventes/groupee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produit_ids: selectionnees.map((c) => c.id),
          prix_total: Number(prixTotalBundle),
          canal: canalBundle.trim() || undefined,
          date_vente: dateBundle !== aujourdhuiIso() ? dateBundle : undefined,
          confirmer: confirmer || undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la vente groupée.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setAvertissementBundle(corps.message ?? "Prix total sous la marge minimum. Confirmer ?");
        return;
      }
      afficher(
        `Vente groupée enregistrée : ${selectionnees.length} produits — ${formaterDA(Number(prixTotalBundle))}. Imed a été notifié.`
      );
      setModalBundle(false);
      quitterModeBundle();
      await Promise.all([chargerCartes(), chargerHistorique()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }


  async function enregistrerVente(confirmer: boolean) {
    if (!modalVente) return;
    setEnvoi(true);
    try {
      const res = await fetch("/api/ventes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produit_id: modalVente.id,
          prix_vente_reel: Number(prixReel),
          canal: canal.trim() || undefined,
          date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
          confirmer: confirmer || undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
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
        `Vente enregistrée : ${modalVente.reference} — ${formaterDA(Number(prixReel))}. Imed a été notifié.`
      );
      setModalVente(null);
      await Promise.all([chargerCartes(), chargerHistorique()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function annulerVente() {
    if (!modalAnnulation) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/ventes/${modalAnnulation.id}/annulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'annulation.", "erreur");
        return;
      }
      afficher("Vente annulée — caisse contre-passée, produit remis en vente.");
      setModalAnnulation(null);
      setMotif("");
      await Promise.all([chargerCartes(), chargerHistorique()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="space-y-6 animate-entree">
      <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Ventes</h1>

      <div className="flex gap-1 border-b border-brand-light-grey">
        {(
          [
            ["en_vente", `En vente${cartes ? ` (${cartes.length})` : ""}`],
            ["historique", "Historique"],
          ] as const
        ).map(([cle, libelle]) => (
          <button
            key={cle}
            type="button"
            onClick={() => setOnglet(cle)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-bold transition ${
              onglet === cle
                ? "border-brand-orange text-brand-orange"
                : "border-transparent text-brand-warm-grey hover:text-brand-black"
            }`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {onglet === "en_vente" && (
        <div className="space-y-3">
          <div className="carte flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey">
                <IconeRecherche taille={15} />
              </span>
              <input
                type="search"
                value={rechercheEnVente}
                onChange={(e) => setRechercheEnVente(e.target.value)}
                placeholder="Rechercher (référence, code, catégorie)"
                className="champ pl-9"
              />
            </div>
            <select
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
              className="champ w-auto"
            >
              <option value="">Toutes catégories</option>
              {categoriesEnVente.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={triCartes}
              onChange={(e) => setTriCartes(e.target.value)}
              className="champ w-auto"
              aria-label="Trier les produits en vente"
            >
              <option value="">Tri : défaut</option>
              <option value="prix_asc">Prix ↑</option>
              <option value="prix_desc">Prix ↓</option>
              <option value="marge_desc">Marge ↓</option>
              <option value="anciennete">Ancienneté ↓</option>
            </select>
            {peutVendre &&
              (modeBundle ? (
                <button type="button" onClick={quitterModeBundle} className="btn btn-secondaire">
                  Annuler la sélection
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setModeBundle(true)}
                  className="btn btn-secondaire"
                >
                  <IconePaquet taille={15} />
                  Vente groupée
                </button>
              ))}
          </div>

          {erreurCartes && (
            <div className="alerte-erreur" role="alert">
              {erreurCartes}
            </div>
          )}
          {!erreurCartes && cartes === null && (
            <p className="text-sm text-brand-warm-grey">Chargement…</p>
          )}
          {cartes !== null && cartes.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucun produit en vente. Le gérant fixe les prix des produits « OK » pour les mettre
              en vente.
            </p>
          )}
          {cartes !== null && cartes.length > 0 && cartesFiltrees.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucun produit ne correspond à la recherche.
            </p>
          )}
          {cartes !== null && cartesFiltrees.length > 0 && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {cartesFiltrees.map((c) => {
                const choisi = selection.has(c.id);
                return (
                  <li
                    key={c.id}
                    className={`carte flex flex-col ${
                      modeBundle && choisi ? "ring-2 ring-brand-orange" : ""
                    }`}
                  >
                    {modeBundle && (
                      <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-brand-smooth">
                        <input
                          type="checkbox"
                          checked={choisi}
                          onChange={() => basculerSelection(c.id)}
                          className="accent-brand-orange"
                        />
                        Ajouter au groupe
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        c.images.length > 0 &&
                        setApercuPhotos({ photos: c.images, index: 0, titre: c.code_interne })
                      }
                      title={c.images.length > 0 ? "Voir les photos en grand" : undefined}
                      aria-label={`Photos de ${c.reference}`}
                      className={`relative mb-2.5 block h-32 w-full overflow-hidden rounded-lg border border-brand-light-grey bg-brand-paper ${
                        c.images.length > 0 ? "cursor-zoom-in" : "cursor-default"
                      }`}
                    >
                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={`Photo de ${c.reference}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="flex h-full w-full items-center justify-center text-brand-grey">
                          <IconeImage taille={26} />
                        </span>
                      )}
                      {c.images.length > 1 && (
                        <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          <IconeImage taille={11} />
                          {c.images.length}
                        </span>
                      )}
                    </button>
                    <Link
                      href={`/produits/${c.id}`}
                      className="block truncate text-sm font-semibold transition hover:text-brand-crystal hover:underline"
                      title={c.reference}
                    >
                      <span className="font-mono text-xs text-brand-warm-grey">
                        {c.code_interne}
                      </span>{" "}
                      {c.reference}
                    </Link>
                    <p className="mt-1 text-xs text-brand-warm-grey">{c.categorie}</p>
                    <dl className="mt-2 flex-1 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-brand-warm-grey">Prix fixé</dt>
                        <dd className="font-bold">
                          {c.prix_vente_fixe !== null ? formaterDA(c.prix_vente_fixe) : "—"}
                        </dd>
                      </div>
                      {!estSocial && (
                        <div className="flex justify-between">
                          <dt className="text-brand-warm-grey">Marge prévue</dt>
                          <dd
                            className={`font-semibold ${c.marge_prevue >= 0 ? "text-succes" : "text-danger"}`}
                          >
                            {formaterDA(c.marge_prevue)}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-brand-warm-grey">En vente depuis</dt>
                        <dd>{c.jours_en_vente} j</dd>
                      </div>
                    </dl>
                    {peutVendre && !modeBundle && (
                      <button
                        type="button"
                        onClick={() => ouvrirVente(c)}
                        className="btn btn-primaire mt-3 w-full"
                      >
                        <IconeBillet taille={15} />
                        Vendre
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}

          {modeBundle && (
            <div className="sticky bottom-0 z-20 flex items-center justify-between gap-3 rounded-xl border border-brand-light-grey bg-brand-white/95 p-3 shadow-lg backdrop-blur">
              <span className="text-sm text-brand-warm-grey">
                <strong className="text-brand-black">{selection.size}</strong> produit
                {selection.size > 1 ? "s" : ""} sélectionné{selection.size > 1 ? "s" : ""}
              </span>
              <button
                type="button"
                disabled={selection.size < 2}
                onClick={ouvrirBundle}
                className="btn btn-primaire"
                title={selection.size < 2 ? "Sélectionnez au moins deux produits" : undefined}
              >
                <IconePaquet taille={15} />
                Vendre ensemble
              </button>
            </div>
          )}
        </div>
      )}

      {onglet === "historique" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={filtreMois}
              onChange={(e) => setFiltreMois(e.target.value)}
              className="champ w-auto"
            />
            <select
              value={filtreVendeur}
              onChange={(e) => setFiltreVendeur(e.target.value)}
              className="champ w-auto"
            >
              <option value="">Tous les vendeurs</option>
              {(historique?.vendeurs ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.username}
                </option>
              ))}
            </select>
            {(filtreMois || filtreVendeur) && (
              <button
                type="button"
                onClick={() => {
                  setFiltreMois("");
                  setFiltreVendeur("");
                }}
                className="text-sm text-brand-warm-grey hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {historique && (
            <p className="text-sm text-brand-warm-grey">
              <strong className="text-brand-black">{historique.totaux.nombre}</strong> vente
              {historique.totaux.nombre > 1 ? "s" : ""} valide
              {historique.totaux.nombre > 1 ? "s" : ""} · CA{" "}
              <strong className="text-brand-black">
                {formaterDA(historique.totaux.chiffre_affaires)}
              </strong>{" "}
              {!estSocial && (
                <>
                  {" "}· marge totale{" "}
                  <strong
                    className={historique.totaux.marge >= 0 ? "text-succes" : "text-danger"}
                  >
                    {formaterDA(historique.totaux.marge)}
                  </strong>
                </>
              )}
            </p>
          )}

          {erreurHistorique && (
            <div className="alerte-erreur" role="alert">
              {erreurHistorique}
            </div>
          )}
          {!erreurHistorique && historique === null && (
            <p className="text-sm text-brand-warm-grey">Chargement…</p>
          )}
          {historique && historique.ventes.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucune vente pour ces filtres.
            </p>
          )}

          {historique && historique.ventes.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-brand-light-grey/25">
                  <tr>
                    <th className="entete-table">Produit</th>
                    <th className="entete-table text-right">Prix</th>
                    {!estSocial && <th className="entete-table text-right">Marge</th>}
                    <th className="entete-table">Canal</th>
                    <th className="entete-table">Vendeur</th>
                    <th className="entete-table text-right">Date</th>
                    {estGerant && <th className="entete-table" />}
                  </tr>
                </thead>
                <tbody className="">
                  {historique.ventes.map((v) => (
                    <tr key={v.id} className={`ligne-table border-b border-brand-light-grey/30 last:border-0 ${v.annulee ? "text-brand-grey" : ""}`}>
                      <td className="px-3 py-2">
                        <span className="flex items-center gap-2">
                          {v.image_url ? (
                            <button
                              type="button"
                              onClick={() =>
                                setApercuPhotos({
                                  photos: [v.image_url!],
                                  index: 0,
                                  titre: v.code_interne,
                                })
                              }
                              title="Voir la photo en grand"
                              aria-label={`Photo de ${v.reference}`}
                              className="shrink-0 cursor-zoom-in"
                            >
                              <img
                                src={v.image_url}
                                alt=""
                                loading="lazy"
                                className="h-9 w-9 rounded-md border border-brand-light-grey object-cover"
                              />
                            </button>
                          ) : (
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-brand-light-grey text-brand-grey">
                              <IconeImage taille={14} />
                            </span>
                          )}
                          <span className="min-w-0">
                        <Link
                          href={`/produits/${v.produit_id}`}
                          className={`hover:underline ${v.annulee ? "line-through" : ""}`}
                        >
                          <span className="font-mono text-xs text-brand-grey">
                            {v.code_interne}
                          </span>{" "}
                          {v.reference}
                        </Link>
                        {v.groupe_vente && (
                          <span
                            className="ml-1 inline-flex items-center gap-0.5 rounded bg-brand-glow/40 px-1 py-0.5 text-xs font-semibold text-brand-smooth"
                            title={`Vente groupée ${v.groupe_vente.slice(0, 8)}`}
                          >
                            <IconePaquet taille={11} />
                            Bundle
                          </span>
                        )}
                        {v.annulee && (
                          <span
                            className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-xs font-semibold text-danger"
                            title={v.motif_annulation ?? undefined}
                          >
                            annulée
                          </span>
                        )}
                          </span>
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">{formaterDA(v.prix_vente_reel)}</td>
                      {!estSocial && (
                        <td
                          className={`px-3 py-2 text-right font-semibold ${
                            v.annulee ? "" : v.marge >= 0 ? "text-succes" : "text-danger"
                          }`}
                        >
                          {formaterDA(v.marge)}
                        </td>
                      )}
                      <td className="px-3 py-2">{v.canal ?? "—"}</td>
                      <td className="px-3 py-2">{v.vendeur}</td>
                      <td className="px-3 py-2 text-right">
                        {new Date(v.date_vente).toLocaleDateString("fr-FR")}
                      </td>
                      {estGerant && (
                        <td className="px-3 py-2 text-right">
                          {!v.annulee && (
                            <button
                              type="button"
                              onClick={() => {
                                setMotif("");
                                setModalAnnulation(v);
                              }}
                              className="text-xs font-semibold text-danger hover:underline"
                            >
                              Annuler
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <Modale
        titre={modalVente ? `Vendre — ${modalVente.code_interne}` : ""}
        ouverte={modalVente !== null}
        onFermer={() => setModalVente(null)}
      >
        {modalVente && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {modalVente.image_url && (
                <button
                  type="button"
                  onClick={() =>
                    setApercuPhotos({
                      photos: modalVente.images,
                      index: 0,
                      titre: modalVente.code_interne,
                    })
                  }
                  title="Voir les photos en grand"
                  aria-label={`Photos de ${modalVente.reference}`}
                  className="shrink-0 cursor-zoom-in"
                >
                  <img
                    src={modalVente.image_url}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-brand-light-grey object-cover"
                  />
                </button>
              )}
              <p className="text-sm text-brand-warm-grey">{modalVente.reference}</p>
            </div>
            <div>
              <label className="libelle mb-1.5" htmlFor="prix-reel">
                Prix de vente réel (DA) *
              </label>
              <input
                id="prix-reel"
                type="number"
                min={1}
                step={1}
                value={prixReel}
                onChange={(e) => {
                  setPrixReel(e.target.value);
                  setAvertissement(null);
                }}
                autoFocus
                className="champ"
              />
              {!estSocial && Number(prixReel) > 0 && (
                <p className="mt-1 text-xs">
                  Marge :{" "}
                  <strong
                    className={
                      Number(prixReel) - modalVente.prix_achat - modalVente.cout_reparations >= 0
                        ? "text-succes"
                        : "text-danger"
                    }
                  >
                    {formaterDA(
                      Number(prixReel) - modalVente.prix_achat - modalVente.cout_reparations
                    )}
                  </strong>
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="date-vente">
                  Date
                </label>
                <input
                  id="date-vente"
                  type="date"
                  value={dateVente}
                  max={aujourdhuiIso()}
                  onChange={(e) => setDateVente(e.target.value)}
                  className="champ"
                />
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="canal">
                  Canal
                </label>
                <input
                  id="canal"
                  type="text"
                  list="canaux"
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  placeholder="Ouedkniss…"
                  className="champ"
                />
                <datalist id="canaux">
                  {CANAUX.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
            </div>

            {avertissement && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-glow/40 px-3 py-2 text-sm text-brand-smooth">
                <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
                {avertissement}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {avertissement ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAvertissement(null)}
                    className="btn btn-secondaire"
                  >
                    Revoir le prix
                  </button>
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => void enregistrerVente(true)}
                    className="btn btn-primaire"
                  >
                    Vendre quand même
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={envoi || !prixReel.trim()}
                  onClick={() => void enregistrerVente(false)}
                  className="btn btn-primaire"
                >
                  Enregistrer la vente
                </button>
              )}
            </div>
          </div>
        )}
      </Modale>

      <Modale
        titre={modalAnnulation ? `Annuler la vente — ${modalAnnulation.code_interne}` : ""}
        ouverte={modalAnnulation !== null}
        onFermer={() => setModalAnnulation(null)}
      >
        <p className="text-sm text-brand-warm-grey">
          La caisse sera contre-passée et le produit remis en vente. La ligne de vente reste dans
          l'historique (rien ne se supprime).
        </p>
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Motif de l'annulation (obligatoire)"
          className="champ mt-3"
        />
        <div className="mt-3 text-right">
          <button
            type="button"
            disabled={envoi || !motif.trim()}
            onClick={() => void annulerVente()}
            className="btn btn-danger"
          >
            Annuler la vente
          </button>
        </div>
      </Modale>

      <Modale
        titre={`Vente groupée — ${selectionnees.length} produits`}
        ouverte={modalBundle}
        onFermer={() => setModalBundle(false)}
      >
        <div className="space-y-3">
          <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg bg-brand-light-grey/25 p-2.5 text-sm">
            {selectionnees.map((c) => (
              <li key={c.id} className="flex justify-between gap-2">
                <span className="truncate" title={c.reference}>
                  <span className="font-mono text-xs text-brand-warm-grey">{c.code_interne}</span>{" "}
                  {c.reference}
                </span>
                <span className="shrink-0 text-brand-warm-grey">
                  {c.prix_vente_fixe !== null ? formaterDA(c.prix_vente_fixe) : "—"}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-brand-warm-grey">
            Somme des prix fixés :{" "}
            <strong className="text-brand-black">
              {formaterDA(selectionnees.reduce((s, c) => s + (c.prix_vente_fixe ?? 0), 0))}
            </strong>{" "}
            · le prix total sera réparti au prorata entre les produits.
          </p>

          <div>
            <label className="libelle mb-1.5" htmlFor="prix-total-bundle">
              Prix total de la vente groupée (DA) *
            </label>
            <input
              id="prix-total-bundle"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={prixTotalBundle}
              onChange={(e) => {
                setPrixTotalBundle(e.target.value.replace(/[^\d]/g, ""));
                setAvertissementBundle(null);
              }}
              autoFocus
              className="champ"
            />
            {!estSocial && Number(prixTotalBundle) > 0 && (
              <p className="mt-1 text-xs">
                Marge totale :{" "}
                <strong
                  className={
                    Number(prixTotalBundle) -
                      selectionnees.reduce((s, c) => s + c.prix_achat + c.cout_reparations, 0) >=
                    0
                      ? "text-succes"
                      : "text-danger"
                  }
                >
                  {formaterDA(
                    Number(prixTotalBundle) -
                      selectionnees.reduce((s, c) => s + c.prix_achat + c.cout_reparations, 0)
                  )}
                </strong>
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="libelle mb-1.5" htmlFor="date-bundle">
                Date
              </label>
              <input
                id="date-bundle"
                type="date"
                value={dateBundle}
                max={aujourdhuiIso()}
                onChange={(e) => setDateBundle(e.target.value)}
                className="champ"
              />
            </div>
            <div className="flex-1">
              <label className="libelle mb-1.5" htmlFor="canal-bundle">
                Canal
              </label>
              <input
                id="canal-bundle"
                type="text"
                list="canaux"
                value={canalBundle}
                onChange={(e) => setCanalBundle(e.target.value)}
                placeholder="Ouedkniss…"
                className="champ"
              />
            </div>
          </div>

          {avertissementBundle && (
            <div className="flex items-start gap-2 rounded-lg bg-brand-glow/40 px-3 py-2 text-sm text-brand-smooth">
              <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
              {avertissementBundle}
            </div>
          )}

          <div className="flex justify-end gap-2">
            {avertissementBundle ? (
              <>
                <button
                  type="button"
                  onClick={() => setAvertissementBundle(null)}
                  className="btn btn-secondaire"
                >
                  Revoir le prix
                </button>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => void enregistrerVenteGroupee(true)}
                  className="btn btn-primaire"
                >
                  Vendre quand même
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={envoi || !prixTotalBundle.trim()}
                onClick={() => void enregistrerVenteGroupee(false)}
                className="btn btn-primaire"
              >
                <IconePaquet taille={15} />
                Enregistrer la vente groupée
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
