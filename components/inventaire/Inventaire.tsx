"use client";

import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  IconeOeil,
  IconeOeilBarre,
} from "@/components/icons";
import BoutonImpression from "@/components/BoutonImpression";
import RechercheRapide from "@/components/RechercheRapide";
import { useT } from "@/lib/i18n/contexte";
import { useBrouillon } from "@/hooks/useBrouillon";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";
import { decodeBase64Url } from "@/lib/base64url";
import Cockpit from "./Cockpit";
import VueCategorie from "./VueCategorie";
import VueFamille from "./VueFamille";
import CarteProduit from "./CarteProduit";

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
  const [qLoc, setQLoc] = useState(searchParams?.get("q") ?? "");
  const [donnees, setDonnees] = useState<ReponseInventaire | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);

  const [modalAjout, setModalAjout] = useState(searchParams?.get("ajouter") === "1");
  const [produitSourceDuplication, setProduitSourceDuplication] = useState<LigneProduit | null>(null);

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

  const [contexteNavigation, setContexteNavigation] = useState<{
    produits: LigneProduit[];
    indexCourant: number;
  } | null>(null);

  const brouillonCle = modalEdition 
    ? `produit-edit-${role}-${modalEdition.unites[0]!.id}`
    : produitSourceDuplication
      ? `produit-dup-${role}-${produitSourceDuplication.id}`
      : modalAjout 
        ? `produit-ajout-${role}`
        : "";

  const {
    valeur: formulaire,
    setValeur: setFormulaire,
    setValeurForcee: setFormulaireForcee,
    isDirty: formulaireModifie,
    brouillonDisponible,
    restaurerBrouillon,
    supprimerBrouillon,
    validerEtVider: validerBrouillon
  } = useBrouillon<FormulaireProduit>(
    brouillonCle,
    modalEdition ? {
      reference: modalEdition.unites[0]!.reference,
      categorie: modalEdition.unites[0]!.categorie,
      prix_achat: String(modalEdition.unites[0]!.prix_achat),
      lot_id: modalEdition.unites[0]!.lot_id ? String(modalEdition.unites[0]!.lot_id) : "",
      prix_vente_fixe: modalEdition.unites[0]!.prix_vente_fixe !== null ? String(modalEdition.unites[0]!.prix_vente_fixe) : "",
      quantite: String(modalEdition.unites.length),
    } : produitSourceDuplication ? {
      reference: produitSourceDuplication.reference,
      categorie: produitSourceDuplication.categorie,
      prix_achat: String(produitSourceDuplication.prix_achat),
      lot_id: produitSourceDuplication.lot_id ? String(produitSourceDuplication.lot_id) : "",
      prix_vente_fixe: produitSourceDuplication.prix_vente_fixe !== null ? String(produitSourceDuplication.prix_vente_fixe) : "",
      quantite: "1",
    } : {
      ...FORMULAIRE_VIDE,
      categorie: searchParams?.get("cle")
        ? decodeBase64Url(searchParams.get("cle")!).substring(decodeBase64Url(searchParams.get("cle")!).lastIndexOf("|") + 1)
        : searchParams?.get("categorie") || "",
      reference: searchParams?.get("cle") 
        ? decodeBase64Url(searchParams.get("cle")!).substring(0, decodeBase64Url(searchParams.get("cle")!).lastIndexOf("|")) 
        : "",
    },
    modalAjout || modalEdition !== null || produitSourceDuplication !== null
  );

  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formPhotosModifiees, setFormPhotosModifiees] = useState(false);
  const [formVitrine, setFormVitrine] = useState(false);
  const [formMettreEnVente, setFormMettreEnVente] = useState(false);

  const vueGroupee = false;
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
  const [afficherPlusFiltres, setAfficherPlusFiltres] = useState(false);
  const [afficherFamilles, setAfficherFamilles] = useState(true);
  
  const vueActuelle = searchParams?.get("vue");
  const [modeAffichage, setModeAffichage] = useState<"cartes" | "tableau">(
    vueActuelle === "famille" ? "cartes" : "tableau"
  );

  // Synchroniser le mode par défaut si on navigue vers une famille
  useEffect(() => {
    if (vueActuelle === "famille") {
      setModeAffichage("cartes");
    } else if (vueActuelle === "cockpit" || vueActuelle === "atraiter") {
      setModeAffichage("tableau");
    }
  }, [vueActuelle]);

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

      // Nettoyage contextuel : quand on change de vue, supprimer les
      // paramètres qui n'ont pas de sens dans la nouvelle vue pour
      // éviter les « filtres fantômes ».
      if ("vue" in modifs) {
        const nouvelleVue = modifs.vue;
        // Quitter une catégorie / famille → nettoyer cle, categorie, reference_exacte
        if (nouvelleVue !== "famille") params.delete("cle");
        if (nouvelleVue !== "categorie" && nouvelleVue !== "famille") {
          params.delete("reference_exacte");
        }
        // Retour au cockpit → nettoyer tous les filtres sauf q
        if (nouvelleVue === "cockpit") {
          params.delete("categorie");
          params.delete("cle");
          params.delete("reference_exacte");
        }
      }

      router.replace(`/inventaire?${params.toString()}`, { scroll: false });
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
    (searchParams?.get("sans_photo") ? 1 : 0) +
    (searchParams?.get("sans_etiquette") ? 1 : 0) +
    (searchParams?.get("a_jeter") ? 1 : 0) +
    (searchParams?.get("en_vitrine") ? 1 : 0) +
    statutsActifs.length +
    (searchParams?.get("tri") ? 1 : 0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const charger = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setErreur(null);
    try {
      const params = new URLSearchParams(searchParams?.toString() || "");
      if (vueGroupee) {
        params.set("grouper", "1");
      }
      const res = await fetch(`/api/produits?${params.toString()}`, {
        cache: "no-store",
        signal: abortControllerRef.current.signal,
      });
      if (!res.ok) {
        const corps = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(corps?.error ?? "Erreur lors du chargement de l'inventaire.");
      }
      const data = await res.json() as ReponseInventaire;
      setDonnees(data);
    } catch (e: any) {
      if (e.name === "AbortError") return; // Ignorer les requêtes annulées
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    }
  }, [searchParams, vueGroupee]);

  useEffect(() => {
    void charger();
  }, [charger]);

  // Synchroniser l'état local si l'URL change (ex: bouton retour du navigateur)
  useEffect(() => {
    const urlQ = searchParams?.get("q") ?? "";
    setQ(urlQ);
    setQLoc(urlQ);
  }, [searchParams?.get("q")]);

  function basculerStatut(statut: StatutProduit) {
    const suivants = statutsActifs.includes(statut)
      ? statutsActifs.filter((s) => s !== statut)
      : [...statutsActifs, statut];
    majUrl({ statuts: suivants.join(",") || null, page: "1" });
  }

  function trierPar(cle: string) {
    const triActuel = searchParams?.get("tri") ?? "code_interne";
    const ordreActuel = searchParams?.get("ordre") ?? "asc";
    majUrl({
      tri: cle,
      ordre: triActuel === cle && ordreActuel === "asc" ? "desc" : "asc",
      page: "1",
    });
  }

  // Scanner local : quand on scanne depuis l'inventaire, on cherche
  // le produit par code_interne exact et on navigue vers sa fiche.
  useBarcodeScanner(useCallback((code: string) => {
    // Recherche exacte par code_interne via la barre de recherche
    setQ(code);
    setQLoc(code);
    majUrl({ q: code, page: "1" });
    afficher(`Scan : ${code}`);
  }, [majUrl, afficher]));

  function ouvrirAjout(source?: LigneProduit) {
    if (source) {
      setProduitSourceDuplication(source);
      setFormPhotos(source.image_url ? [source.image_url] : []);
      if (source.nb_images > 1) {
        void fetch(`/api/produits/${source.id}`)
          .then((r) => (r.ok ? (r.json() as Promise<{ images?: string[] }>) : null))
          .then((d) => {
            if (d?.images) setFormPhotos(d.images);
          })
          .catch(() => undefined);
      }
    } else {
      setProduitSourceDuplication(null);
      setFormPhotos([]);
    }
    setFormPhotosModifiees(false);
    setFormVitrine(false);
    setFormMettreEnVente(false);
    setModalAjout(true);
  }

  function ouvrirEdition(unites: LigneProduit[], titre: string, contexteCustom?: LigneProduit[]) {
    const premier = unites[0]!;
    setFormPhotos(premier.image_url ? [premier.image_url] : []);
    setFormPhotosModifiees(false);
    setCibleStatut(null);
    setNoteStatut("");
    setFormMettreEnVente(false);
    setModalEdition({ unites, titre });
    
    if (unites.length === 1) {
      const liste = contexteCustom || (donneesFiltrees ? donneesFiltrees.produits : []);
      const idx = liste.findIndex(p => p.id === premier.id);
      if (idx !== -1) {
        setContexteNavigation({ produits: liste, indexCourant: idx });
      } else {
        setContexteNavigation(null);
      }
    } else {
      setContexteNavigation(null);
    }

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
    if (envoi) return;
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
    if (envoi) return;
    if (!modalEdition) return;
    const cible = !modalEdition.unites[0]!.en_vitrine;
    setEnvoi(true);
    try {
      const ids = modalEdition.unites.map(u => u.id);
      
      // Update vitrine in mass
      const res = await fetch(`/api/produits/masse/vitrine`, {
        method: "POST",
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
    if (envoi) return;
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
      // On met à jour l'état local de la modale pour refléter le nouveau statut
      // SANS la fermer, afin de ne pas perdre le reste de la saisie.
      setModalEdition({
        ...modalEdition,
        unites: modalEdition.unites.map(u => ({ ...u, statut: cible }))
      });
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
    if (envoi) return;
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
    if (envoi) return;
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
          prix_vente_fixe: formulaire.prix_vente_fixe.trim() ? Number(formulaire.prix_vente_fixe) : null,
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
      validerBrouillon();
      setModalAjout(false);
      setProduitSourceDuplication(null);
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function modifierProduit(fermerModal = true): Promise<boolean> {
    if (envoi) return false;
    if (!modalEdition) return false;
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
        return false;
      }
      afficher(`Produit(s) ${modalEdition.titre} modifié(s).`);
      validerBrouillon();
      if (fermerModal) {
        setModalEdition(null);
        setContexteNavigation(null);
      }
      await charger();
      return true;
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
      return false;
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
    if (envoi) return;
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

  // Client-side instant filtering while waiting for server response
  const donneesFiltrees = useMemo<ReponseInventaire | null>(() => {
    if (!donnees) return null;
    if (!qLoc.trim()) return donnees;

    const searchLower = qLoc.trim().toLowerCase();
    const produitsFiltres = donnees.produits.filter(p => 
      p.code_interne.toLowerCase().includes(searchLower) ||
      p.reference.toLowerCase().includes(searchLower) ||
      (p.categorie && p.categorie.toLowerCase().includes(searchLower)) ||
      (p.fournisseur && p.fournisseur.toLowerCase().includes(searchLower)) ||
      (p.lot_id && String(p.lot_id).includes(searchLower))
    );

    return {
      ...donnees,
      produits: produitsFiltres
      // On conserve donnees.total pour ne pas fausser le compteur global
    };
  }, [donnees, qLoc]);

  // Correction : rediriger automatiquement si la page courante est hors des limites
  // (par exemple, si on supprime le dernier élément d'une page).
  useEffect(() => {
    if (donnees && donnees.page > donnees.pages && donnees.pages > 0) {
      majUrl({ page: String(donnees.pages) });
    }
  }, [donnees, majUrl]);

  const groupes = donneesFiltrees ? grouperDoublons(donneesFiltrees.produits) : [];

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
        {modalEdition !== null && Number(formulaire.quantite) !== modalEdition.unites.length && (
          <div className="mt-2 text-[11px] font-medium leading-tight text-brand-orange bg-brand-orange/10 p-2 rounded-md">
            ⚠️ Attention : Modifier la quantité entraînera la création ou la suppression physique d'exemplaires dans l'inventaire.
          </div>
        )}
      </div>
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

  const vue = searchParams?.get("vue") || "cockpit";

  return (
    <>
      <div className="space-y-4 animate-entree mb-8">
        {/* Header & Actions principales */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-2 text-sm text-brand-warm-grey font-medium">
            {vue !== "cockpit" ? (
              <>
                <button 
                  onClick={() => majUrl({ vue: "cockpit", a_tarifer: null, statuts: null, sans_photo: null, sans_etiquette: null })} 
                  className="hover:text-brand-orange transition-colors flex items-center gap-1 bg-white dark:bg-brand-paper px-2 py-1 rounded-md border border-brand-light-grey dark:border-white/10 shadow-sm"
                >
                  <IconeChevronGauche taille={14} /> Cockpit
                </button>
                <span>/</span>
                <span className="font-bold text-brand-black dark:text-white font-outfit text-lg">
                  {vue === "atraiter" ? "À traiter" : "Inventaire complet"}
                </span>
              </>
            ) : (
              <span className="font-bold text-brand-black dark:text-white font-outfit text-xl">
                Cockpit
              </span>
            )}
            {donnees && (
              <span className="bg-brand-light-grey/30 dark:bg-white/10 text-brand-black dark:text-white px-2 py-0.5 rounded-full text-xs font-bold ml-2">
                {donnees.total}
              </span>
            )}
          </div>
            
            <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
              {estGerant && (
                <a
                  href={`/api/produits/export?${searchParams?.toString() || ""}`}
                  className="btn btn-secondaire w-full sm:w-auto justify-center bg-white dark:bg-brand-paper shadow-sm"
                >
                  <IconeTelechargement taille={15} />
                  Export CSV
                </a>
              )}
              {peutModifier && (
                <button type="button" onClick={() => ouvrirAjout()} className="btn btn-primaire w-full sm:w-auto justify-center shadow-md shadow-brand-orange/20">
                  <IconePlus taille={15} />
                  Ajouter
                </button>
              )}
            </div>
          </div>

          {/* Barre d'outils unifiée (Toolbar) */}
          <div className="carte !p-2 sm:!p-3 flex flex-col lg:flex-row gap-3 items-center shadow-sm z-20 relative">
            <div className="flex-1 w-full relative flex flex-col sm:flex-row gap-2">
              <RechercheRapide
                valeur={q}
                onInstantChange={(valeur) => setQLoc(valeur)}
                onChange={(valeur) => {
                  setQ(valeur);
                  majUrl({ q: valeur.trim() || null, page: "1" });
                }}
                placeholder={t("inventaire.recherche")}
                debounceMs={300}
                className="w-full pl-10 pr-4 py-2.5 bg-brand-paper dark:bg-black/20 border border-brand-light-grey dark:border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange/50 focus:border-brand-orange transition-all font-medium text-sm"
              />
              {vue !== "cockpit" && vue !== "categorie" && (
                <div className="flex items-center self-stretch bg-brand-light-grey/20 dark:bg-white/5 rounded-lg p-1 border border-brand-light-grey/50 dark:border-white/10 shrink-0 gap-1">
                  {/* Retrait de vueGroupee, seule la bascule Cartes/Tableau subsiste */}
                  <div className="flex items-center h-full">
                      <button 
                        type="button"
                        onClick={() => setModeAffichage("cartes")} 
                        className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all h-full ${modeAffichage === "cartes" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                        title="Vue Cartes"
                      >
                        ▦
                      </button>
                      <button 
                        type="button"
                        onClick={() => setModeAffichage("tableau")} 
                        className={`px-2 py-1.5 rounded-md text-xs font-bold transition-all h-full ${modeAffichage === "tableau" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                        title="Vue Tableau"
                      >
                        ☷
                      </button>
                    </div>
                </div>
              )}
            </div>
            
            {vue !== "cockpit" && (
              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-lg bg-brand-light-grey/20 dark:bg-white/5 px-3 py-2 h-[42px] min-w-[140px]">
                  <select
                    value={searchParams?.get("categorie") ?? ""}
                    onChange={(e) => majUrl({ categorie: e.target.value || null, page: "1" })}
                    className="bg-transparent text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
                  >
                    <option value="">Toutes les catégories</option>
                    {(donnees?.categories ?? []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
                </div>

                <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-lg bg-white dark:bg-brand-paper px-3 py-2 h-[42px]">
                  <select
                    value={searchParams?.get("sans_lot") === "1" ? "__sans__" : (searchParams?.get("lot") ?? "")}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "__sans__") majUrl({ sans_lot: "1", lot: null, page: "1" });
                      else majUrl({ lot: v || null, sans_lot: null, page: "1" });
                    }}
                    className="bg-transparent text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
                  >
                    <option value="">Tous les arrivages</option>
                    <option value="__sans__">Sans arrivage</option>
                    {(donnees?.lots ?? []).map((l) => (
                      <option key={l.id} value={l.id}>{l.libelle}</option>
                    ))}
                  </select>
                  <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
                </div>
                
                <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-lg bg-white dark:bg-brand-paper px-3 py-2 h-[42px]">
                  <select
                    value={
                      (searchParams?.get("tri") === "prix_achat" ? (searchParams?.get("ordre") === "desc" ? "prix_desc" : "prix_asc") : "")
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "prix_asc") majUrl({ tri: "prix_achat", ordre: "asc", page: "1" });
                      else if (v === "prix_desc") majUrl({ tri: "prix_achat", ordre: "desc", page: "1" });
                      else majUrl({ tri: null, ordre: null, page: "1" });
                    }}
                    className="bg-transparent text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
                  >
                    <option value="">Trier par défaut</option>
                    <option value="prix_asc">Prix croissant</option>
                    <option value="prix_desc">Prix décroissant</option>
                  </select>
                  <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
                </div>

                <button
                  type="button"
                  onClick={() => setAfficherPlusFiltres(!afficherPlusFiltres)}
                  className={`flex-none flex items-center gap-2 border rounded-lg px-3 py-2 h-[42px] transition-colors text-sm font-bold ${
                    afficherPlusFiltres || nbFiltresActifs > 0 
                    ? 'border-brand-orange bg-brand-orange/10 text-brand-orange shadow-inner' 
                    : 'border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper text-brand-warm-grey hover:bg-brand-light-grey/30'
                  }`}
                >
                  <IconeTriBas taille={16} className={afficherPlusFiltres ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  <span className="hidden sm:inline">Filtres</span>
                  {nbFiltresActifs > 0 && (
                    <span className="bg-brand-orange text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full ml-1">
                      {nbFiltresActifs}
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Tiroir de filtres avancés */}
          {vue !== "cockpit" && afficherPlusFiltres && (
            <div className="carte !p-4 bg-white/50 dark:bg-black/10 animate-entree">
              <div className="flex flex-col sm:flex-row justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2 flex-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey w-full sm:w-auto sm:mr-2">Statut</span>
                  {statutsVisibles.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => basculerStatut(s)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all hover-lift ${
                        statutsActifs.includes(s)
                          ? "border-brand-black bg-brand-black text-brand-white shadow-md"
                          : "border-brand-light-grey dark:border-white/10 text-brand-warm-grey dark:text-brand-grey hover:bg-brand-light-grey/30 dark:hover:bg-white/5"
                      }`}
                    >
                      {INFOS_STATUT[s].libelle}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-4 border-t sm:border-t-0 sm:border-l border-brand-light-grey/50 dark:border-white/10 pt-4 sm:pt-0 sm:pl-4">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey">Période</label>
                    <input
                      type="date"
                      value={searchParams?.get("du") ?? ""}
                      onChange={(e) => majUrl({ du: e.target.value || null, page: "1" })}
                      className="champ text-xs py-1 px-2 h-[32px] w-[110px]"
                    />
                    <span className="text-brand-warm-grey">-</span>
                    <input
                      type="date"
                      value={searchParams?.get("au") ?? ""}
                      onChange={(e) => majUrl({ au: e.target.value || null, page: "1" })}
                      className="champ text-xs py-1 px-2 h-[32px] w-[110px]"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-brand-light-grey/50 dark:border-white/10">
                <span className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey w-full sm:w-auto sm:mr-2">Rapides</span>
                
                <label className="flex items-center gap-2 text-sm font-medium text-brand-black dark:text-brand-warm-grey cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("plus30j") === "1"}
                    onChange={(e) => majUrl({ plus30j: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  +30 jours
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-red-600 dark:text-red-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("a_tarifer") === "1"}
                    onChange={(e) => majUrl({ a_tarifer: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-red-300 text-red-500 focus:ring-red-500"
                  />
                  À tarifer
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-black dark:text-brand-warm-grey cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("sans_photo") === "1"}
                    onChange={(e) => majUrl({ sans_photo: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  Sans photo
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-black dark:text-brand-warm-grey cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("sans_etiquette") === "1"}
                    onChange={(e) => majUrl({ sans_etiquette: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  Sans étiquette
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-black dark:text-brand-warm-grey cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("a_jeter") === "1"}
                    onChange={(e) => majUrl({ a_jeter: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  À jeter
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-brand-black dark:text-brand-warm-grey cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("en_vitrine") === "1"}
                    onChange={(e) => majUrl({ en_vitrine: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  En vitrine
                </label>

                {nbFiltresActifs > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setQ("");
                      setQLoc("");
                      router.replace("/inventaire");
                    }}
                    className="ml-auto text-sm font-bold text-danger hover:bg-danger/10 px-3 py-1.5 rounded-md transition flex items-center gap-1.5 border border-transparent hover:border-danger/20"
                  >
                    Effacer tous les filtres
                  </button>
                )}
              </div>
            </div>
          )}
      </div>

      {vue === "cockpit" && (
        <div className="mb-8">
          <Cockpit 
            majUrl={majUrl} 
            afficherFamilles={afficherFamilles} 
            setAfficherFamilles={setAfficherFamilles} 
          />
        </div>
      )}
      
      {vue === "categorie" && searchParams?.get("categorie") && (
        <VueCategorie categorie={searchParams.get("categorie")!} majUrl={majUrl} />
      )}
      
      {vue === "famille" && searchParams?.get("cle") && (
        <VueFamille 
          cleFamille={searchParams.get("cle")!} 
          majUrl={majUrl} 
          ouvrirEdition={ouvrirEdition}
          ouvrirSuppressionUnites={ouvrirSuppressionUnites}
          basculerVitrineIds={basculerVitrineIds}
          ouvrirAjout={ouvrirAjout}
        />
      )}

      {((vue === "cockpit" && !afficherFamilles) || vue === "atraiter" || vue === "famille") && (
        <div className="space-y-4 animate-entree">
        {donneesFiltrees && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mt-4 sm:mt-0 px-2 sm:px-0">
              <p className="text-sm text-brand-warm-grey">
                <strong className="text-brand-black dark:text-white">{donneesFiltrees.total}</strong> produit{donneesFiltrees.total > 1 ? "s" : ""}
                {!estSocial && (
                  <>
                    {" "}· valeur de la sélection (achat + réparations) :{" "}
                    <strong>{formaterDA(donneesFiltrees.valeur)}</strong>
                  </>
                )}
              </p>
            </div>
          )}

          {erreur && (
            <div className="alerte-erreur" role="alert">
              {erreur}
            </div>
          )}
          {!erreur && donneesFiltrees === null && (
            <p className="p-4 text-sm text-brand-warm-grey">{t("inventaire.chargement")}</p>
          )}
          {donneesFiltrees && donneesFiltrees.produits.length === 0 && (
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
                    onClick={() => { setQ(""); setQLoc(""); router.replace("/inventaire"); }} 
                    className="btn btn-secondaire"
                  >
                    Effacer les filtres
                  </button>
                )}
                {peutModifier && (
                  <button type="button" onClick={() => ouvrirAjout()} className="btn btn-primaire">
                    <IconePlus taille={15} />
                    Ajouter un produit
                  </button>
                )}
              </div>
            </div>
          )}

          {donneesFiltrees && donneesFiltrees.produits.length > 0 && vueGroupee && (
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
                              ? t("inventaire.retirerDeVitrine")
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
                        <IconeCrayon taille={14} /> <span className="hidden sm:inline">{t("inventaire.editer")}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => ouvrirSuppressionModele(g)}
                        className="flex items-center gap-1.5 rounded-md bg-danger/10 px-3 py-1.5 text-xs font-semibold text-danger transition hover:bg-danger/20"
                      >
                        <IconeCorbeille taille={14} /> <span className="hidden sm:inline">{t("inventaire.supprimer")}</span>
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
                                title={p.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
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
                              onClick={() => ouvrirEdition([p], p.code_interne, g.unites)}
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

      {donneesFiltrees && donneesFiltrees.produits.length > 0 && !vueGroupee && (
        <div className="space-y-4">
          <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${modeAffichage === "cartes" ? "" : "hidden"}`}>
            {donneesFiltrees.produits.map((p) => (
              <CarteProduit
                key={p.id}
                produit={p}
                estSocial={estSocial}
                peutModifier={peutModifier}
                envoi={envoi}
                basculerVitrineIds={basculerVitrineIds}
                ouvrirEdition={ouvrirEdition}
                ouvrirSuppressionUnites={ouvrirSuppressionUnites}
                ouvrirAjout={ouvrirAjout}
                t={t}
              />
            ))}
          </div>

          <div className={`overflow-x-auto rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper shadow-sm relative scrollbar-fine ${modeAffichage === "tableau" ? "block max-h-[800px]" : "hidden"}`}>
            <table className="w-full min-w-[820px] text-[13px] relative">
              <thead className="bg-brand-light-grey/60 dark:bg-black/60 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  {COLONNES_TRI.filter(c => c.cle !== 'prix_achat' || !estSocial).map((c) => (
                    <th
                      key={c.cle}
                      onClick={() => trierPar(c.cle)}
                      className="cursor-pointer select-none transition-colors hover:text-brand-orange whitespace-nowrap py-3 px-4 text-left font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {t(c.libelle)}
                        {triActuel === c.cle &&
                          (ordreActuel === "asc" ? (
                            <IconeTriHaut taille={12} className="text-brand-orange" />
                          ) : (
                            <IconeTriBas taille={12} className="text-brand-orange" />
                          ))}
                      </span>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-right font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">{t("inventaire.jours")}</th>
                  <th className="py-3 px-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-grey/40 dark:divide-white/5">
                {donneesFiltrees.produits.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/produits/${p.id}`)}
                    className="group cursor-pointer transition-colors hover:bg-brand-light-grey/30 dark:hover:bg-white/5"
                  >
                    <td className="px-4 py-2.5 font-mono text-xs text-brand-warm-grey dark:text-brand-grey font-semibold">
                      {p.code_interne}
                    </td>
                    <td className="max-w-64 truncate px-4 py-2.5 font-semibold text-brand-black dark:text-white" title={p.reference}>
                      {p.reference}
                    </td>
                    <td className="px-4 py-2.5 text-brand-warm-grey dark:text-brand-warm-grey">{p.categorie}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-2">
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
                    <td className="px-4 py-2.5 text-xs text-brand-black dark:text-brand-warm-grey">
                      <div className="font-medium">{new Date(p.date_entree).toLocaleDateString("fr-FR")}</div>
                      <div className="text-[11px] text-brand-warm-grey dark:text-brand-grey mt-0.5">
                        {p.lot_id
                          ? t("inventaire.lotLong", { n: p.lot_id, f: p.fournisseur || "" })
                          : t("inventaire.sansArrivage")}
                      </div>
                    </td>
                    {!estSocial && (
                      <td className="px-4 py-2.5 text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-warm-grey dark:text-brand-grey mb-0.5">{t("inventaire.achat")}</span>
                        <span className="font-bold text-brand-black dark:text-white">{formaterDA(p.prix_achat)}</span>
                        {p.cout_reparations > 0 && (
                          <span className="block text-[10px] text-brand-warm-grey dark:text-brand-grey mt-0.5">
                            +{formaterDA(p.cout_reparations)} {t("inventaire.reparationsAbr")}
                          </span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5 text-right">
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-orange/80 mb-0.5">{t("inventaire.vente")}</span>
                      {prixVenteAffiche(p) !== null ? (
                        <span className="font-extrabold text-brand-orange text-sm">
                          {formaterDA(prixVenteAffiche(p)!)}
                          {p.statut === "vendu" && (
                            <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-warm-grey dark:text-brand-grey mt-0.5">
                              {t("inventaire.statutVendu")}
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-brand-warm-grey dark:text-brand-grey font-medium">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right text-brand-warm-grey dark:text-brand-warm-grey font-medium">{p.jours_stock}</td>
                    <td className="px-3 py-2.5">
                      {peutModifier && (
                        <div className="flex items-center justify-end gap-1 md:opacity-0 md:group-hover:opacity-100 opacity-100 transition-opacity">
                          {p.statut !== "vendu" && (
                            <button
                              type="button"
                              disabled={envoi}
                              onClick={(e) => {
                                e.stopPropagation();
                                void basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne);
                              }}
                              title={p.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
                              aria-label={t("inventaire.basculerVitrine", { code: p.code_interne, action: p.en_vitrine ? t("inventaire.retirer") : t("inventaire.mettre") })}
                              className={`rounded-lg p-2 transition-colors disabled:opacity-40 ${
                                p.en_vitrine
                                  ? "text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20"
                                  : "text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange"
                              }`}
                            >
                              <IconeVitrine taille={15} />
                            </button>
                          )}
                          <BoutonImpression 
                            ids={[p.id]} 
                            dejaImprimee={p.etiquette_imprimee} 
                            className="rounded-lg p-2 text-brand-warm-grey transition-colors hover:bg-brand-light-grey/50 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white" 
                          />
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              ouvrirEdition([p], p.code_interne);
                            }}
                            title={t("inventaire.editer")}
                            aria-label={t("inventaire.editerProduit", { code: p.code_interne })}
                            className="rounded-lg p-2 text-brand-warm-grey transition-colors hover:bg-brand-light-grey/50 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white"
                          >
                            <IconeCrayon taille={15} />
                          </button>
                          <button
                            type="button"
                            onClick={(e: React.MouseEvent) => {
                              e.stopPropagation();
                              ouvrirSuppressionUnites([p]);
                            }}
                            title={t("inventaire.supprimer")}
                            aria-label={t("inventaire.supprimerProduit", { code: p.code_interne })}
                            className="rounded-lg p-2 text-brand-warm-grey transition-colors hover:bg-danger/10 hover:text-danger"
                          >
                            <IconeCorbeille taille={15} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination (seulement si non filtré localement pour éviter désynchronisation) */}
      {donneesFiltrees && donneesFiltrees.pages > 1 && !qLoc.trim() && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => majUrl({ page: (donneesFiltrees?.page ?? 1) - 1 + "" })}
            className="btn btn-secondaire"
          >
            <IconeChevronGauche taille={15} />
            {t("inventaire.precedent")}
          </button>
          <div className="flex items-center gap-1 px-2">
            {(() => {
              const totalPages = donneesFiltrees?.pages ?? 1;
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
            disabled={page >= (donneesFiltrees?.pages ?? 1)}
            onClick={() => majUrl({ page: (donneesFiltrees?.page ?? 1) + 1 + "" })}
            className="btn btn-secondaire"
          >
            {t("inventaire.suivant")}
            <IconeChevronDroite taille={15} />
          </button>
        </div>
      )}
      </div>
      )}

      <Modale
        titre={produitSourceDuplication ? "Ajouter un exemplaire" : t("inventaire.ajouterProduitTitre")}
        ouverte={modalAjout}
        modificationsNonEnregistrees={formulaireModifie || formPhotosModifiees}
        onFermer={() => {
          setModalAjout(false);
          setProduitSourceDuplication(null);
        }}
      >
        {brouillonDisponible && (
          <div className="mb-4 rounded-lg bg-brand-orange/10 p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border border-brand-orange/20 animate-entree">
            <div className="text-sm">
              <p className="font-semibold text-brand-orange">Un brouillon non enregistré est disponible.</p>
              <p className="text-xs text-brand-orange/80">Sauvegardé {new Date(brouillonDisponible.timestamp).toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={supprimerBrouillon} className="btn btn-secondaire flex-1 sm:flex-none">Supprimer</button>
              <button type="button" onClick={restaurerBrouillon} className="btn bg-brand-orange text-white hover:bg-brand-orange/90 flex-1 sm:flex-none">Reprendre</button>
            </div>
          </div>
        )}
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
          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setModalAjout(false);
                setProduitSourceDuplication(null);
              }}
              className="btn btn-secondaire w-full sm:w-auto justify-center"
            >
              Annuler
            </button>
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
        modificationsNonEnregistrees={formulaireModifie || formPhotosModifiees}
        onFermer={() => setModalEdition(null)}
      >
        {brouillonDisponible && (
          <div className="mb-4 rounded-lg bg-brand-orange/10 p-3 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border border-brand-orange/20 animate-entree">
            <div className="text-sm">
              <p className="font-semibold text-brand-orange">Un brouillon non enregistré est disponible.</p>
              <p className="text-xs text-brand-orange/80">Sauvegardé {new Date(brouillonDisponible.timestamp).toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={supprimerBrouillon} className="btn btn-secondaire flex-1 sm:flex-none">Supprimer</button>
              <button type="button" onClick={restaurerBrouillon} className="btn bg-brand-orange text-white hover:bg-brand-orange/90 flex-1 sm:flex-none">Reprendre</button>
            </div>
          </div>
        )}
        <form
          className="space-y-3"
          onKeyDown={async (e) => {
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              if (!envoi && formulaireValide) {
                if (contexteNavigation && modalEdition?.unites.length === 1 && contexteNavigation.indexCourant < contexteNavigation.produits.length - 1) {
                  if (await modifierProduit(false)) {
                    const nextIndex = contexteNavigation.indexCourant + 1;
                    const nextProduct = contexteNavigation.produits[nextIndex];
                    if (nextProduct) ouvrirEdition([nextProduct], nextProduct.code_interne, contexteNavigation.produits);
                  }
                } else {
                  void modifierProduit();
                }
              }
            }
          }}
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
                {(() => {
                  const tousMemeStatut = modalEdition.unites.every(u => u.statut === modalEdition.unites[0]!.statut);
                  if (tousMemeStatut) {
                    return <BadgeStatut statut={modalEdition.unites[0]!.statut} aJeter={modalEdition.unites[0]!.a_jeter} />;
                  } else {
                    return <span className="text-sm font-semibold text-brand-warm-grey">Statuts multiples</span>;
                  }
                })()}
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
                  {STATUTS_PRODUIT.filter((s) => {
                    const tousMemeStatut = modalEdition.unites.every(u => u.statut === modalEdition.unites[0]!.statut);
                    return tousMemeStatut ? s !== modalEdition.unites[0]!.statut : true;
                  }).map((s) => (
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
                {modalEdition.unites[0]!.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
              </button>
            </div>
          )}

          <div className="pt-2 flex flex-col-reverse sm:flex-row justify-between items-center gap-4 border-t border-brand-light-grey/50 pt-4 mt-4">
            {contexteNavigation && modalEdition?.unites.length === 1 ? (
              <div className="flex gap-2 w-full sm:w-auto justify-between sm:justify-start">
                <button
                  type="button"
                  disabled={envoi || contexteNavigation.indexCourant <= 0}
                  onClick={() => {
                    const prevIndex = contexteNavigation.indexCourant - 1;
                    const prevProduct = contexteNavigation.produits[prevIndex];
                    if (prevProduct) ouvrirEdition([prevProduct], prevProduct.code_interne, contexteNavigation.produits);
                  }}
                  className="btn btn-secondaire flex-1 sm:flex-none justify-center"
                >
                  <IconeChevronGauche taille={15} /> Précédent
                </button>
                <button
                  type="button"
                  disabled={envoi || contexteNavigation.indexCourant >= contexteNavigation.produits.length - 1}
                  onClick={() => {
                    const nextIndex = contexteNavigation.indexCourant + 1;
                    const nextProduct = contexteNavigation.produits[nextIndex];
                    if (nextProduct) ouvrirEdition([nextProduct], nextProduct.code_interne, contexteNavigation.produits);
                  }}
                  className="btn btn-secondaire flex-1 sm:flex-none justify-center"
                >
                  Suivant <IconeChevronDroite taille={15} />
                </button>
              </div>
            ) : (
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setModalEdition(null)}
                  className="btn btn-secondaire w-full sm:w-auto justify-center"
                >
                  Annuler
                </button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {contexteNavigation && modalEdition?.unites.length === 1 && (
                <button
                  type="button"
                  onClick={() => setModalEdition(null)}
                  className="btn btn-secondaire w-full sm:w-auto justify-center sm:hidden"
                >
                  Annuler
                </button>
              )}
              {contexteNavigation && modalEdition?.unites.length === 1 && (
                <button
                  type="button"
                  onClick={() => setModalEdition(null)}
                  className="btn btn-secondaire w-full sm:w-auto justify-center hidden sm:flex"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={envoi || !formulaireValide}
                className="btn btn-primaire w-full sm:w-auto justify-center"
                title="Maj + Entrée pour Enregistrer & Suivant"
              >
                {t("inventaire.enregistrerModifications")}
              </button>
              {contexteNavigation && modalEdition?.unites.length === 1 && contexteNavigation.indexCourant < contexteNavigation.produits.length - 1 && (
                <button
                  type="button"
                  disabled={envoi || !formulaireValide}
                  onClick={async () => {
                    if (await modifierProduit(false)) {
                      const nextIndex = contexteNavigation.indexCourant + 1;
                      const nextProduct = contexteNavigation.produits[nextIndex];
                      if (nextProduct) ouvrirEdition([nextProduct], nextProduct.code_interne, contexteNavigation.produits);
                    }
                  }}
                  title="Raccourci: Maj + Entrée"
                  className="btn bg-brand-black hover:bg-brand-black/90 text-white w-full sm:w-auto justify-center shadow-md"
                >
                  Enregistrer & Suivant
                </button>
              )}
            </div>
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
    </>
  );
}
