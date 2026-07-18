"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import ChampPhoto from "@/components/ChampPhoto";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT, STATUTS_PRODUIT } from "@/lib/statuts";
import {
  IconeChevronBas,
  IconeChevronGauche,
  IconeChevronDroite,
  IconeCorbeille,
  IconeCrayon,
  IconePlus,
  IconeRecherche,
  IconeTelechargement,
  IconeTriBas,
  IconeTriHaut,
} from "@/components/icons";

interface LigneProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  statut: StatutProduit;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  lot_id: number;
  fournisseur: string;
  date_entree: string;
  jours_stock: number;
  image_url: string | null;
}

interface ReponseInventaire {
  total: number;
  pages: number;
  page: number;
  valeur: number;
  categories: string[];
  lots: { id: number; libelle: string }[];
  produits: LigneProduit[];
}

const COLONNES_TRI = [
  { cle: "code_interne", libelle: "Code" },
  { cle: "reference", libelle: "Référence" },
  { cle: "categorie", libelle: "Catégorie" },
  { cle: "statut", libelle: "Statut" },
  { cle: "date_entree", libelle: "Entrée" },
  { cle: "prix_achat", libelle: "Achat" },
  { cle: "prix_vente_fixe", libelle: "Prix fixé" },
] as const;

interface FormulaireProduit {
  reference: string;
  categorie: string;
  prix_achat: string;
  lot_id: string;
  prix_vente_fixe: string;
}

const FORMULAIRE_VIDE: FormulaireProduit = {
  reference: "",
  categorie: "",
  prix_achat: "",
  lot_id: "",
  prix_vente_fixe: "",
};

interface GroupeProduits {
  cle: string;
  reference: string;
  categorie: string;
  image_url: string | null;
  unites: LigneProduit[];
  prixMin: number;
  prixMax: number;
  resumeStatuts: { statut: StatutProduit; n: number }[];
}

function grouperDoublons(produits: LigneProduit[]): GroupeProduits[] {
  const groupes = new Map<string, LigneProduit[]>();
  for (const p of produits) {
    const cle = `${p.reference.trim().toLowerCase()}|${p.categorie.trim().toLowerCase()}`;
    const existant = groupes.get(cle);
    if (existant) existant.push(p);
    else groupes.set(cle, [p]);
  }
  return Array.from(groupes.entries()).map(([cle, unites]) => {
    const prix = unites.map((u) => u.prix_achat);
    const parStatut = new Map<StatutProduit, number>();
    for (const u of unites) parStatut.set(u.statut, (parStatut.get(u.statut) ?? 0) + 1);
    const premier = unites[0]!;
    return {
      cle,
      reference: premier.reference,
      categorie: premier.categorie,
      image_url: unites.find((u) => u.image_url)?.image_url ?? null,
      unites,
      prixMin: Math.min(...prix),
      prixMax: Math.max(...prix),
      resumeStatuts: Array.from(parStatut.entries()).map(([statut, n]) => ({ statut, n })),
    };
  });
}

export default function Inventaire({ role }: { role: Role }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { afficher } = useToast();

  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const [donnees, setDonnees] = useState<ReponseInventaire | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [modalAjout, setModalAjout] = useState(searchParams?.get("ajouter") === "1");
  const [modalEdition, setModalEdition] = useState<LigneProduit | null>(null);
  const [modalSuppression, setModalSuppression] = useState<LigneProduit | null>(null);
  const [formulaire, setFormulaire] = useState<FormulaireProduit>(FORMULAIRE_VIDE);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [formPhotoModifiee, setFormPhotoModifiee] = useState(false);

  const [vueGroupee, setVueGroupee] = useState(true);
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());

  const estGerant = role === "gerant";

  const statutsActifs = (searchParams?.get("statuts") ?? "")
    .split(",")
    .filter((s): s is StatutProduit => (STATUTS_PRODUIT as readonly string[]).includes(s));

  const majUrl = useCallback(
    (modifs: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams?.toString() || "");
      for (const [cle, valeur] of Object.entries(modifs)) {
        if (valeur === null || valeur === "") params.delete(cle);
        else params.set(cle, valeur);
      }
      if (!("page" in modifs)) params.delete("page");
      router.replace(`/inventaire?${params.toString()}`);
    },
    [router, searchParams]
  );

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const res = await fetch(`/api/produits?${searchParams?.toString() || ""}`);
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement de l'inventaire.");
      }
      setDonnees((await res.json()) as ReponseInventaire);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, [searchParams]);

  useEffect(() => {
    void charger();
  }, [charger]);

  function basculerStatut(statut: StatutProduit) {
    const suivants = statutsActifs.includes(statut)
      ? statutsActifs.filter((s) => s !== statut)
      : [...statutsActifs, statut];
    majUrl({ statuts: suivants.join(",") || null });
  }

  function trierPar(cle: string) {
    const triActuel = searchParams?.get("tri") ?? "code_interne";
    const ordreActuel = searchParams?.get("ordre") ?? "asc";
    majUrl({
      tri: cle,
      ordre: triActuel === cle && ordreActuel === "asc" ? "desc" : "asc",
    });
  }

  function ouvrirAjout() {
    setFormulaire({ ...FORMULAIRE_VIDE, lot_id: String(donnees?.lots[0]?.id ?? "") });
    setFormPhoto(null);
    setFormPhotoModifiee(false);
    setModalAjout(true);
  }

  function ouvrirEdition(p: LigneProduit) {
    setFormulaire({
      reference: p.reference,
      categorie: p.categorie,
      prix_achat: String(p.prix_achat),
      lot_id: String(p.lot_id),
      prix_vente_fixe: p.prix_vente_fixe !== null ? String(p.prix_vente_fixe) : "",
    });
    setFormPhoto(p.image_url);
    setFormPhotoModifiee(false);
    setModalEdition(p);
  }

  function basculerGroupe(cle: string) {
    setGroupesOuverts((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(cle)) suivant.delete(cle);
      else suivant.add(cle);
      return suivant;
    });
  }

  async function ajouterProduit() {
    setEnvoi(true);
    try {
      const res = await fetch("/api/produits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lot_id: Number(formulaire.lot_id),
          reference: formulaire.reference.trim(),
          categorie: formulaire.categorie.trim(),
          prix_achat: Number(formulaire.prix_achat),
          image_url: formPhoto ?? undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { code_interne?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'ajout du produit.", "erreur");
        return;
      }
      afficher(`Produit ${corps?.code_interne} ajouté à l'inventaire.`);
      setModalAjout(false);
      majUrl({ ajouter: null });
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function modifierProduit() {
    if (!modalEdition) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/produits/${modalEdition.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reference: formulaire.reference.trim(),
          categorie: formulaire.categorie.trim(),
          prix_achat: Number(formulaire.prix_achat),
          prix_vente_fixe: formulaire.prix_vente_fixe.trim() ? Number(formulaire.prix_vente_fixe) : null,
          ...(formPhotoModifiee ? { image_url: formPhoto ?? "" } : {}),
        }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la modification.", "erreur");
        return;
      }
      afficher(`Produit ${modalEdition.code_interne} modifié.`);
      setModalEdition(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function supprimerProduit() {
    if (!modalSuppression) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/produits/${modalSuppression.id}`, { method: "DELETE" });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la suppression.", "erreur");
        return;
      }
      afficher(`Produit ${modalSuppression.code_interne} supprimé de l'inventaire.`);
      setModalSuppression(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  const formulaireValide =
    formulaire.reference.trim() &&
    formulaire.categorie.trim() &&
    Number.isInteger(Number(formulaire.prix_achat)) &&
    Number(formulaire.prix_achat) >= 0;

  const triActuel = searchParams?.get("tri") ?? "code_interne";
  const ordreActuel = searchParams?.get("ordre") ?? "asc";
  const page = donnees?.page ?? 1;

  const champsProduit = (
    <div className="space-y-3">
      <div>
        <label className="libelle mb-1.5" htmlFor="ref-produit">
          Référence *
        </label>
        <input
          id="ref-produit"
          type="text"
          value={formulaire.reference}
          onChange={(e) => setFormulaire({ ...formulaire, reference: e.target.value })}
          placeholder="Ex. Dell Latitude 5480 i5 8Go/256Go"
          className="champ"
          autoFocus
        />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="libelle mb-1.5" htmlFor="cat-produit">
            Catégorie *
          </label>
          <input
            id="cat-produit"
            type="text"
            list="categories-inventaire"
            value={formulaire.categorie}
            onChange={(e) => setFormulaire({ ...formulaire, categorie: e.target.value })}
            placeholder="Laptop, Écran…"
            className="champ"
          />
          <datalist id="categories-inventaire">
            {(donnees?.categories ?? []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>
        <div className="w-40">
          <label className="libelle mb-1.5" htmlFor="prix-produit">
            Prix achat (DA) *
          </label>
          <input
            id="prix-produit"
            type="number"
            min={0}
            step={1}
            value={formulaire.prix_achat}
            onChange={(e) => setFormulaire({ ...formulaire, prix_achat: e.target.value })}
            className="champ text-right"
          />
        </div>
        {modalEdition !== null && (
          <div className="w-40">
            <label className="libelle mb-1.5" htmlFor="prix-vente-produit">
              Prix vente (DA)
            </label>
            <input
              id="prix-vente-produit"
              type="number"
              min={0}
              step={1}
              value={formulaire.prix_vente_fixe}
              onChange={(e) => setFormulaire({ ...formulaire, prix_vente_fixe: e.target.value })}
              className="champ text-right"
              placeholder="—"
            />
          </div>
        )}
      </div>
      <div>
        <label className="libelle mb-1.5">Photo du produit</label>
        <ChampPhoto
          apercu={formPhoto}
          onCapturer={(data) => {
            setFormPhoto(data);
            setFormPhotoModifiee(true);
          }}
          onRetirer={() => {
            setFormPhoto(null);
            setFormPhotoModifiee(true);
          }}
          disabled={envoi}
        />
      </div>
    </div>
  );

  const groupes = donnees ? grouperDoublons(donnees.produits) : [];

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Inventaire</h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setVueGroupee((v) => !v)}
            className="btn btn-secondaire"
          >
            {vueGroupee ? "Vue détaillée" : "Vue groupée"}
          </button>
          {estGerant && (
            <a
              href={`/api/produits/export?${searchParams?.toString() || ""}`}
              className="btn btn-secondaire"
            >
              <IconeTelechargement taille={15} />
              Export CSV
            </a>
          )}
          <button type="button" onClick={ouvrirAjout} className="btn btn-primaire">
            <IconePlus taille={15} />
            Ajouter un produit
          </button>
        </div>
      </div>

      <div className="carte space-y-3">
        <div className="flex flex-wrap gap-3">
          <form
            className="relative min-w-56 flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              majUrl({ q: q.trim() || null });
            }}
          >
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-grey">
              <IconeRecherche taille={15} />
            </span>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (référence, code, notes) puis Entrée"
              className="champ pl-9"
            />
          </form>
          <select
            value={searchParams?.get("categorie") ?? ""}
            onChange={(e) => majUrl({ categorie: e.target.value || null })}
            className="champ w-auto"
          >
            <option value="">Toutes catégories</option>
            {(donnees?.categories ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            value={searchParams?.get("lot") ?? ""}
            onChange={(e) => majUrl({ lot: e.target.value || null })}
            className="champ w-auto"
          >
            <option value="">Tous les lots</option>
            {(donnees?.lots ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.libelle}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-brand-warm-grey">
            <input
              type="date"
              value={searchParams?.get("du") ?? ""}
              onChange={(e) => majUrl({ du: e.target.value || null })}
              className="champ w-auto"
            />
            au
            <input
              type="date"
              value={searchParams?.get("au") ?? ""}
              onChange={(e) => majUrl({ au: e.target.value || null })}
              className="champ w-auto"
            />
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={searchParams?.get("plus30j") === "1"}
              onChange={(e) => majUrl({ plus30j: e.target.checked ? "1" : null })}
              className="accent-brand-orange"
            />
            +30 jours en stock
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={searchParams?.get("a_tarifer") === "1"}
              onChange={(e) => majUrl({ a_tarifer: e.target.checked ? "1" : null })}
              className="accent-brand-orange"
            />
            À tarifer (sans prix)
          </label>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STATUTS_PRODUIT.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => basculerStatut(s)}
              className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ${
                statutsActifs.includes(s)
                  ? "border-brand-smooth bg-brand-smooth text-brand-white"
                  : `border-transparent ${INFOS_STATUT[s].badge}`
              }`}
            >
              {INFOS_STATUT[s].libelle}
            </button>
          ))}
          {(statutsActifs.length > 0 || searchParams?.toString() || "") && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                router.replace("/inventaire");
              }}
              className="rounded-full border border-brand-light-grey px-2.5 py-0.5 text-xs text-brand-warm-grey transition hover:bg-brand-light-grey/40"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black">{donnees.total}</strong> produit
          {donnees.total > 1 ? "s" : ""} · valeur de la sélection (achat + réparations) :{" "}
          <strong className="text-brand-black">{formaterDA(donnees.valeur)}</strong>
        </p>
      )}

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}
      {!erreur && donnees === null && (
        <p className="text-sm text-brand-warm-grey">Chargement de l'inventaire…</p>
      )}
      {donnees && donnees.produits.length === 0 && (
        <div className="carte border-dashed p-8 text-center text-sm text-brand-warm-grey">
          <p>Aucun produit ne correspond à ces filtres.</p>
          {donnees.total === 0 && (
            <button type="button" onClick={ouvrirAjout} className="btn btn-primaire mt-4">
              <IconePlus taille={15} />
              Ajouter le premier produit
            </button>
          )}
        </div>
      )}

      {donnees && donnees.produits.length > 0 && vueGroupee && (
        <div className="space-y-2">
          {groupes.map((g) => {
            const ouvert = groupesOuverts.has(g.cle);
            const multiple = g.unites.length > 1;
            return (
              <div
                key={g.cle}
                className="overflow-hidden rounded-xl border border-brand-light-grey bg-brand-white"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  {g.image_url ? (
                    <img
                      src={g.image_url}
                      alt={`Photo de ${g.reference}`}
                      loading="lazy"
                      className="h-11 w-11 shrink-0 rounded-lg border border-brand-light-grey object-cover"
                    />
                  ) : (
                    <div className="h-11 w-11 shrink-0 rounded-lg border border-dashed border-brand-light-grey" />
                  )}
                  <span
                    className={`inline-flex h-7 shrink-0 items-center justify-center rounded-full px-2.5 text-sm font-bold ${
                      multiple
                        ? "bg-brand-orange text-brand-white"
                        : "bg-brand-light-grey/60 text-brand-warm-grey"
                    }`}
                  >
                    {g.unites.length}×
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold" title={g.reference}>
                      {g.reference}
                    </p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-brand-warm-grey">
                      <span>{g.categorie}</span>
                      {g.resumeStatuts.map((r) => (
                        <span
                          key={r.statut}
                          className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${INFOS_STATUT[r.statut].badge}`}
                        >
                          {r.n}× {INFOS_STATUT[r.statut].libelle}
                        </span>
                      ))}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right text-sm sm:block">
                    <span className="font-semibold">
                      {g.prixMin === g.prixMax
                        ? formaterDA(g.prixMin)
                        : `${formaterDA(g.prixMin)} – ${formaterDA(g.prixMax)}`}
                    </span>
                    <span className="block text-xs text-brand-grey">achat unitaire</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => basculerGroupe(g.cle)}
                    aria-label={ouvert ? "Réduire" : "Développer"}
                    className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                  >
                    <IconeChevronBas
                      taille={16}
                      className={`transition ${ouvert ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {ouvert && (
                  <ul className="divide-y divide-brand-light-grey/60 border-t border-brand-light-grey">
                    {g.unites.map((p) => (
                      <li key={p.id} className="flex items-center gap-2 px-4 py-2 text-sm">
                        <button
                          type="button"
                          onClick={() => router.push(`/produits/${p.id}`)}
                          className="min-w-0 flex-1 text-left transition hover:text-brand-crystal"
                        >
                          <span className="font-mono text-xs text-brand-warm-grey">
                            {p.code_interne}
                          </span>{" "}
                          <span className="text-xs text-brand-grey">
                            lot n°{p.lot_id} · {formaterDA(p.prix_achat)} · {p.jours_stock} j
                          </span>
                        </button>
                        <BadgeStatut statut={p.statut} />
                        <button
                          type="button"
                          onClick={() => ouvrirEdition(p)}
                          title="Modifier"
                          aria-label={`Modifier ${p.code_interne}`}
                          className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                        >
                          <IconeCrayon taille={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalSuppression(p)}
                          title="Supprimer"
                          aria-label={`Supprimer ${p.code_interne}`}
                          className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                        >
                          <IconeCorbeille taille={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      {donnees && donnees.produits.length > 0 && !vueGroupee && (
        <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="bg-brand-light-grey/25">
              <tr>
                {COLONNES_TRI.map((c) => (
                  <th
                    key={c.cle}
                    onClick={() => trierPar(c.cle)}
                    className="entete-table cursor-pointer select-none transition hover:text-brand-black"
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.libelle}
                      {triActuel === c.cle &&
                        (ordreActuel === "asc" ? (
                          <IconeTriHaut taille={12} />
                        ) : (
                          <IconeTriBas taille={12} />
                        ))}
                    </span>
                  </th>
                ))}
                <th className="entete-table text-right">Jours</th>
                <th className="entete-table" />
              </tr>
            </thead>
            <tbody className="">
              {donnees.produits.map((p) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/produits/${p.id}`)}
                  className="ligne-table border-b border-brand-light-grey/30 last:border-0 cursor-pointer"
                >
                  <td className="px-3 py-2 font-mono text-xs text-brand-warm-grey">
                    {p.code_interne}
                  </td>
                  <td className="max-w-64 truncate px-3 py-2 font-medium" title={p.reference}>
                    {p.reference}
                  </td>
                  <td className="px-3 py-2">{p.categorie}</td>
                  <td className="px-3 py-2">
                    <BadgeStatut statut={p.statut} />
                  </td>
                  <td className="px-3 py-2 text-xs">
                    {new Date(p.date_entree).toLocaleDateString("fr-FR")}
                    <span className="block text-brand-grey">
                      lot n°{p.lot_id} · {p.fournisseur}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {formaterDA(p.prix_achat)}
                    {p.cout_reparations > 0 && (
                      <span className="block text-xs text-brand-grey">
                        +{formaterDA(p.cout_reparations)} rép.
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {p.prix_vente_fixe !== null ? formaterDA(p.prix_vente_fixe) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">{p.jours_stock}</td>
                  <td className="px-2 py-2">
                    <span className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          ouvrirEdition(p);
                        }}
                        title="Modifier"
                        aria-label={`Modifier ${p.code_interne}`}
                        className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                      >
                        <IconeCrayon taille={14} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setModalSuppression(p);
                        }}
                        title="Supprimer"
                        aria-label={`Supprimer ${p.code_interne}`}
                        className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                      >
                        <IconeCorbeille taille={14} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {donnees && donnees.pages > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => majUrl({ page: String(page - 1) })}
            className="btn btn-secondaire"
          >
            <IconeChevronGauche taille={15} />
            Précédent
          </button>
          <span className="px-2 text-brand-warm-grey">
            Page {page} / {donnees.pages}
          </span>
          <button
            type="button"
            disabled={page >= donnees.pages}
            onClick={() => majUrl({ page: String(page + 1) })}
            className="btn btn-secondaire"
          >
            Suivant
            <IconeChevronDroite taille={15} />
          </button>
        </div>
      )}

      <Modale
        titre="Ajouter un produit"
        ouverte={modalAjout}
        onFermer={() => {
          setModalAjout(false);
          majUrl({ ajouter: null });
        }}
      >
        <div className="space-y-3">
          <div>
            <label className="libelle mb-1.5" htmlFor="lot-produit">
              Lot de rattachement *
            </label>
            <select
              id="lot-produit"
              value={formulaire.lot_id}
              onChange={(e) => setFormulaire({ ...formulaire, lot_id: e.target.value })}
              className="champ"
            >
              {(donnees?.lots ?? []).length === 0 && <option value="">Aucun lot disponible</option>}
              {(donnees?.lots ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.libelle}
                </option>
              ))}
            </select>
            {(donnees?.lots ?? []).length === 0 && (
              <p className="mt-1.5 text-xs text-brand-warm-grey">
                Créez d'abord un arrivage : chaque produit appartient à un lot.
              </p>
            )}
          </div>
          {champsProduit}
          <div className="pt-1 text-right">
            <button
              type="button"
              disabled={envoi || !formulaireValide || !formulaire.lot_id}
              onClick={() => void ajouterProduit()}
              className="btn btn-primaire"
            >
              <IconePlus taille={15} />
              Ajouter le produit
            </button>
          </div>
        </div>
      </Modale>

      <Modale
        titre={modalEdition ? `Modifier — ${modalEdition.code_interne}` : ""}
        ouverte={modalEdition !== null}
        onFermer={() => setModalEdition(null)}
      >
        <div className="space-y-3">
          {champsProduit}
          <div className="pt-1 text-right">
            <button
              type="button"
              disabled={envoi || !formulaireValide}
              onClick={() => void modifierProduit()}
              className="btn btn-primaire"
            >
              Enregistrer les modifications
            </button>
          </div>
        </div>
      </Modale>

      <Modale
        titre={modalSuppression ? `Supprimer — ${modalSuppression.code_interne}` : ""}
        ouverte={modalSuppression !== null}
        onFermer={() => setModalSuppression(null)}
      >
        {modalSuppression && (
          <>
            <p className="text-sm text-brand-warm-grey">
              Le produit <strong className="text-brand-black">{modalSuppression.reference}</strong>{" "}
              sera définitivement retiré de l'inventaire, avec son historique de statuts et ses
              réparations. Cette action est irréversible.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalSuppression(null)}
                className="btn btn-secondaire"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void supprimerProduit()}
                className="btn btn-danger"
              >
                <IconeCorbeille taille={15} />
                Supprimer définitivement
              </button>
            </div>
          </>
        )}
      </Modale>
    </div>
  );
}
