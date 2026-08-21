"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Role, StatutProduit } from "@prisma/client";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import ChampPhotos from "@/components/ChampPhotos";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT, STATUTS_PRODUIT } from "@/lib/statuts";
import {
  PLACEHOLDERS_NOTE,
  STATUTS_NOTE_OBLIGATOIRE,
  TRANSITIONS_MANUELLES,
} from "@/lib/transitions";
import {
  IconeChevronBas,
  IconeChevronGauche,
  IconeChevronDroite,
  IconeCorbeille,
  IconeCrayon,
  IconeImage,
  IconeImprimante,
  IconePlus,
  IconeRecherche,
  IconeTelechargement,
  IconeTriBas,
  IconeTriHaut,
  IconeVitrine,
} from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";
import RechercheRapide from "@/components/RechercheRapide";
import { useT } from "@/lib/i18n/contexte";

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
  { cle: "code_interne", libelle: "inventaire.colCode" },
  { cle: "reference", libelle: "inventaire.colReference" },
  { cle: "categorie", libelle: "inventaire.colCategorie" },
  { cle: "statut", libelle: "inventaire.colStatut" },
  { cle: "date_entree", libelle: "inventaire.colJours" },
  { cle: "prix_achat", libelle: "inventaire.colPrixAchat" },
  { cle: "prix_vente_fixe", libelle: "inventaire.colPrixVente" },
] as const;

interface FormulaireProduit {
  reference: string;
  categorie: string;
  prix_achat: string;
  lot_id: string;
  prix_vente_fixe: string;
  quantite?: string;
}

const FORMULAIRE_VIDE: FormulaireProduit = {
  reference: "",
  categorie: "",
  prix_achat: "",
  lot_id: "",
  prix_vente_fixe: "",
  quantite: "1",
};

// Prix de vente affiché pour une unité : le prix réel si elle est vendue,
// sinon le prix de vente fixé (null si aucun des deux).
function prixVenteAffiche(p: LigneProduit): number | null {
  if (p.statut === "vendu" && p.prix_vente_reel !== null) return p.prix_vente_reel;
  return p.prix_vente_fixe;
}

interface GroupeProduits {
  cle: string;
  reference: string;
  categorie: string;
  image_url: string | null;
  nbImages: number;
  enVitrine: number;
  unites: LigneProduit[];
  prixMin: number;
  prixMax: number;
  venteMin: number | null;
  venteMax: number | null;
  resumeStatuts: { statut: StatutProduit; n: number }[];
}

function grouperDoublons(produits: LigneProduit[]): GroupeProduits[] {
  const groupes = new Map<string, LigneProduit[]>();
  for (const p of produits) {
    const cle = `${p.lot_id ?? "sans-lot"}|${p.reference.trim().toLowerCase()}|${p.categorie.trim().toLowerCase()}`;
    const existant = groupes.get(cle);
    if (existant) existant.push(p);
    else groupes.set(cle, [p]);
  }
  return Array.from(groupes.entries()).map(([cle, unites]) => {
    const prix = unites.map((u) => u.prix_achat);
    const vente = unites
      .map(prixVenteAffiche)
      .filter((v): v is number => v !== null);
    const parStatut = new Map<StatutProduit, number>();
    for (const u of unites) parStatut.set(u.statut, (parStatut.get(u.statut) ?? 0) + 1);
    const premier = unites[0]!;
    return {
      cle,
      reference: premier.reference,
      categorie: premier.categorie,
      image_url: unites.find((u) => u.image_url)?.image_url ?? null,
      nbImages: Math.max(...unites.map((u) => u.nb_images)),
      enVitrine: unites.filter((u) => u.en_vitrine).length,
      unites,
      prixMin: Math.min(...prix),
      prixMax: Math.max(...prix),
      venteMin: vente.length > 0 ? Math.min(...vente) : null,
      venteMax: vente.length > 0 ? Math.max(...vente) : null,
      resumeStatuts: Array.from(parStatut.entries()).map(([statut, n]) => ({ statut, n })),
    };
  });
}

export default function Inventaire({ role }: { role: Role }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useT();
  const { afficher } = useToast();

  const [q, setQ] = useState(searchParams?.get("q") ?? "");
  const [donnees, setDonnees] = useState<ReponseInventaire | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [modalAjout, setModalAjout] = useState(searchParams?.get("ajouter") === "1");
  const [modalEdition, setModalEdition] = useState<{
    unites: LigneProduit[];
    titre: string;
  } | null>(null);
  // Suppression : soit des unités précises (« unites »), soit tout un modèle
  // (« modele ») = tous les exemplaires en stock d'une référence, au-delà de la
  // page courante. `vendusExclus` : exemplaires vendus écartés (conservés pour
  // leur historique de vente).
  const [modalSuppression, setModalSuppression] = useState<{
    type: "unites" | "modele";
    reference: string;
    categorie: string;
    unites: LigneProduit[];
    vendusExclus: number;
  } | null>(null);
  const [formulaire, setFormulaire] = useState<FormulaireProduit>(FORMULAIRE_VIDE);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formPhotosModifiees, setFormPhotosModifiees] = useState(false);
  const [formVitrine, setFormVitrine] = useState(false);
  const [formMettreEnVente, setFormMettreEnVente] = useState(false);

  const [vueGroupee, setVueGroupee] = useState(true);
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  const [afficherPlusFiltres, setAfficherPlusFiltres] = useState(false);

  // Édition du statut depuis l'inventaire (transitions manuelles + note contextuelle).
  const [cibleStatut, setCibleStatut] = useState<StatutProduit | null>(null);
  const [noteStatut, setNoteStatut] = useState("");

  const estGerant = role === "gerant";
  const peutStatut = role === "gerant" || role === "technicien";
  // Social Media Manager : consultation seule, restreinte aux produits en
  // vente / vendus (le serveur applique la même restriction sur les données).
  const estSocial = role === "social_media";
  const peutModifier = !estSocial;
  const statutsVisibles = estSocial
    ? (["en_vente", "vendu"] as readonly StatutProduit[])
    : STATUTS_PRODUIT;

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

  const nbFiltresActifs =
    (q ? 1 : 0) +
    (searchParams?.get("categorie") ? 1 : 0) +
    (searchParams?.get("lot") || searchParams?.get("sans_lot") ? 1 : 0) +
    (searchParams?.get("du") ? 1 : 0) +
    (searchParams?.get("au") ? 1 : 0) +
    (searchParams?.get("plus30j") ? 1 : 0) +
    (searchParams?.get("a_tarifer") ? 1 : 0) +
    (searchParams?.get("a_jeter") ? 1 : 0) +
    (searchParams?.get("en_vitrine") ? 1 : 0) +
    statutsActifs.length +
    (searchParams?.get("tri") ? 1 : 0);

  const charger = useCallback(async () => {
    setErreur(null);
    try {
      const res = await fetch(`/api/produits?${searchParams?.toString() || ""}`, {
        cache: "no-store",
      });
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
    // Aucun lot pré-sélectionné : par défaut, le produit reste dans l'inventaire
    // sans être rattaché à un arrivage.
    setFormulaire({ ...FORMULAIRE_VIDE, lot_id: "" });
    setFormPhotos([]);
    setFormPhotosModifiees(false);
    setFormVitrine(false);
    setModalAjout(true);
  }

  function ouvrirEdition(unites: LigneProduit[], titre: string) {
    const premier = unites[0]!;
    setFormulaire({
      reference: premier.reference,
      categorie: premier.categorie,
      prix_achat: String(premier.prix_achat),
      lot_id: premier.lot_id ? String(premier.lot_id) : "",
      prix_vente_fixe: premier.prix_vente_fixe !== null ? String(premier.prix_vente_fixe) : "",
      quantite: String(unites.length),
    });
    setFormPhotos(premier.image_url ? [premier.image_url] : []);
    setFormPhotosModifiees(false);
    setCibleStatut(null);
    setNoteStatut("");
    setFormMettreEnVente(false);
    setModalEdition({ unites, titre });
    if (premier.nb_images > 1) {
      void fetch(`/api/produits/${premier.id}`)
        .then((r) => (r.ok ? (r.json() as Promise<{ images?: string[] }>) : null))
        .then((d) => {
          if (d?.images) setFormPhotos(d.images);
        })
        .catch(() => undefined);
    }
  }

  // Action rapide (hors modale) : met/retire des produits de la vitrine.
  async function basculerVitrineIds(ids: number[], enVitrine: boolean, libelle: string) {
    if (ids.length === 0) return;
    setEnvoi(true);
    try {
      const res = await fetch("/api/produits/masse/vitrine", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, en_vitrine: enVitrine }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la mise à jour de la vitrine.", "erreur");
        return;
      }
      afficher(enVitrine ? `${libelle} mis en vitrine.` : `${libelle} retiré de la vitrine.`);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerVitrine() {
    if (!modalEdition) return;
    const cible = !modalEdition.unites[0]!.en_vitrine;
    setEnvoi(true);
    try {
      const ids = modalEdition.unites.map(u => u.id);
      
      // Update vitrine in mass
      const res = await fetch(`/api/produits/masse/vitrine`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, en_vitrine: cible }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la mise à jour de la vitrine.", "erreur");
        return;
      }
      afficher(
        cible
          ? `${ids.length} produit(s) mis en vitrine.`
          : `${ids.length} produit(s) retiré(s) de la vitrine.`
      );
      setModalEdition({ ...modalEdition, unites: modalEdition.unites.map(u => ({ ...u, en_vitrine: cible })) });
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function changerStatut(cible: StatutProduit) {
    if (!modalEdition) return;
    if (STATUTS_NOTE_OBLIGATOIRE.includes(cible) && cibleStatut !== cible) {
      // Demande une note contextuelle avant d'appliquer.
      setCibleStatut(cible);
      setNoteStatut("");
      return;
    }
    setEnvoi(true);
    try {
      const ids = modalEdition.unites.map(u => u.id);
      const res = await fetch(`/api/produits/masse/statut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          statut: cible,
          note: STATUTS_NOTE_OBLIGATOIRE.includes(cible) ? noteStatut.trim() : undefined,
        }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du changement de statut.", "erreur");
        return;
      }
      afficher(`${ids.length} produit(s) → ${INFOS_STATUT[cible].libelle}`);
      setModalEdition(null);
      setCibleStatut(null);
      setNoteStatut("");
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function basculerAJeter(valeur: boolean) {
    if (!modalEdition) return;
    setEnvoi(true);
    try {
      const ids = modalEdition.unites.map(u => u.id);
      
      const res = await fetch(`/api/produits/masse/edition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, a_jeter: valeur }), // Assuming masse/edition supports a_jeter if modified
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la mise à jour.", "erreur");
        return;
      }
      afficher(
        valeur
          ? `${ids.length} produit(s) marqué(s) « à jeter ».`
          : `${ids.length} produit(s) : « à jeter » retiré.`
      );
      setModalEdition({ ...modalEdition, unites: modalEdition.unites.map(u => ({ ...u, a_jeter: valeur })) });
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
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
          lot_id: formulaire.lot_id ? Number(formulaire.lot_id) : null,
          reference: formulaire.reference.trim(),
          categorie: formulaire.categorie.trim(),
          prix_achat: Number(formulaire.prix_achat),
          images: formPhotos,
          quantite: Number(formulaire.quantite) || 1,
          en_vitrine: formVitrine,
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
      const ids = modalEdition.unites.map(u => u.id);
      const res = await fetch(`/api/produits/masse/edition`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          reference: formulaire.reference.trim(),
          categorie: formulaire.categorie.trim(),
          prix_achat: Number(formulaire.prix_achat),
          prix_vente_fixe: formulaire.prix_vente_fixe.trim() ? Number(formulaire.prix_vente_fixe) : null,
          mettre_en_vente: formMettreEnVente,
          quantite: Number(formulaire.quantite),
          ...(formPhotosModifiees ? { images: formPhotos } : {}),
        }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la modification.", "erreur");
        return;
      }
      afficher(`Produit(s) ${modalEdition.titre} modifié(s).`);
      setModalEdition(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  // Ouvre la confirmation pour une ou plusieurs unités précises (écarte les
  // exemplaires vendus, non supprimables).
  function ouvrirSuppressionUnites(unites: LigneProduit[]) {
    const premier = unites[0];
    if (!premier) return;
    const supprimables = unites
      .filter((u) => u.statut !== "vendu")
      .sort((a, b) => a.code_interne.localeCompare(b.code_interne));
    setModalSuppression({
      type: "unites",
      reference: premier.reference,
      categorie: premier.categorie,
      unites: supprimables,
      vendusExclus: unites.length - supprimables.length,
    });
  }

  // Ouvre la confirmation pour TOUT un modèle : la suppression portera sur tous
  // les exemplaires en stock de la référence (serveur), pas seulement ceux
  // affichés sur la page courante.
  function ouvrirSuppressionModele(g: GroupeProduits) {
    const supprimables = g.unites.filter((u) => u.statut !== "vendu");
    setModalSuppression({
      type: "modele",
      reference: g.reference,
      categorie: g.categorie,
      unites: supprimables,
      vendusExclus: g.unites.length - supprimables.length,
    });
  }

  async function supprimerProduits() {
    // Le bouton n'apparaît que s'il reste des unités non vendues à supprimer
    // (`unites` = non-vendu de la page). En mode « modèle », la suppression
    // s'étend serveur-side à toutes les pages de la même référence.
    if (!modalSuppression || modalSuppression.unites.length === 0) return;
    setEnvoi(true);
    try {
      const charge =
        modalSuppression.type === "modele"
          ? { modele: { reference: modalSuppression.reference, categorie: modalSuppression.categorie } }
          : { ids: modalSuppression.unites.map((p) => p.id) };
      const res = await fetch(`/api/produits/masse/suppression`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(charge),
      });
      const corps = (await res.json().catch(() => null)) as
        | { supprimes?: number; vendus_conserves?: number; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la suppression.", "erreur");
        return;
      }
      const n = corps?.supprimes ?? modalSuppression.unites.length;
      afficher(
        n === 1 && modalSuppression.type === "unites"
          ? `Produit ${modalSuppression.unites[0]?.code_interne} supprimé de l'inventaire.`
          : `${n} produit${n > 1 ? "s" : ""} supprimé${n > 1 ? "s" : ""} de l'inventaire.`
      );
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
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
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
        />
      </div>
      <div className="sm:col-span-2">
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
      <div className="rounded-lg border border-brand-light-grey bg-brand-paper/60 p-2.5">
        <label className="libelle mb-1.5" htmlFor="prix-produit">
          Prix achat (DA) *
        </label>
        <input
          id="prix-produit"
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={formulaire.prix_achat}
          onChange={(e) =>
            setFormulaire({ ...formulaire, prix_achat: e.target.value.replace(/[^\d]/g, "") })
          }
          className="champ text-right"
        />
      </div>
      <div className="rounded-lg border border-brand-light-grey bg-brand-paper/60 p-2.5">
        <label className="libelle mb-1.5" htmlFor="quantite-produit">
          Quantité *
        </label>
        <input
          id="quantite-produit"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={formulaire.quantite}
          onChange={(e) =>
            setFormulaire({ ...formulaire, quantite: e.target.value.replace(/[^\d]/g, "") })
          }
          className="champ text-right"
        />
      </div>
      {modalEdition !== null && (
        <div className="rounded-lg border border-brand-orange/40 bg-brand-glow/15 p-2.5">
          <label
            className="libelle mb-1.5 text-brand-orange"
            htmlFor="prix-vente-produit"
          >
            Prix vente (DA)
          </label>
          <input
            id="prix-vente-produit"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            value={formulaire.prix_vente_fixe}
            onChange={(e) =>
              setFormulaire({ ...formulaire, prix_vente_fixe: e.target.value.replace(/[^\d]/g, "") })
            }
            className="champ text-right font-semibold"
            placeholder="—"
          />
        </div>
      )}
      <div className="sm:col-span-2 mt-2">
        <label className="libelle mb-1.5">{t("inventaire.photos")}</label>
        <ChampPhotos
          photos={formPhotos}
          onChange={(p) => {
            setFormPhotos(p);
            setFormPhotosModifiees(true);
          }}
          disabled={envoi}
        />
      </div>
      {modalEdition === null && (
        <label className="sm:col-span-2 flex items-start gap-2.5 rounded-lg border border-brand-light-grey bg-brand-paper p-3 text-sm">
          <input
            type="checkbox"
            checked={formVitrine}
            onChange={(e) => setFormVitrine(e.target.checked)}
            className="mt-0.5 accent-brand-orange"
          />
          <span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-black">
              <IconeVitrine taille={14} /> {t("inventaire.mettreEnVitrine")}
            </span>
            <span className="block text-xs text-brand-warm-grey">
              Exposé physiquement en vitrine — indépendant de la mise en vente en ligne.
            </span>
          </span>
        </label>
      )}
      {modalEdition !== null && (
        <label className="sm:col-span-2 flex items-start gap-2.5 rounded-lg border border-brand-orange/40 bg-brand-glow/15 p-3 text-sm">
          <input
            type="checkbox"
            checked={formMettreEnVente}
            onChange={(e) => setFormMettreEnVente(e.target.checked)}
            className="mt-0.5 accent-brand-orange"
          />
          <span>
            <span className="inline-flex items-center gap-1.5 font-semibold text-brand-orange">
              Mettre en vente
            </span>
            <span className="block text-xs text-brand-warm-grey mt-0.5">
              Applique immédiatement le statut « En vente » à tous les exemplaires modifiés (si un prix de vente est fixé).
            </span>
          </span>
        </label>
      )}
    </div>
  );

  const groupes = donnees ? grouperDoublons(donnees.produits) : [];

  return (
    <div className="space-y-6 animate-entree">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-2 pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">{t("inventaire.titre")}</h1>
        <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
          <button
            type="button"
            onClick={() => setVueGroupee((v) => !v)}
            className="btn btn-secondaire w-full sm:w-auto justify-center"
          >
            {vueGroupee ? "Vue détaillée" : "Vue groupée"}
          </button>
          {estGerant && (
            <a
              href={`/api/produits/export?${searchParams?.toString() || ""}`}
              className="btn btn-secondaire w-full sm:w-auto justify-center"
            >
              <IconeTelechargement taille={15} />
              Export CSV
            </a>
          )}
          {peutModifier && (
            <button type="button" onClick={ouvrirAjout} className="btn btn-primaire w-full sm:w-auto justify-center">
              <IconePlus taille={15} />
              Ajouter un produit
            </button>
          )}
        </div>
      </div>

      <div className="carte space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <RechercheRapide
            valeur={q}
            onChange={(valeur) => {
              setQ(valeur);
              majUrl({ q: valeur.trim() || null });
            }}
            placeholder={t("inventaire.recherche")}
            debounceMs={300}
            className="flex-1"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={searchParams?.get("categorie") ?? ""}
              onChange={(e) => majUrl({ categorie: e.target.value || null })}
              className="champ w-full sm:w-auto"
            >
              <option value="">{t("inventaire.toutesCategories")}</option>
              {(donnees?.categories ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={searchParams?.get("sans_lot") === "1" ? "__sans__" : (searchParams?.get("lot") ?? "")}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "__sans__") majUrl({ sans_lot: "1", lot: null });
                else majUrl({ lot: v || null, sans_lot: null });
              }}
              className="champ w-full sm:w-auto"
            >
              <option value="">{t("inventaire.tousArrivages")}</option>
              <option value="__sans__">{t("inventaire.sansArrivage")}</option>
              {(donnees?.lots ?? []).map((l) => (
                <option key={l.id} value={l.id}>{l.libelle}</option>
              ))}
            </select>
            <select
              value={
                (searchParams?.get("tri") === "prix_achat" ? (searchParams?.get("ordre") === "desc" ? "prix_desc" : "prix_asc") : "")
              }
              onChange={(e) => {
                const v = e.target.value;
                if (v === "prix_asc") majUrl({ tri: "prix_achat", ordre: "asc" });
                else if (v === "prix_desc") majUrl({ tri: "prix_achat", ordre: "desc" });
                else majUrl({ tri: null, ordre: null });
              }}
              className="champ w-full sm:w-auto"
            >
              <option value="">{t("inventaire.triDefaut")}</option>
              <option value="prix_asc">{t("inventaire.prixAsc")}</option>
              <option value="prix_desc">{t("inventaire.prixDesc")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-1.5 flex-1">
            <span className="text-sm font-semibold text-brand-warm-grey mr-2 hidden sm:inline-block">{t("inventaire.statut")}</span>
            {statutsVisibles.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => basculerStatut(s)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition hover-lift ${
                  statutsActifs.includes(s)
                    ? "border-brand-smooth bg-brand-smooth text-brand-white"
                    : `border-brand-light-grey text-brand-warm-grey hover:bg-brand-light-grey/30`
                }`}
              >
                {INFOS_STATUT[s].libelle}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setAfficherPlusFiltres(!afficherPlusFiltres)}
              className={`text-sm font-medium transition flex items-center gap-1.5 px-2 py-1 rounded-md ${afficherPlusFiltres ? 'text-brand-orange bg-brand-orange/10' : 'text-brand-warm-grey hover:bg-brand-light-grey/50'}`}
            >
              <IconeTriBas taille={14} />
              {t("inventaire.plusFiltres")}
            </button>
            {nbFiltresActifs > 0 && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  router.replace("/inventaire");
                }}
                className="text-sm font-medium text-danger hover:bg-danger/10 px-2 py-1 rounded-md transition flex items-center gap-1.5"
              >
                Effacer ({nbFiltresActifs})
              </button>
            )}
          </div>
        </div>

        {afficherPlusFiltres && (
          <div className="pt-3 border-t border-brand-light-grey/50 grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-4 animate-entree">
            <label className="flex items-center gap-2 text-sm text-brand-warm-grey">
              Du
              <input
                type="date"
                value={searchParams?.get("du") ?? ""}
                onChange={(e) => majUrl({ du: e.target.value || null })}
                className="champ text-xs py-1 px-2 h-auto"
              />
              au
              <input
                type="date"
                value={searchParams?.get("au") ?? ""}
                onChange={(e) => majUrl({ au: e.target.value || null })}
                className="champ text-xs py-1 px-2 h-auto"
              />
            </label>
            <div className="h-4 w-px bg-brand-light-grey hidden sm:block"></div>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams?.get("plus30j") === "1"}
                onChange={(e) => majUrl({ plus30j: e.target.checked ? "1" : null })}
                className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
              />
              +30 jours
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams?.get("a_tarifer") === "1"}
                onChange={(e) => majUrl({ a_tarifer: e.target.checked ? "1" : null })}
                className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
              />
              À tarifer
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams?.get("a_jeter") === "1"}
                onChange={(e) => majUrl({ a_jeter: e.target.checked ? "1" : null })}
                className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
              />
              À jeter
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-brand-black cursor-pointer">
              <input
                type="checkbox"
                checked={searchParams?.get("en_vitrine") === "1"}
                onChange={(e) => majUrl({ en_vitrine: e.target.checked ? "1" : null })}
                className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
              />
              En vitrine
            </label>
          </div>
        )}
      </div>

      {donnees && (
        <p className="text-sm text-brand-warm-grey">
          <strong className="text-brand-black">{donnees.total}</strong> produit
          {donnees.total > 1 ? "s" : ""}
          {!estSocial && (
            <>
              {" "}· valeur de la sélection (achat + réparations) :{" "}
              <strong className="text-brand-black">{formaterDA(donnees.valeur)}</strong>
            </>
          )}
        </p>
      )}

      {erreur && (
        <div className="alerte-erreur" role="alert">
          {erreur}
        </div>
      )}
      {!erreur && donnees === null && (
        <p className="p-4 text-sm text-brand-warm-grey">{t("inventaire.chargement")}</p>
      )}
      {donnees && donnees.produits.length === 0 && (
        <div className="carte border-dashed p-10 text-center flex flex-col items-center justify-center space-y-4">
          <div className="rounded-full bg-brand-light-grey/30 p-4 text-brand-warm-grey">
            <IconeRecherche taille={32} />
          </div>
          <div className="space-y-1">
            <p className="text-base font-semibold text-brand-smooth">
              {t("inventaire.aucunProduit")}
            </p>
            <p className="text-sm text-brand-warm-grey max-w-sm mx-auto">
              {nbFiltresActifs > 0 
                ? "Essayez de modifier vos filtres ou de chercher avec d'autres termes pour trouver ce que vous cherchez." 
                : "Vous n'avez pas encore ajouté de produits. Commencez par en créer un pour remplir votre stock."}
            </p>
          </div>
          
          <div className="pt-2 flex gap-3">
            {nbFiltresActifs > 0 && (
              <button 
                type="button" 
                onClick={() => { setQ(""); router.replace("/inventaire"); }} 
                className="btn btn-secondaire"
              >
                Effacer les filtres
              </button>
            )}
            {peutModifier && (
              <button type="button" onClick={ouvrirAjout} className="btn btn-primaire">
                <IconePlus taille={15} />
                Ajouter un produit
              </button>
            )}
          </div>
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
                        ? "bg-brand-orange text-white"
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
                      {g.enVitrine > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-1.5 py-0.5 text-[11px] font-semibold text-brand-orange">
                          <IconeVitrine taille={11} />
                          {g.enVitrine > 1 ? `${g.enVitrine}× vitrine` : "Vitrine"}
                        </span>
                      )}
                      {g.nbImages > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-light-grey/60 px-1.5 py-0.5 text-[11px] font-semibold text-brand-warm-grey">
                          <IconeImage taille={11} />
                          {g.nbImages}
                        </span>
                      )}
                    </p>
                  </div>
                  {!estSocial && (
                    <div className="hidden shrink-0 text-right text-sm sm:block">
                      <span className="font-semibold text-brand-smooth">
                        {g.prixMin === g.prixMax
                          ? formaterDA(g.prixMin)
                          : `${formaterDA(g.prixMin)} – ${formaterDA(g.prixMax)}`}
                      </span>
                      <span className="block text-[10px] font-semibold uppercase text-brand-grey mt-0.5">{t("inventaire.achatUnitaire")}</span>
                    </div>
                  )}
                  <div className="hidden shrink-0 rounded-lg bg-brand-glow/25 px-2.5 py-1 text-right text-sm sm:block">
                    <span className="font-bold text-brand-orange">
                      {g.venteMin === null
                        ? "—"
                        : g.venteMin === g.venteMax
                          ? formaterDA(g.venteMin)
                          : `${formaterDA(g.venteMin)} – ${formaterDA(g.venteMax!)}`}
                    </span>
                    <span className="block text-[10px] font-semibold uppercase text-brand-orange/70 mt-0.5">
                      {t("inventaire.vente")}
                    </span>
                  </div>
                  <div className="flex sm:hidden flex-col items-end gap-1">
                    <div className="text-right text-sm">
                      <span className="font-bold text-brand-orange">
                        {g.venteMin === null
                          ? "—"
                          : g.venteMin === g.venteMax
                            ? formaterDA(g.venteMin)
                            : `${formaterDA(g.venteMin)}`}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:flex items-center gap-1">
                  {peutModifier &&
                    (() => {
                      const nonVendu = g.unites.filter((u) => u.statut !== "vendu");
                      const exposeIds = g.unites.filter((u) => u.en_vitrine).map((u) => u.id);
                      const enVitrine = g.enVitrine > 0;
                      const desactive = envoi || (!enVitrine && nonVendu.length === 0);
                      return (
                        <button
                          type="button"
                          disabled={desactive}
                          onClick={() =>
                            enVitrine
                              ? void basculerVitrineIds(exposeIds, false, g.reference)
                              : void basculerVitrineIds([nonVendu[0]!.id], true, g.reference)
                          }
                          title={
                            enVitrine
                              ? t("inventaire.retirerVitrine")
                              : t("inventaire.mettreVitrine")
                          }
                          aria-label={
                            enVitrine
                              ? t("inventaire.retirerReferenceVitrine", { ref: g.reference })
                              : t("inventaire.mettreReferenceVitrine", { ref: g.reference })
                          }
                          className={`rounded-md p-1.5 transition disabled:opacity-40 ${
                            enVitrine
                              ? "text-brand-orange hover:bg-brand-orange/10"
                              : "text-brand-warm-grey hover:bg-brand-light-grey/50 hover:text-brand-orange"
                          }`}
                        >
                          <IconeVitrine taille={15} />
                        </button>
                      );
                    })()}
                    <BoutonImpression 
                      ids={g.unites.map(u => u.id)} 
                      dejaImprimee={g.unites.every(u => u.etiquette_imprimee)} 
                      className="rounded-md p-1.5 hover:bg-brand-light-grey/50 hover:text-brand-black" 
                    />
                    {peutModifier && (
                      <button
                        type="button"
                        onClick={() => ouvrirEdition(g.unites, g.reference)}
                        title={t("inventaire.editerTout")}
                        aria-label={t("inventaire.editerGroupe", { ref: g.reference })}
                        className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                      >
                        <IconeCrayon taille={15} />
                      </button>
                    )}
                  {peutModifier && (
                    <button
                      type="button"
                      onClick={() => ouvrirSuppressionModele(g)}
                      title={
                        g.unites.length > 1
                          ? t("inventaire.supprimerTous", { ref: g.reference })
                          : t("inventaire.supprimerProduit")
                      }
                      aria-label={t("inventaire.supprimerGroupe", { ref: g.reference })}
                      className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                    >
                      <IconeCorbeille taille={15} />
                    </button>
                  )}
                  </div>
                  <button
                    type="button"
                    onClick={() => basculerGroupe(g.cle)}
                    aria-label={ouvert ? t("inventaire.reduire") : t("inventaire.developper")}
                    className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                  >
                    <IconeChevronBas
                      taille={16}
                      className={`transition ${ouvert ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>
                {peutModifier && (
                  <div className="flex sm:hidden items-center justify-between border-t border-brand-light-grey/50 px-4 py-2 bg-brand-light-grey/10">
                    {(() => {
                      const nonVendu = g.unites.filter((u) => u.statut !== "vendu");
                      const exposeIds = g.unites.filter((u) => u.en_vitrine).map((u) => u.id);
                      const enVitrine = g.enVitrine > 0;
                      const desactive = envoi || (!enVitrine && nonVendu.length === 0);
                      return (
                        <button
                          type="button"
                          disabled={desactive}
                          onClick={() =>
                            enVitrine
                              ? void basculerVitrineIds(exposeIds, false, g.reference)
                              : void basculerVitrineIds([nonVendu[0]!.id], true, g.reference)
                          }
                          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                            enVitrine
                              ? "bg-brand-orange/10 text-brand-orange"
                              : "text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange"
                          }`}
                        >
                          <IconeVitrine taille={14} /> {enVitrine ? t("inventaire.retirer") : t("inventaire.vitrine")}
                        </button>
                      );
                    })()}
                    <div className="flex items-center gap-2">
                      <BoutonImpression 
                        ids={g.unites.map(u => u.id)} 
                        dejaImprimee={g.unites.every(u => u.etiquette_imprimee)} 
                        className="flex items-center gap-1.5 rounded-md bg-brand-light-grey/30 px-3 py-1.5 text-xs font-semibold text-brand-black transition hover:bg-brand-light-grey" 
                        texte={t("inventaire.imprimer")}
                      />
                      <button
                        type="button"
                        onClick={() => ouvrirEdition(g.unites, g.reference)}
                        className="flex items-center gap-1.5 rounded-md bg-brand-light-grey/30 px-3 py-1.5 text-xs font-semibold text-brand-black transition hover:bg-brand-light-grey"
                      >
                        <IconeCrayon taille={14} /> {t("inventaire.editer")}
                      </button>
                      <button
                        type="button"
                        onClick={() => ouvrirSuppressionModele(g)}
                        className="flex items-center gap-1.5 rounded-md bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20"
                      >
                        <IconeCorbeille taille={14} /> {t("inventaire.supprimer")}
                      </button>
                    </div>
                  </div>
                )}

                {ouvert && (
                  <ul className="divide-y divide-brand-light-grey/60 border-t border-brand-light-grey">
                    {g.unites.map((p) => (
                      <li key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 px-4 py-2 text-sm">
                        <div className="flex items-center justify-between sm:justify-start gap-2 min-w-0 w-full sm:w-auto sm:flex-1">
                          <button
                            type="button"
                            onClick={() => router.push(`/produits/${p.id}`)}
                            className="min-w-0 flex-1 text-left transition hover:text-brand-crystal"
                          >
                          <span className="font-mono text-xs text-brand-warm-grey">
                            {p.code_interne}
                          </span>{" "}
                          <span className="text-xs text-brand-grey">
                            {p.lot_id ? t("inventaire.lotNumero", { n: p.lot_id }) : t("inventaire.sansArrivage")}
                            {` · ${t("inventaire.achat")} ${formaterDA(p.prix_achat)}`} · {t("inventaire.joursNb", { n: p.jours_stock })}
                          </span>{" "}
                          <span className="text-xs font-bold text-brand-orange">
                            {prixVenteAffiche(p) !== null
                              ? `${t("inventaire.vente")} ${formaterDA(prixVenteAffiche(p)!)}`
                              : ""}
                          </span>
                        </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />
                            {p.en_vitrine && (
                              <IconeVitrine
                                taille={14}
                                className="shrink-0 text-brand-orange"
                                aria-label={t("inventaire.enVitrine")}
                              />
                            )}
                          </div>
                        </div>
                        {peutModifier && (
                          <div className="flex items-center justify-end gap-1 mt-1 sm:mt-0">
                            {p.statut !== "vendu" && (
                              <button
                                type="button"
                                disabled={envoi}
                                onClick={() =>
                                  void basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne)
                                }
                                title={p.en_vitrine ? t("inventaire.retirerVitrine") : t("inventaire.mettreVitrine")}
                                aria-label={t("inventaire.basculerVitrine", { code: p.code_interne, action: p.en_vitrine ? t("inventaire.retirer") : t("inventaire.mettre") })}
                                className={`rounded-md p-1.5 transition disabled:opacity-40 ${
                                  p.en_vitrine
                                    ? "text-brand-orange hover:bg-brand-orange/10"
                                    : "text-brand-warm-grey hover:bg-brand-light-grey/50 hover:text-brand-orange"
                                }`}
                              >
                                <IconeVitrine taille={14} />
                              </button>
                            )}
                            <BoutonImpression 
                              ids={[p.id]} 
                              dejaImprimee={p.etiquette_imprimee} 
                              className="rounded-md p-1.5 hover:bg-brand-light-grey/50 hover:text-brand-black" 
                            />
                            <button
                              type="button"
                              onClick={() => ouvrirEdition([p], p.code_interne)}
                              title={t("inventaire.editer")}
                              aria-label={t("inventaire.editerProduit", { code: p.code_interne })}
                              className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                            >
                              <IconeCrayon taille={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => ouvrirSuppressionUnites([p])}
                              title={t("inventaire.supprimer")}
                              aria-label={t("inventaire.supprimerProduit", { code: p.code_interne })}
                              className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                            >
                              <IconeCorbeille taille={14} />
                            </button>
                          </div>
                        )}
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
        <div className="space-y-4">
          <div className="flex flex-col gap-3 md:hidden">
            {donnees.produits.map((p) => (
              <div
                key={p.id}
                onClick={() => router.push(`/produits/${p.id}`)}
                className="relative flex flex-col gap-3 rounded-xl border border-brand-light-grey bg-brand-white p-4 shadow-sm transition active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="font-mono text-xs text-brand-warm-grey">{p.code_interne}</span>
                    <span className="font-medium text-brand-black">{p.reference}</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="block text-[10px] font-semibold uppercase text-brand-orange/70 mb-0.5">{t("inventaire.vente")}</span>
                    {prixVenteAffiche(p) !== null ? (
                      <span className="font-bold text-brand-orange">
                        {formaterDA(prixVenteAffiche(p)!)}
                      </span>
                    ) : (
                      <span className="text-brand-grey">—</span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-light-grey/20 px-2 py-1">
                    <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />
                  </span>
                  <span className="inline-flex items-center rounded-full bg-brand-light-grey/20 px-2 py-1 text-brand-warm-grey">
                    {p.categorie}
                  </span>
                  {p.en_vitrine && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/10 px-2 py-1 text-brand-orange">
                      <IconeVitrine taille={12} /> {t("inventaire.vitrine")}
                    </span>
                  )}
                  {p.statut === "vendu" && (
                    <span className="inline-flex items-center rounded-full bg-brand-grey/20 px-2 py-1 font-semibold text-brand-grey uppercase text-[10px]">
                      {t("inventaire.statutVendu")}
                    </span>
                  )}
                </div>

                <div className="flex justify-between border-t border-brand-light-grey/50 pt-2 text-xs">
                  <div className="flex flex-col">
                    <span className="text-brand-warm-grey">{new Date(p.date_entree).toLocaleDateString("fr-FR")}</span>
                    <span className="text-[10px] text-brand-grey">
                      {p.lot_id ? t("inventaire.lotShort", { n: p.lot_id }) : t("inventaire.sansArrivage")}
                    </span>
                  </div>
                  {!estSocial && (
                    <div className="text-right">
                      <span className="block text-[10px] font-semibold uppercase text-brand-grey">{t("inventaire.achat")}</span>
                      <span className="font-semibold">{formaterDA(p.prix_achat)}</span>
                      {p.cout_reparations > 0 && <span className="block text-[10px] text-brand-grey">+{formaterDA(p.cout_reparations)}</span>}
                    </div>
                  )}
                </div>

                {peutModifier && (
                  <div className="flex justify-end gap-2 border-t border-brand-light-grey/50 pt-2 mt-1">
                    {p.statut !== "vendu" && (
                      <button
                        type="button"
                        disabled={envoi}
                        onClick={(e) => {
                          e.stopPropagation();
                          void basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne);
                        }}
                        className={`flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold transition disabled:opacity-40 ${
                          p.en_vitrine
                            ? "bg-brand-orange/10 text-brand-orange"
                            : "bg-brand-light-grey/20 text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange"
                        }`}
                      >
                        <IconeVitrine taille={14} /> {p.en_vitrine ? t("inventaire.retirer") : t("inventaire.vitrine")}
                      </button>
                    )}
                    <BoutonImpression 
                      ids={[p.id]} 
                      dejaImprimee={p.etiquette_imprimee} 
                      className="flex items-center gap-1 rounded-md bg-brand-light-grey/20 px-3 py-1.5 text-xs font-semibold text-brand-warm-grey transition hover:bg-brand-light-grey hover:text-brand-black" 
                      texte={t("inventaire.imprimer")}
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ouvrirEdition([p], p.code_interne);
                      }}
                      className="flex items-center gap-1 rounded-md bg-brand-light-grey/20 px-3 py-1.5 text-xs font-semibold text-brand-warm-grey transition hover:bg-brand-light-grey hover:text-brand-black"
                    >
                      <IconeCrayon taille={14} /> {t("inventaire.editer")}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        ouvrirSuppressionUnites([p]);
                      }}
                      className="flex items-center gap-1 rounded-md bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20"
                    >
                      <IconeCorbeille taille={14} /> {t("inventaire.supprimer")}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-brand-light-grey/25">
                <tr>
                  {COLONNES_TRI.filter(c => c.cle !== 'prix_achat' || !estSocial).map((c) => (
                    <th
                      key={c.cle}
                      onClick={() => trierPar(c.cle)}
                      className="entete-table cursor-pointer select-none transition hover:text-brand-black"
                    >
                      <span className="inline-flex items-center gap-1">
                        {t(c.libelle)}
                        {triActuel === c.cle &&
                          (ordreActuel === "asc" ? (
                            <IconeTriHaut taille={12} />
                          ) : (
                            <IconeTriBas taille={12} />
                          ))}
                      </span>
                    </th>
                  ))}
                  <th className="entete-table text-right">{t("inventaire.jours")}</th>
                  <th className="entete-table" />
                </tr>
              </thead>
              <tbody className="">
                {donnees.produits.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/produits/${p.id}`)}
                    className="ligne-table border-b border-brand-light-grey/30 last:border-0 cursor-pointer transition-colors hover:bg-brand-light-grey/10"
                  >
                    <td className="px-3 py-2 font-mono text-xs text-brand-warm-grey">
                      {p.code_interne}
                    </td>
                    <td className="max-w-64 truncate px-3 py-2 font-medium" title={p.reference}>
                      {p.reference}
                    </td>
                    <td className="px-3 py-2">{p.categorie}</td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />
                        {p.en_vitrine && (
                          <IconeVitrine
                            taille={14}
                            className="text-brand-orange"
                            aria-label={t("inventaire.enVitrine")}
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {new Date(p.date_entree).toLocaleDateString("fr-FR")}
                      <span className="block text-brand-grey">
                        {p.lot_id
                          ? t("inventaire.lotLong", { n: p.lot_id, f: p.fournisseur || "" })
                          : t("inventaire.sansArrivage")}
                      </span>
                    </td>
                    {!estSocial && (
                      <td className="px-3 py-2 text-right">
                        <span className="block text-[10px] font-semibold uppercase text-brand-grey mb-0.5">{t("inventaire.achat")}</span>
                        <span className="font-semibold text-brand-black">{formaterDA(p.prix_achat)}</span>
                        {p.cout_reparations > 0 && (
                          <span className="block text-xs text-brand-grey">
                            +{formaterDA(p.cout_reparations)} {t("inventaire.reparationsAbr")}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-3 py-2 text-right">
                      <span className="block text-[10px] font-semibold uppercase text-brand-orange/70 mb-0.5">{t("inventaire.vente")}</span>
                      {prixVenteAffiche(p) !== null ? (
                        <span className="font-bold text-brand-orange">
                          {formaterDA(prixVenteAffiche(p)!)}
                          {p.statut === "vendu" && (
                            <span className="block text-[10px] font-semibold uppercase text-brand-grey">
                              {t("inventaire.statutVendu")}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-brand-grey">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">{p.jours_stock}</td>
                    <td className="px-2 py-2">
                      {peutModifier && (
                        <span className="flex items-center justify-end gap-1">
                          {p.statut !== "vendu" && (
                            <button
                              type="button"
                              disabled={envoi}
                              onClick={(e) => {
                                e.stopPropagation();
                                void basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne);
                              }}
                              title={p.en_vitrine ? t("inventaire.retirerVitrine") : t("inventaire.mettreVitrine")}
                              aria-label={t("inventaire.basculerVitrine", { code: p.code_interne, action: p.en_vitrine ? t("inventaire.retirer") : t("inventaire.mettre") })}
                              className={`rounded-md p-1.5 transition disabled:opacity-40 ${
                                p.en_vitrine
                                  ? "text-brand-orange hover:bg-brand-orange/10"
                                  : "text-brand-warm-grey hover:bg-brand-light-grey/50 hover:text-brand-orange"
                              }`}
                            >
                              <IconeVitrine taille={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/imprimer-etiquettes?ids=${p.id}`, '_blank');
                            }}
                            title={t("inventaire.imprimer")}
                            aria-label={t("inventaire.imprimerEtiquette", { code: p.code_interne })}
                            className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                          >
                            <IconeImprimante taille={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ouvrirEdition([p], p.code_interne);
                            }}
                            title={t("inventaire.editer")}
                            aria-label={t("inventaire.editerProduit", { code: p.code_interne })}
                            className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-brand-light-grey/50 hover:text-brand-black"
                          >
                            <IconeCrayon taille={14} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ouvrirSuppressionUnites([p]);
                            }}
                            title={t("inventaire.supprimer")}
                            aria-label={t("inventaire.supprimerProduit", { code: p.code_interne })}
                            className="rounded-md p-1.5 text-brand-warm-grey transition hover:bg-danger/10 hover:text-danger"
                          >
                            <IconeCorbeille taille={14} />
                          </button>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            {t("inventaire.precedent")}
          </button>
          <div className="flex items-center gap-1 px-2">
            {(() => {
              const totalPages = donnees.pages;
              const currentPage = page;
              
              const renderPageButton = (p: number) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => majUrl({ page: String(p) })}
                  className={`flex h-8 w-8 items-center justify-center rounded-md transition ${
                    currentPage === p
                      ? "bg-brand-black text-brand-white font-bold"
                      : "text-brand-warm-grey hover:bg-brand-light-grey/50 hover:text-brand-black"
                  }`}
                >
                  {p}
                </button>
              );
              
              const pages: React.ReactNode[] = [];
              if (totalPages <= 7) {
                for (let i = 1; i <= totalPages; i++) {
                  pages.push(renderPageButton(i));
                }
              } else {
                pages.push(renderPageButton(1));
                
                if (currentPage > 3) {
                  pages.push(<span key="ell1" className="px-1 text-brand-light-grey">...</span>);
                }
                
                const start = Math.max(2, currentPage - 1);
                const end = Math.min(totalPages - 1, currentPage + 1);
                
                for (let i = start; i <= end; i++) {
                  pages.push(renderPageButton(i));
                }
                
                if (currentPage < totalPages - 2) {
                  pages.push(<span key="ell2" className="px-1 text-brand-light-grey">...</span>);
                }
                
                pages.push(renderPageButton(totalPages));
              }
              
              return pages;
            })()}
          </div>
          <button
            type="button"
            disabled={page >= donnees.pages}
            onClick={() => majUrl({ page: String(page + 1) })}
            className="btn btn-secondaire"
          >
            {t("inventaire.suivant")}
            <IconeChevronDroite taille={15} />
          </button>
        </div>
      )}

      <Modale
        titre={t("inventaire.ajouterProduitTitre")}
        ouverte={modalAjout}
        onFermer={() => {
          setModalAjout(false);
          majUrl({ ajouter: null });
        }}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!envoi && formulaireValide) {
              void ajouterProduit();
            }
          }}
        >
          <div>
            <label className="libelle mb-1.5" htmlFor="lot-produit">
              {t("inventaire.lotRattachement")}
            </label>
            <select
              id="lot-produit"
              value={formulaire.lot_id}
              onChange={(e) => setFormulaire({ ...formulaire, lot_id: e.target.value })}
              className="champ"
            >
              <option value="">{t("inventaire.stockIndependant")}</option>
              {(donnees?.lots ?? []).map((l) => (
                <option key={l.id} value={l.id}>
                  {l.libelle}
                </option>
              ))}
            </select>
          </div>
          {champsProduit}
          <div className="pt-2 text-right">
            <button
              type="submit"
              disabled={envoi || !formulaireValide}
              className="btn btn-primaire w-full sm:w-auto justify-center"
            >
              <IconePlus taille={15} />
              {t("inventaire.ajouterAction")}
            </button>
          </div>
        </form>
      </Modale>

      <Modale
        titre={modalEdition ? (modalEdition.unites.length === 1
            ? t("inventaire.editerProduitTitre", { code: modalEdition.unites[0]!.code_interne })
            : t("inventaire.editionMasseTitre", { n: modalEdition.unites.length })) : ""}
        ouverte={modalEdition !== null}
        onFermer={() => setModalEdition(null)}
      >
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!envoi && formulaireValide) {
              void modifierProduit();
            }
          }}
        >
          {champsProduit}

          {modalEdition && peutStatut && (
            <div className="space-y-2 rounded-lg border border-brand-light-grey bg-brand-paper p-3">
              <div className="flex flex-col items-start sm:flex-row sm:items-center justify-between gap-2">
                <span className="libelle">{t("inventaire.statut")}</span>
                <BadgeStatut statut={modalEdition.unites[0]!.statut} aJeter={modalEdition.unites[0]!.a_jeter} />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  value={cibleStatut || ""}
                  onChange={(e) => {
                    const val = e.target.value as StatutProduit;
                    if (val) {
                      void changerStatut(val);
                    }
                  }}
                  disabled={envoi || cibleStatut !== null}
                  className="champ text-sm py-1.5"
                >
                  <option value="">{t("inventaire.changerStatut")}</option>
                  {STATUTS_PRODUIT.filter((s) => s !== modalEdition.unites[0]!.statut).map((s) => (
                    <option key={s} value={s}>
                      {INFOS_STATUT[s].libelle}
                    </option>
                  ))}
                </select>
              </div>

              {cibleStatut && (
                <div className="space-y-2 rounded-lg bg-brand-white p-2.5">
                  <label className="libelle" htmlFor="note-statut-inv">
                    {t("inventaire.noteObligatoire", { statut: INFOS_STATUT[cibleStatut].libelle })}
                  </label>
                  <textarea
                    id="note-statut-inv"
                    value={noteStatut}
                    onChange={(e) => setNoteStatut(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder={PLACEHOLDERS_NOTE[cibleStatut] ?? t("inventaire.precisezRaison")}
                    className="champ"
                  />
                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setCibleStatut(null);
                        setNoteStatut("");
                      }}
                      className="btn btn-secondaire"
                    >
                      {t("inventaire.annuler")}
                    </button>
                    <button
                      type="button"
                      disabled={envoi || !noteStatut.trim()}
                      onClick={() => void changerStatut(cibleStatut)}
                      className="btn btn-primaire"
                    >
                      {t("inventaire.confirmerStatut")}
                    </button>
                  </div>
                </div>
              )}

              {modalEdition.unites[0]!.statut === "hs" && (
                <label className="flex items-start gap-2 pt-1 text-sm">
                  <input
                    type="checkbox"
                    checked={modalEdition.unites[0]!.a_jeter}
                    disabled={envoi}
                    onChange={(e) => void basculerAJeter(e.target.checked)}
                    className="mt-0.5 accent-danger shrink-0"
                  />
                  <span>{t("inventaire.aJeterNonRecuperable")}</span>
                </label>
              )}
            </div>
          )}

          {modalEdition && peutModifier && modalEdition.unites[0]!.statut !== "vendu" && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand-light-grey bg-brand-paper p-3">
              <div className="min-w-0">
                <span className="libelle inline-flex items-center gap-1.5">
                  <IconeVitrine taille={14} /> {t("inventaire.vitrine")}
                </span>
                <p className="text-xs text-brand-warm-grey">
                  {t("inventaire.vitrineDescription")}
                </p>
              </div>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void basculerVitrine()}
                className={
                  modalEdition.unites[0]!.en_vitrine
                    ? "btn bg-brand-orange text-white hover:bg-brand-orange/90"
                    : "btn btn-secondaire"
                }
              >
                {modalEdition.unites[0]!.en_vitrine ? t("inventaire.retirerVitrine") : t("inventaire.mettreVitrine")}
              </button>
            </div>
          )}

          <div className="pt-2 text-right">
            <button
              type="submit"
              disabled={envoi || !formulaireValide}
              className="btn btn-primaire w-full sm:w-auto justify-center"
            >
              {t("inventaire.enregistrerModifications")}
            </button>
          </div>
        </form>
      </Modale>

      <Modale
        titre={
          modalSuppression
            ? modalSuppression.unites.length === 0
              ? t("inventaire.suppressionImpossible")
              : modalSuppression.type === "modele"
                ? t("inventaire.supprimerModeleTitre", { ref: modalSuppression.reference })
                : modalSuppression.unites.length === 1
                  ? t("inventaire.supprimerUniteTitre", { code: modalSuppression.unites[0]!.code_interne })
                  : t("inventaire.supprimerMasseTitre", { n: modalSuppression.unites.length })
            : ""
        }
        ouverte={modalSuppression !== null}
        onFermer={() => setModalSuppression(null)}
      >
        {modalSuppression && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!envoi && modalSuppression.unites.length > 0) {
                void supprimerProduits();
              }
            }}
          >
            {modalSuppression.unites.length === 0 ? (
              <p className="text-sm text-brand-warm-grey">
                {modalSuppression.vendusExclus === 1
                  ? t("inventaire.suppressionImpossibleVendu")
                  : modalSuppression.vendusExclus > 1
                    ? t("inventaire.suppressionImpossibleVendus", { n: modalSuppression.vendusExclus })
                    : t("inventaire.aucuneSuppression")}
              </p>
            ) : modalSuppression.type === "modele" ? (
              <p className="text-sm text-brand-warm-grey">
                {t("inventaire.suppressionModeleAvertissement", { ref: modalSuppression.reference, cat: modalSuppression.categorie })}
              </p>
            ) : modalSuppression.unites.length === 1 ? (
              <p className="text-sm text-brand-warm-grey">
                {t("inventaire.suppressionUniteAvertissement", { ref: modalSuppression.unites[0]!.reference })}
              </p>
            ) : (
              <p className="text-sm text-brand-warm-grey">
                {t("inventaire.suppressionMasseAvertissement", { n: modalSuppression.unites!.length })}
                <strong className="text-brand-black">{modalSuppression.reference}</strong> (
                {modalSuppression.unites[0]?.code_interne} {t("inventaire.a")} {" "}
                {modalSuppression.unites[modalSuppression.unites.length - 1]?.code_interne}) {t("inventaire.suppressionIreversible")}
              </p>
            )}

            {modalSuppression.unites.length > 0 &&
              modalSuppression.vendusExclus > 0 &&
              (modalSuppression.type === "modele" ? (
                <p className="mt-2 rounded-lg bg-brand-light-grey/30 px-3 py-2 text-xs text-brand-warm-grey">
                  Les exemplaires déjà vendus de ce modèle sont conservés (historique de vente
                  préservé).
                </p>
              ) : (
                <p className="mt-2 rounded-lg bg-brand-light-grey/30 px-3 py-2 text-xs text-brand-warm-grey">
                  {modalSuppression.vendusExclus} exemplaire
                  {modalSuppression.vendusExclus > 1 ? "s" : ""} vendu
                  {modalSuppression.vendusExclus > 1 ? "s" : ""} conservé
                  {modalSuppression.vendusExclus > 1 ? "s" : ""} (historique de vente préservé).
                </p>
              ))}

            <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalSuppression(null)}
                className="btn btn-secondaire w-full sm:w-auto justify-center"
              >
                {modalSuppression.unites.length === 0 ? "Fermer" : "Annuler"}
              </button>
              {modalSuppression.unites.length > 0 && (
                <button
                  type="submit"
                  disabled={envoi}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-500 disabled:opacity-50 flex items-center justify-center gap-1.5 w-full sm:w-auto"
                >
                  <IconeCorbeille taille={15} />
                  Supprimer définitivement
                </button>
              )}
            </div>
          </form>
        )}
      </Modale>
    </div>
  );
}
