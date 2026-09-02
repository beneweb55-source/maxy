"use client";

import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  IconeBillet,
  IconeCodeBarres,
  IconeCoche,
  IconeReglages,
  IconeRecu,
  IconeFermer,
  IconeArchive,
  IconeEtiquette,
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
import ModalClassification from "./ModalClassification";
import ModalSuppression from "./ModalSuppression";
import ModaleAjoutTerrain from "./ModaleAjoutTerrain";
import AssistantImportation from "./AssistantImportation";
import ModaleExport from "./ModaleExport";
import ModaleVenteInventaire from "./ModaleVenteInventaire";
import ModaleSelectionQuantite from "./ModaleSelectionQuantite";
import UniversalStockManager, { type TargetStockSource } from "@/components/produits/UniversalStockManager";
import GestionnaireQuantite from "@/components/produits/GestionnaireQuantite";
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import RechercheMultiModal from "./RechercheMultiModal";
import FilterDrawer from "./FilterDrawer";
import ActiveFilterBadges from "./ActiveFilterBadges";
import { 
  Filter as IconFilter, 
  UploadCloud,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  PackagePlus,
  Hash,
  X,
  Sparkles,
  Barcode,
  Tag,
  Boxes,
  Plus
} from "lucide-react";

export interface LigneProduit {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  categorie_id?: number | null;
  categorie_rel?: {
    nom: string;
    parent: { nom: string; parent: { nom: string } | null } | null;
  } | null;
  modele_id?: number | null;
  modele?: { id: number; nom: string; image_url?: string | null } | null;
  statut: StatutProduit;
  a_jeter: boolean;
  en_vitrine: boolean;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  numero_serie?: string | null;
  grade?: string | null;
  emplacement?: string | null;
  lot_id: number | null;
  fournisseur: string | null;
  date_entree: string;
  jours_stock: number;
  image_url: string | null;
  nb_images: number;
  etiquette_imprimee: boolean;
}

function formatCategoriePath(p: LigneProduit): string {
  if (p.categorie_rel) {
    const parts = [];
    if (p.categorie_rel.parent?.parent?.nom) parts.push(p.categorie_rel.parent.parent.nom);
    if (p.categorie_rel.parent?.nom) parts.push(p.categorie_rel.parent.nom);
    parts.push(p.categorie_rel.nom);
    return parts.join(" > ");
  }
  return p.categorie || "Non classé";
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

export interface GroupeProduits {
  cle: string;
  reference: string;
  categorie: string;
  modele_id: number | null;
  categorie_id: number | null;
  image_url: string | null;
  nbImages: number;
  enVitrine: number;
  unites: LigneProduit[];
  prixMin: number;
  prixMax: number;
  venteMin: number | null;
  venteMax: number | null;
  resumeStatuts: { statut: StatutProduit; n: number }[];
  totalDisponibles: number;
}

function grouperDoublons(produits: LigneProduit[]): GroupeProduits[] {
  // Exclure formellement les produits vendus, hors-service et composants assemblés de l'inventaire actif
  const produitsActifs = produits.filter(
    (p) => p.statut !== "vendu" && p.statut !== "hs" && p.statut !== "assemble"
  );
  const groupes = new Map<string, LigneProduit[]>();
  for (const p of produitsActifs) {
    const catFormatee = formatCategoriePath(p);
    const cle = p.modele_id
      ? `mod-${p.modele_id}`
      : `${p.reference.trim().toLowerCase()}|${catFormatee.trim().toLowerCase()}`;
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
      categorie: formatCategoriePath(premier),
      modele_id: premier.modele_id || null,
      categorie_id: premier.categorie_id || null,
      image_url: unites.find((u) => u.image_url)?.image_url ?? premier.modele?.image_url ?? null,
      nbImages: Math.max(...unites.map((u) => u.nb_images || 0), 0),
      enVitrine: unites.filter((u) => u.en_vitrine).length,
      unites,
      prixMin: Math.min(...prix),
      prixMax: Math.max(...prix),
      venteMin: vente.length > 0 ? Math.min(...vente) : null,
      venteMax: vente.length > 0 ? Math.max(...vente) : null,
      resumeStatuts: Array.from(parStatut.entries()).map(([statut, n]) => ({ statut, n })),
      totalDisponibles: unites.length,
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
  const [categoriesTree, setCategoriesTree] = useState<any[]>([]);

  useEffect(() => {
    async function loadCats() {
      try {
        const res = await fetch("/api/categories");
        if (res.ok) {
          const data = await res.json();
          setCategoriesTree(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Error loading categories in Inventaire:", err);
      }
    }
    void loadCats();
  }, []);

  const familleIdActif = searchParams?.get("famille_id");
  const categorieIdActif = searchParams?.get("categorie_id");
  const sousCategorieIdActif = searchParams?.get("sous_categorie_id");

  const familleActive = categoriesTree.find((f: any) => String(f.id) === familleIdActif);
  let categorieActive: any = null;
  if (familleActive && categorieIdActif) {
    categorieActive = (familleActive.enfants || []).find((c: any) => String(c.id) === categorieIdActif);
  } else if (categorieIdActif) {
    for (const f of categoriesTree) {
      const found = (f.enfants || []).find((c: any) => String(c.id) === categorieIdActif);
      if (found) {
        categorieActive = found;
        break;
      }
    }
  }

  let sousCategorieActive: any = null;
  if (sousCategorieIdActif) {
    for (const f of categoriesTree) {
      for (const c of f.enfants || []) {
        const foundSc = (c.enfants || []).find((sc: any) => String(sc.id) === sousCategorieIdActif);
        if (foundSc) {
          sousCategorieActive = foundSc;
          if (!categorieActive) categorieActive = c;
          break;
        }
      }
    }
  }

  const nomFamilleActif = familleActive?.nom || "";
  const nomCategorieActif = sousCategorieActive?.nom || categorieActive?.nom || "";

  const [modalAjoutTerrain, setModalAjoutTerrain] = useState(false);
  const [modalImportation, setModalImportation] = useState(searchParams?.get("import") === "1");
  const [modalExport, setModalExport] = useState(false);
  const [tiroirFiltresOuvert, setTiroirFiltresOuvert] = useState(false);
  const [produitSourceDuplication, setProduitSourceDuplication] = useState<LigneProduit | null>(null);

  useEffect(() => {
    if (searchParams?.get("import") === "1") {
      setModalImportation(true);
    }
  }, [searchParams]);

  const [modalEdition, setModalEdition] = useState<{
    unites: LigneProduit[];
    titre: string;
  } | null>(null);

  const [modalClassification, setModalClassification] = useState<LigneProduit[] | null>(null);
  const [selection, setSelection] = useState<number[]>([]);
  const [modalVenteUnites, setModalVenteUnites] = useState<LigneProduit[] | null>(null);
  const [modalSelectionQuantite, setModalSelectionQuantite] = useState<{
    action: "facturer" | "statut" | "supprimer";
    groupe: GroupeProduits;
  } | null>(null);
  const [cibleStockManager, setCibleStockManager] = useState<TargetStockSource | null>(null);
  function ouvrirVenteInventaire(unites: LigneProduit[]) {
    setModalVenteUnites(unites);
  }

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

  const vueGroupee = true; // Mode groupé activé par défaut (vue propre)
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

  // Sélection multi-produits (Bulk Actions unifiées)
  const [idsSelectionnes, setIdsSelectionnes] = useState<Set<number>>(new Set());

  // Modale changement de statut en masse
  const [modalStatutMasse, setModalStatutMasse] = useState<boolean>(false);
  const [statutMasseCible, setStatutMasseCible] = useState<StatutProduit | "">("");
  const [statutMasseNote, setStatutMasseNote] = useState<string>("");

  function basculerSelection(id: number) {
    setIdsSelectionnes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toutSelectionner() {
    if (!donneesFiltrees) return;
    const tousIds = donneesFiltrees.produits.map((p) => p.id);
    const tousCoches = tousIds.length > 0 && tousIds.every((id) => idsSelectionnes.has(id));
    if (tousCoches) {
      setIdsSelectionnes(new Set());
    } else {
      setIdsSelectionnes(new Set(tousIds));
    }
  }

  function deselectionnerTout() {
    setIdsSelectionnes(new Set());
  }

  function ouvrirAjoutRapide(source?: LigneProduit | any) {
    if (!source) {
      ouvrirAjout();
      return;
    }
    setCibleStockManager({
      modeleId: source.modele_id ?? source.modeleId ?? null,
      produitId: source.id ?? null,
      reference: source.reference ?? source.modeleNom ?? "Article",
      categorie: source.categorie ?? "Matériel",
      categorie_id: source.categorie_id ?? source.categorieId ?? null,
      prix_achat: source.prix_achat ?? source.prixAchatDefaut ?? source.prixMin ?? 0,
      prix_vente_fixe: source.prix_vente_fixe ?? source.prixVenteDefaut ?? source.venteMin ?? null,
      image_url: source.image_url ?? null,
      grade: source.grade ?? "Grade A",
      emplacement: source.emplacement ?? "reserve",
      lot_id: source.lot_id ?? null,
    });
  }

  async function appliquerStatutMasse() {
    if (!statutMasseCible || idsSelectionnes.size === 0 || envoi) return;
    setEnvoi(true);
    try {
      const ids = Array.from(idsSelectionnes);
      const res = await fetch("/api/produits/masse/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          statut: statutMasseCible,
          note: statutMasseNote.trim() || undefined,
        }),
      });
      const corps = await res.json().catch(() => null);
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du changement de statut en masse.", "erreur");
        return;
      }
      afficher(`${ids.length} produit(s) → ${INFOS_STATUT[statutMasseCible as StatutProduit]?.libelle}`);
      setModalStatutMasse(false);
      setStatutMasseCible("");
      setStatutMasseNote("");
      setIdsSelectionnes(new Set());
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

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
          params.delete("famille_id");
          params.delete("categorie_id");
          params.delete("sous_categorie_id");
          params.delete("modele_id");
        }
      }

      router.replace(`/inventaire?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  const nbFiltresActifs =
    (q ? 1 : 0) +
    (searchParams?.get("grade") ? 1 : 0) +
    (searchParams?.get("emplacement") ? 1 : 0) +
    (searchParams?.get("cpu") ? 1 : 0) +
    (searchParams?.get("ram") ? 1 : 0) +
    (searchParams?.get("stockage") ? 1 : 0) +
    (searchParams?.get("format") ? 1 : 0) +
    (searchParams?.get("type_disque") ? 1 : 0) +
    (searchParams?.get("capacite_disque") ? 1 : 0) +
    (searchParams?.get("taille_ecran") ? 1 : 0) +
    (searchParams?.get("lot") || searchParams?.get("sans_lot") ? 1 : 0) +
    (searchParams?.get("du") ? 1 : 0) +
    (searchParams?.get("au") ? 1 : 0) +
    (searchParams?.get("plus30j") ? 1 : 0) +
    (searchParams?.get("a_tarifer") ? 1 : 0) +
    (searchParams?.get("sans_photo") ? 1 : 0) +
    (searchParams?.get("sans_etiquette") ? 1 : 0) +
    (searchParams?.get("a_jeter") ? 1 : 0) +
    statutsActifs.length +
    (searchParams?.get("tri") ? 1 : 0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const [chargement, setChargement] = useState(false);

  const charger = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const vueActuelle = searchParams?.get("vue") || "cockpit";
    const qActuel = searchParams?.get("q")?.trim() || "";

    // Ne pas charger la liste complète si l'utilisateur est sur la vue famille ou catégorie (qui ont leurs propres chargements dédiés)
    if ((vueActuelle === "famille" && !qActuel) || (vueActuelle === "categorie" && !qActuel)) {
      setChargement(false);
      setErreur(null);
      return;
    }

    setChargement(true);
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
      console.error("Inventaire charger error:", e);
      setErreur(e instanceof Error ? e.message : "Erreur inattendue.");
    } finally {
      setChargement(false);
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
      ouvrirAjoutRapide(source);
    } else {
      setModalAjoutTerrain(true);
    }
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

  async function ajouterProduit(garderOuvert = false) {
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
      if (garderOuvert) {
        setFormulaireForcee({
          ...formulaire,
          reference: "",
          quantite: "1",
        });
        setFormPhotos([]);
        setFormPhotosModifiees(false);
      } else {
        setModalAjout(false);
        setProduitSourceDuplication(null);
      }
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

  async function changerStatutUnites(unites: LigneProduit[], cible: StatutProduit, note?: string) {
    if (envoi || unites.length === 0) return;
    setEnvoi(true);
    try {
      const ids = unites.map((u) => u.id);
      const res = await fetch(`/api/produits/masse/statut`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          statut: cible,
          note: note || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        afficher(err?.error ?? "Erreur lors du changement de statut.", "erreur");
        return;
      }
      afficher(`${ids.length} exemplaire(s) mis à jour → ${INFOS_STATUT[cible].libelle}`, "succes");
      await charger();
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function creerExemplaireRapide(cible: GroupeProduits | LigneProduit) {
    if (envoi) return;
    setEnvoi(true);
    try {
      const isGroupe = "unites" in cible;
      const ref = cible.reference;
      const cat = cible.categorie;
      const modeleId = cible.modele_id;
      const categorieId = cible.categorie_id;
      const prixAchat = isGroupe ? (cible.prixMin || 0) : (cible.prix_achat || 0);
      const prixVente = isGroupe ? cible.venteMin : cible.prix_vente_fixe;
      const imageUrl = cible.image_url;

      if (modeleId) {
        const res = await fetch(`/api/modeles/${modeleId}/exemplaires`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantite: 1,
            prix_achat: prixAchat,
            prix_vente_fixe: prixVente,
            emplacement: "reserve",
            grade: "Grade A",
            statut: "recu",
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          afficher(data?.error ?? "Erreur lors de la création de l'exemplaire.", "erreur");
          return;
        }
        const codeGenere = Array.isArray(data?.codes) && data.codes[0] ? ` (${data.codes[0]})` : "";
        afficher(`1 exemplaire créé avec succès pour ${ref}${codeGenere} !`, "succes");
      } else {
        const res = await fetch(`/api/produits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reference: ref,
            categorie: cat,
            categorie_id: categorieId || undefined,
            prix_achat: prixAchat,
            prix_vente_fixe: prixVente,
            quantite: 1,
            image_url: imageUrl || undefined,
            statut: "recu",
          }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          afficher(data?.error ?? "Erreur lors de la création du produit.", "erreur");
          return;
        }
        const codeGenere = Array.isArray(data?.codes) && data.codes[0] ? ` (${data.codes[0]})` : "";
        afficher(`1 exemplaire créé avec succès pour ${ref}${codeGenere} !`, "succes");
      }
      await charger();
    } catch (err) {
      console.error("Erreur creation rapide exemplaire:", err);
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      
      {/* COLONNE GAUCHE : IDENTIFICATION */}
      <div className="space-y-4">
        <div>
          <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-brand-black dark:text-white mb-1.5" htmlFor="ref-produit">
            Désignation / Référence Commerciale *
          </label>
          <input
            id="ref-produit"
            type="text"
            value={formulaire.reference}
            onChange={(e) => setFormulaire({ ...formulaire, reference: e.target.value })}
            placeholder="Ex. Lenovo ThinkPad T480 i5 8Go 256Go SSD"
            className="input w-full h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm sm:text-base font-bold text-brand-black dark:text-white shadow-xs focus:border-brand-orange"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-brand-black dark:text-white mb-1.5" htmlFor="cat-produit">
            Catégorie du Produit *
          </label>
          <input
            id="cat-produit"
            type="text"
            list="categories-inventaire"
            value={formulaire.categorie}
            onChange={(e) => setFormulaire({ ...formulaire, categorie: e.target.value })}
            placeholder="Sélectionner ou saisir une catégorie..."
            className="input w-full h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm sm:text-base font-bold text-brand-black dark:text-white shadow-xs focus:border-brand-orange"
          />
          <datalist id="categories-inventaire">
            {(donnees?.categories ?? []).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-brand-warm-grey mb-1.5" htmlFor="lot-produit">
            {t("inventaire.lotRattachement")}
          </label>
          <select
            id="lot-produit"
            value={formulaire.lot_id}
            onChange={(e) => setFormulaire({ ...formulaire, lot_id: e.target.value })}
            className="select w-full h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold text-brand-black dark:text-white shadow-xs"
          >
            <option value="">{t("inventaire.stockIndependant")}</option>
            {(donnees?.lots ?? []).map((l) => (
              <option key={l.id} value={l.id}>
                {l.libelle}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* COLONNE DROITE : FINANCES & STOCK */}
      <div className="space-y-4">
        
        <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/3 border border-slate-200/80 dark:border-white/10 space-y-4">
          <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange block">
            Finances & Exemplaires Physiques
          </span>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-brand-warm-grey uppercase mb-1.5" htmlFor="prix-produit">
                Prix Achat (DA) *
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
                className="input w-full h-12 rounded-xl bg-white dark:bg-brand-black border border-slate-200 dark:border-white/10 text-right font-black text-sm sm:text-base text-brand-black dark:text-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-brand-orange uppercase mb-1.5" htmlFor="prix-vente-produit">
                Prix Vente (DA)
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
                className="input w-full h-12 rounded-xl bg-white dark:bg-brand-black border border-brand-orange/40 text-right font-black text-sm sm:text-base text-brand-orange"
                placeholder="Non fixé"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-brand-warm-grey uppercase mb-1.5" htmlFor="quantite-produit">
              Quantité en Stock *
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
              className="input w-full h-12 rounded-xl bg-white dark:bg-brand-black border border-slate-200 dark:border-white/10 text-right font-black text-sm sm:text-base text-brand-black dark:text-white"
            />
            {modalEdition !== null && Number(formulaire.quantite) !== modalEdition.unites.length && (
              <div className="mt-2 text-[11px] font-bold leading-tight text-brand-orange bg-brand-orange/10 p-2.5 rounded-xl border border-brand-orange/20 flex items-center gap-1.5">
                <span>Attention : Modifier la quantité ajustera le nombre d'exemplaires réels.</span>
              </div>
            )}
          </div>
        </div>

        {/* Toggles Tactiles Larges */}
        {modalEdition === null && (
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/50 dark:bg-white/2 cursor-pointer transition-all hover:bg-slate-100/80">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={formVitrine}
                onChange={(e) => setFormVitrine(e.target.checked)}
                className="w-5 h-5 rounded-lg accent-brand-orange cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-xs sm:text-sm text-brand-black dark:text-white block">
                  Exposer en vitrine
                </span>
                <span className="text-[11px] text-brand-warm-grey">
                  Visible physiquement au comptoir magasin
                </span>
              </div>
            </div>
            <IconeVitrine taille={18} className="text-brand-orange" />
          </label>
        )}

        {modalEdition !== null && (
          <label className="flex items-center justify-between p-3.5 rounded-2xl border border-brand-orange/30 bg-brand-orange/5 cursor-pointer transition-all hover:bg-brand-orange/10">
            <div className="flex items-center gap-2.5">
              <input
                type="checkbox"
                checked={formMettreEnVente}
                onChange={(e) => setFormMettreEnVente(e.target.checked)}
                className="w-5 h-5 rounded-lg accent-brand-orange cursor-pointer"
              />
              <div>
                <span className="font-extrabold text-xs sm:text-sm text-brand-orange block">
                  Mettre en vente immédiatement
                </span>
                <span className="text-[11px] text-brand-warm-grey">
                  Passe le statut à « En vente » pour les exemplaires avec prix
                </span>
              </div>
            </div>
          </label>
        )}

      </div>

      {/* PLEINE LARGEUR EN BAS : PHOTOS */}
      <div className="md:col-span-2 pt-2 border-t border-slate-200/80 dark:border-white/10 space-y-2">
        <label className="block text-xs sm:text-sm font-black uppercase tracking-wider text-brand-warm-grey">
          {t("inventaire.photos")}
        </label>
        <ChampPhotos
          photos={formPhotos}
          onChange={(p) => {
            setFormPhotos(p);
            setFormPhotosModifiees(true);
          }}
          disabled={envoi}
        />
      </div>

    </div>
  );

  const vue = searchParams?.get("vue") || "cockpit";

  return (
    <>
      <div className="space-y-4 animate-entree mb-8">
        {/* Header avec Breadcrumb & Actions principales */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
          <BreadcrumbNavigation
            vue={vue}
            familleId={searchParams?.get("famille_id") ? Number(searchParams.get("famille_id")) : null}
            categorieId={searchParams?.get("categorie_id") ? Number(searchParams.get("categorie_id")) : null}
            sousCategorieId={searchParams?.get("sous_categorie_id") ? Number(searchParams.get("sous_categorie_id")) : null}
            totalArticles={donnees?.total}
            majUrl={majUrl}
          />
            
          <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2 shrink-0">
            {peutModifier && (
              <button
                type="button"
                onClick={() => setModalImportation(true)}
                className="btn bg-brand-orange/15 hover:bg-brand-orange/25 text-brand-orange border border-brand-orange/30 font-black text-xs sm:text-sm px-4 py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <UploadCloud className="w-4 h-4 text-brand-orange shrink-0" />
                <span>Importer Excel / CSV</span>
              </button>
            )}
            {estGerant && (
              <button
                type="button"
                onClick={() => setModalExport(true)}
                className="btn btn-secondaire w-full sm:w-auto justify-center bg-white dark:bg-brand-paper shadow-sm flex items-center gap-1.5"
              >
                <IconeTelechargement taille={15} />
                <span>Export CSV / Excel</span>
              </button>
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
        {(vue === "tableau" || vue === "atraiter" || (!afficherFamilles && vue === "cockpit") || q.trim() !== "") && (
          <div className="space-y-2">
            <div className="carte !p-2 sm:!p-3 flex flex-col lg:flex-row gap-3 items-center shadow-sm z-20 relative">
              <div className="flex-1 w-full relative flex flex-col sm:flex-row gap-2">
                <RechercheMultiModal
                  valeur={q}
                  onInstantChange={(valeur) => setQLoc(valeur)}
                  onChange={(valeur) => {
                    setQ(valeur);
                    majUrl({ q: valeur.trim() || null, page: "1" });
                  }}
                  className="flex-1"
                />

                {vue !== "cockpit" && vue !== "categorie" && (
                  <div className="flex items-center self-stretch bg-brand-light-grey/20 dark:bg-white/5 rounded-xl p-1 border border-brand-light-grey/50 dark:border-white/10 shrink-0 gap-1">
                    <div className="flex items-center h-full">
                      <button 
                        type="button"
                        onClick={() => setModeAffichage("cartes")} 
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all h-full ${modeAffichage === "cartes" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                        title="Vue Cartes"
                      >
                        ▦
                      </button>
                      <button 
                        type="button"
                        onClick={() => setModeAffichage("tableau")} 
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all h-full ${modeAffichage === "tableau" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                        title="Vue Tableau"
                      >
                        ☷
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Barre d'actions groupées si sélection */}
              {selection.length > 0 && vue !== "cockpit" && (
                <div className="absolute inset-0 bg-brand-orange dark:bg-brand-orange z-30 rounded-lg flex items-center justify-between px-4 animate-entree text-white shadow-lg">
                  <div className="flex items-center gap-4">
                    <span className="font-bold">{selection.length} sélectionné{selection.length > 1 ? 's' : ''}</span>
                    <button type="button" onClick={() => setSelection([])} className="text-white/80 hover:text-white text-sm">Annuler</button>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      className="btn bg-white/20 hover:bg-white/30 text-white border-none"
                      onClick={() => {
                        const prods = donneesFiltrees?.produits.filter(p => selection.includes(p.id)) || [];
                        setModalClassification(prods);
                      }}
                    >
                      <IconeArchive taille={14} /> Classer
                    </button>
                  </div>
                </div>
              )}
              
              {vue !== "cockpit" && (
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                  {/* Sélecteur d'arrivage / lot */}
                  <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-xl bg-white dark:bg-brand-paper px-3 py-2 h-[44px]">
                    <select
                      value={searchParams?.get("sans_lot") === "1" ? "__sans__" : (searchParams?.get("lot") ?? "")}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === "__sans__") majUrl({ sans_lot: "1", lot: null, page: "1" });
                        else majUrl({ lot: v || null, sans_lot: null, page: "1" });
                      }}
                      className="bg-transparent text-xs sm:text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
                    >
                      <option value="">Tous les arrivages</option>
                      <option value="__sans__">Sans arrivage (Indépendant)</option>
                      {(donnees?.lots ?? []).map((l) => (
                        <option key={l.id} value={l.id}>{l.libelle}</option>
                      ))}
                    </select>
                    <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
                  </div>
                  
                  {/* Tri */}
                  <div className="relative flex-1 sm:flex-none flex items-center border border-brand-light-grey dark:border-white/10 rounded-xl bg-white dark:bg-brand-paper px-3 py-2 h-[44px]">
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
                      className="bg-transparent text-xs sm:text-sm text-brand-black dark:text-white font-medium focus:outline-none w-full cursor-pointer appearance-none pr-4"
                    >
                      <option value="">Trier par défaut</option>
                      <option value="prix_asc">Prix croissant</option>
                      <option value="prix_desc">Prix décroissant</option>
                    </select>
                    <IconeChevronBas taille={14} className="absolute right-3 text-brand-warm-grey pointer-events-none" />
                  </div>

                  {/* Bouton d'ouverture du tiroir de filtres avec compteur */}
                  <button
                    type="button"
                    onClick={() => setTiroirFiltresOuvert(true)}
                    className={`flex-none min-h-[44px] flex items-center gap-2 border rounded-xl px-4 py-2 transition-all text-xs sm:text-sm font-bold active:scale-95 ${
                      tiroirFiltresOuvert || nbFiltresActifs > 0 
                      ? 'border-brand-orange bg-brand-orange/10 text-brand-orange shadow-inner' 
                      : 'border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper text-brand-warm-grey hover:bg-brand-light-grey/30 hover:text-brand-black dark:hover:text-white'
                    }`}
                  >
                    <IconFilter className="w-4 h-4" />
                    <span>Filtres</span>
                    {nbFiltresActifs > 0 && (
                      <span className="bg-brand-orange text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-black ml-0.5">
                        {nbFiltresActifs}
                      </span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Barre de badges des filtres actifs */}
            <ActiveFilterBadges
              searchParams={{ get: (k) => searchParams?.get(k) || null }}
              majUrl={majUrl}
            />
          </div>
        )}

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
                <label className="flex items-center gap-2 text-sm font-medium text-brand-orange cursor-pointer">
                  <input
                    type="checkbox"
                    checked={searchParams?.get("a_classer") === "1"}
                    onChange={(e) => majUrl({ a_classer: e.target.checked ? "1" : null, page: "1" })}
                    className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                  />
                  À classer
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
            q={q}
            afficherFamilles={afficherFamilles} 
            setAfficherFamilles={setAfficherFamilles} 
          />
        </div>
      )}
      
      {vue === "famille" && searchParams?.get("famille_id") && (
        <div className="mb-8">
          <VueFamille 
            familleId={Number(searchParams.get("famille_id"))} 
            majUrl={majUrl} 
          />
        </div>
      )}

      {vue === "categorie" && searchParams?.get("categorie_id") && (
        <div className="mb-8">
          <VueCategorie 
            categorieId={Number(searchParams.get("categorie_id"))} 
            majUrl={majUrl} 
          />
        </div>
      )}

      {(vue === "tableau" || vue === "atraiter" || (!["cockpit", "famille", "categorie"].includes(vue)) || (vue === "cockpit" && !afficherFamilles)) && (
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
            <div className="space-y-4">
              
              {/* ===================== VUE CARTES REGROUPÉE PAR MODÈLE ===================== */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 ${modeAffichage === "cartes" ? "" : "hidden"}`}>
                {groupes.map((g) => {
                  const ouvert = groupesOuverts.has(g.cle);
                  const tousCoches = g.unites.length > 0 && g.unites.every(u => selection.includes(u.id));

                  return (
                    <div
                      key={g.cle}
                      className={`group flex flex-col rounded-2xl border bg-white dark:bg-brand-paper shadow-xs transition-all hover:shadow-md overflow-hidden ${
                        tousCoches
                          ? "border-brand-orange ring-2 ring-brand-orange/30"
                          : "border-slate-200 dark:border-white/10 hover:border-brand-orange/40"
                      }`}
                    >
                      {/* Image / Header de la Carte */}
                      <div className="relative aspect-video bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        {g.image_url ? (
                          <img 
                            src={g.image_url}
                            alt={g.reference}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex items-center justify-center w-full h-full text-slate-400 opacity-40">
                            <Boxes className="w-10 h-10" />
                          </div>
                        )}

                        {/* Badges Disponibilité */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-black text-xs shadow-md ${
                            g.totalDisponibles > 0 
                              ? "bg-emerald-600 text-white" 
                              : "bg-red-600 text-white"
                          }`}>
                            En stock : {g.totalDisponibles}
                          </span>
                        </div>

                        {/* Checkbox Sélection Modèle */}
                        <div className="absolute top-2 right-2" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox"
                            checked={tousCoches}
                            onChange={() => {
                              const idsGroupe = g.unites.map(u => u.id);
                              if (tousCoches) {
                                setSelection(prev => prev.filter(id => !idsGroupe.includes(id)));
                              } else {
                                setSelection(prev => Array.from(new Set([...prev, ...idsGroupe])));
                              }
                            }}
                            className="accent-brand-orange w-5 h-5 rounded border-white shadow-md cursor-pointer"
                          />
                        </div>
                      </div>

                      {/* Corps de la Carte */}
                      <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                        <div>
                          <p className="text-[11px] font-bold text-brand-orange uppercase tracking-wider truncate">
                            {g.categorie}
                          </p>
                          <h3 
                            onClick={() => basculerGroupe(g.cle)}
                            className="font-black text-sm text-slate-900 dark:text-white line-clamp-2 hover:text-brand-orange cursor-pointer mt-0.5"
                            title={g.reference}
                          >
                            {g.reference}
                          </h3>

                          {/* Statuts */}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {g.resumeStatuts.map((r) => (
                              <span key={r.statut} className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${INFOS_STATUT[r.statut].badge}`}>
                                {r.n}× {INFOS_STATUT[r.statut].libelle}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Prix */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-baseline justify-between">
                          {!estSocial && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-bold block uppercase">Achat</span>
                              <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
                                {formaterDA(g.prixMin)}
                              </span>
                            </div>
                          )}
                          <div className="text-right">
                            <span className="text-[10px] text-brand-orange font-bold block uppercase">Vente</span>
                            <span className="text-sm font-mono font-black text-brand-orange">
                              {g.venteMin ? formaterDA(g.venteMin) : "—"}
                            </span>
                          </div>
                        </div>

                        {/* Actions Rapides */}
                        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between gap-1">
                          {/* Bouton (+) Arrivage Rapide Universel */}
                          {peutModifier && (
                            <button
                              type="button"
                              onClick={() => {
                                ouvrirAjoutRapide({
                                  modele_id: g.modele_id,
                                  reference: g.reference,
                                  categorie: g.categorie,
                                  categorie_id: g.categorie_id,
                                  prixMin: g.prixMin,
                                  venteMin: g.venteMin,
                                });
                              }}
                              className="p-2 rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition font-bold cursor-pointer"
                              title="Ajouter des exemplaires en stock"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}

                          {/* Bouton Facturer */}
                          {g.totalDisponibles > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                if (g.totalDisponibles === 1) {
                                  const disponible = g.unites.find(u => u.statut !== "vendu" && u.statut !== "hs") || g.unites[0]!;
                                  ouvrirVenteInventaire([disponible]);
                                } else {
                                  setModalSelectionQuantite({ action: "facturer", groupe: g });
                                }
                              }}
                              className="p-2 rounded-xl text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 transition"
                              title="Facturer"
                            >
                              <IconeBillet taille={16} />
                            </button>
                          )}

                          {/* Bouton Drilldown (Voir exemplaires) */}
                          <button
                            type="button"
                            onClick={() => basculerGroupe(g.cle)}
                            className={`p-2 rounded-xl text-xs font-bold transition flex items-center gap-1 ${
                              ouvert
                                ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                            }`}
                            title="Voir les Numéros de Série"
                          >
                            <Hash className="w-3.5 h-3.5" />
                            <span>{g.unites.length} S/N</span>
                          </button>

                          {/* Bouton Éditer */}
                          {peutModifier && (
                            <button
                              type="button"
                              onClick={() => ouvrirEdition(g.unites, g.reference)}
                              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                              title="Éditer le modèle"
                            >
                              <IconeCrayon taille={15} />
                            </button>
                          )}
                        </div>

                        {/* Si Déplié dans la carte */}
                        {ouvert && (
                          <div className="pt-2 border-t border-slate-100 dark:border-white/5 space-y-1.5 max-h-44 overflow-y-auto pr-1">
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Exemplaires :</span>
                            {g.unites.map((u) => (
                              <div key={u.id} className="p-1.5 rounded-lg bg-slate-50 dark:bg-zinc-800/50 flex items-center justify-between text-xs">
                                <div>
                                  <span className="font-mono font-bold text-brand-orange">{u.code_interne}</span>
                                  <span className="text-[10px] text-slate-500 block">{u.numero_serie ? `S/N: ${u.numero_serie}` : "Sans S/N"}</span>
                                </div>
                                <BadgeStatut statut={u.statut} aJeter={u.a_jeter} />
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===================== VUE TABLEAU REGROUPÉE PAR MODÈLE ===================== */}
              <div className={`w-full overflow-x-auto rounded-2xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper shadow-sm relative scrollbar-fine ${modeAffichage === "tableau" ? "block" : "hidden"}`}>
                <table className="w-full min-w-[900px] text-[13px] relative border-collapse">
                  <thead className="bg-brand-light-grey/60 dark:bg-black/60 sticky top-0 z-10 backdrop-blur-md border-b border-brand-light-grey dark:border-white/10">
                    <tr>
                      <th className="py-3.5 px-3 w-10 text-center">
                        <input 
                          type="checkbox"
                          checked={donneesFiltrees.produits.length > 0 && donneesFiltrees.produits.every(p => selection.includes(p.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelection(donneesFiltrees.produits.map(p => p.id));
                            } else {
                              setSelection([]);
                            }
                          }}
                          className="accent-brand-orange w-4 h-4 rounded border-brand-light-grey cursor-pointer"
                          title="Tout sélectionner"
                        />
                      </th>
                      <th className="py-3.5 px-2 w-8 text-center"></th>
                      <th className="py-3.5 px-3 text-left font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
                        Modèle / Référence
                      </th>
                      <th className="py-3.5 px-3 text-left font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
                        Catégorie
                      </th>
                      <th className="py-3.5 px-3 text-center font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
                        Disponibilité / Stock
                      </th>
                      {!estSocial && (
                        <th className="py-3.5 px-3 text-right font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
                          Prix Achat Unitaire
                        </th>
                      )}
                      <th className="py-3.5 px-3 text-right font-black text-brand-orange uppercase tracking-wider text-[11px]">
                        Prix Vente
                      </th>
                      <th className="py-3.5 px-4 text-right font-black text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-light-grey/40 dark:divide-white/5">
                    {groupes.map((g) => {
                      const ouvert = groupesOuverts.has(g.cle);
                      const tousCoches = g.unites.length > 0 && g.unites.every(u => selection.includes(u.id));
                      const certainsCoches = g.unites.some(u => selection.includes(u.id)) && !tousCoches;

                      return (
                        <React.Fragment key={g.cle}>
                          {/* Ligne Principale du Modèle */}
                          <tr className={`group transition-colors min-h-[80px] ${tousCoches || certainsCoches ? "bg-brand-orange/5 dark:bg-brand-orange/10" : "hover:bg-brand-light-grey/20 dark:hover:bg-white/2"}`}>
                            {/* Checkbox Modèle */}
                            <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox"
                                checked={tousCoches}
                                ref={(el) => {
                                  if (el) el.indeterminate = certainsCoches;
                                }}
                                onChange={() => {
                                  const idsGroupe = g.unites.map(u => u.id);
                                  if (tousCoches) {
                                    setSelection(prev => prev.filter(id => !idsGroupe.includes(id)));
                                  } else {
                                    setSelection(prev => Array.from(new Set([...prev, ...idsGroupe])));
                                  }
                                }}
                                className="accent-brand-orange w-4 h-4 rounded border-brand-light-grey cursor-pointer"
                              />
                            </td>

                            {/* Chevron Drill-Down */}
                            <td className="py-4 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => basculerGroupe(g.cle)}
                                className="p-1 rounded-lg text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10 transition"
                                title={ouvert ? "Masquer les exemplaires" : "Voir les exemplaires physiques (S/N)"}
                              >
                                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${ouvert ? "rotate-180 text-brand-orange" : ""}`} />
                              </button>
                            </td>

                            {/* Photo & Référence Modèle */}
                            <td className="py-4 px-3">
                              <div className="flex items-center gap-3">
                                {g.image_url ? (
                                  <img 
                                    src={g.image_url}
                                    alt={g.reference}
                                    className="w-12 h-12 rounded-xl object-cover border border-slate-200 dark:border-white/10 shrink-0 bg-slate-50"
                                  />
                                ) : (
                                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 border border-dashed border-slate-300 dark:border-white/10 flex items-center justify-center text-slate-400 shrink-0">
                                    <Boxes className="w-6 h-6 opacity-40" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div 
                                    onClick={() => basculerGroupe(g.cle)}
                                    className="font-black text-sm sm:text-base text-slate-900 dark:text-white hover:text-brand-orange cursor-pointer whitespace-normal break-words max-w-[320px] leading-snug"
                                    title={g.reference}
                                  >
                                    {g.reference}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                    {g.resumeStatuts.map((r) => (
                                      <span key={r.statut} className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${INFOS_STATUT[r.statut].badge}`}>
                                        {r.n}× {INFOS_STATUT[r.statut].libelle}
                                      </span>
                                    ))}
                                    {g.enVitrine > 0 && (
                                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-brand-orange/15 text-[10px] font-bold text-brand-orange">
                                        <IconeVitrine taille={10} /> Vitrine ({g.enVitrine})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Catégorie */}
                            <td className="py-4 px-3 text-xs font-semibold text-slate-500 whitespace-normal break-words max-w-[160px]">
                              {g.categorie}
                            </td>

                            {/* Saisie Directe Quantité en Stock (Zéro Friction) */}
                            <td className="py-4 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <GestionnaireQuantite
                                modeleId={g.modele_id}
                                quantiteActuelle={g.totalDisponibles}
                                unitesIds={g.unites.map((u) => u.id)}
                                peutModifier={peutModifier}
                                onChangement={() => void charger()}
                                taille="sm"
                              />
                            </td>

                            {/* Prix Achat */}
                            {!estSocial && (
                              <td className="py-4 px-3 text-right font-mono font-bold text-xs text-slate-900 dark:text-white">
                                {g.prixMin === g.prixMax
                                  ? formaterDA(g.prixMin)
                                  : `${formaterDA(g.prixMin)} – ${formaterDA(g.prixMax)}`}
                              </td>
                            )}

                            {/* Prix Vente */}
                            <td className="py-4 px-3 text-right font-mono font-black text-sm text-brand-orange">
                              {g.venteMin === null
                                ? "—"
                                : g.venteMin === g.venteMax
                                ? formaterDA(g.venteMin)
                                : `${formaterDA(g.venteMin)} – ${formaterDA(g.venteMax!)}`}
                            </td>

                            {/* Actions Rapides Modèle */}
                            <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex items-center gap-1 justify-end">
                                {/* Bouton (+) Arrivage Rapide Universel */}
                                {peutModifier && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      ouvrirAjoutRapide({
                                        modele_id: g.modele_id,
                                        reference: g.reference,
                                        categorie: g.categorie,
                                        categorie_id: g.categorie_id,
                                        prixMin: g.prixMin,
                                        venteMin: g.venteMin,
                                      });
                                    }}
                                    className="p-1.5 rounded-xl text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 transition shadow-2xs font-bold cursor-pointer"
                                    title="Ajouter des exemplaires en stock"
                                  >
                                    <Plus className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Bouton Facturer / Vendre */}
                                {g.totalDisponibles > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (g.totalDisponibles === 1) {
                                        const disponible = g.unites.find(u => u.statut !== "vendu" && u.statut !== "hs") || g.unites[0]!;
                                        ouvrirVenteInventaire([disponible]);
                                      } else {
                                        setModalSelectionQuantite({ action: "facturer", groupe: g });
                                      }
                                    }}
                                    className="p-1.5 rounded-xl text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20 transition shadow-2xs"
                                    title="Vendre / Facturer ce modèle"
                                  >
                                    <IconeBillet taille={16} />
                                  </button>
                                )}

                                {/* Bouton Changer Statut */}
                                {peutModifier && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setModalSelectionQuantite({ action: "statut", groupe: g });
                                    }}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-brand-black dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                    title="Changer le statut en masse"
                                  >
                                    <SlidersHorizontal className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Bouton Vitrine */}
                                {peutModifier && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const exposeIds = g.unites.filter(u => u.en_vitrine).map(u => u.id);
                                      const nonVendu = g.unites.filter(u => u.statut !== "vendu");
                                      if (g.enVitrine > 0) {
                                        void basculerVitrineIds(exposeIds, false, g.reference);
                                      } else if (nonVendu.length > 0) {
                                        void basculerVitrineIds([nonVendu[0]!.id], true, g.reference);
                                      }
                                    }}
                                    className={`p-1.5 rounded-xl transition ${
                                      g.enVitrine > 0
                                        ? "text-brand-orange bg-brand-orange/15"
                                        : "text-slate-400 hover:text-brand-orange hover:bg-brand-orange/10"
                                    }`}
                                    title={g.enVitrine > 0 ? "Retirer de la vitrine" : "Mettre en vitrine"}
                                  >
                                    <IconeVitrine taille={16} />
                                  </button>
                                )}

                                {/* Bouton Imprimer */}
                                <BoutonImpression
                                  ids={g.unites.map(u => u.id)}
                                  dejaImprimee={g.unites.every(u => u.etiquette_imprimee)}
                                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                />

                                {/* Bouton Éditer */}
                                {peutModifier && (
                                  <button
                                    type="button"
                                    onClick={() => ouvrirEdition(g.unites, g.reference)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 transition"
                                    title="Modifier les informations du modèle"
                                  >
                                    <IconeCrayon taille={15} />
                                  </button>
                                )}

                                {/* Bouton Supprimer */}
                                {peutModifier && (
                                  <button
                                    type="button"
                                    onClick={() => ouvrirSuppressionModele(g)}
                                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                                    title="Supprimer tous les exemplaires"
                                  >
                                    <IconeCorbeille taille={15} />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Drill-down : Liste des Exemplaires Physiques Dépliée */}
                          {ouvert && (
                            <tr>
                              <td colSpan={8} className="p-0 bg-slate-50/70 dark:bg-zinc-900/60 border-y border-slate-200 dark:border-white/10">
                                <div className="py-3 px-6 space-y-2">
                                  <div className="flex items-center justify-between text-xs font-black text-slate-400 uppercase tracking-wider">
                                    <span>Exemplaires physiques actifs ({g.unites.length})</span>
                                    <span>S/N & Emplacement</span>
                                  </div>

                                  <div className="divide-y divide-slate-200/60 dark:divide-white/5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
                                    {g.unites.map((p) => {
                                      const estCoche = selection.includes(p.id);
                                      return (
                                        <div 
                                          key={p.id}
                                          className={`flex items-center justify-between p-3 transition-colors ${
                                            estCoche ? "bg-brand-orange/10" : "hover:bg-slate-50 dark:hover:bg-zinc-800/50"
                                          }`}
                                        >
                                          <div className="flex items-center gap-3">
                                            <input 
                                              type="checkbox"
                                              checked={estCoche}
                                              onChange={() => {
                                                setSelection(prev =>
                                                  prev.includes(p.id) ? prev.filter(x => x !== p.id) : [...prev, p.id]
                                                );
                                              }}
                                              className="accent-brand-orange w-4 h-4 rounded border-slate-300 cursor-pointer"
                                            />

                                            <div>
                                              <div className="flex items-center gap-2">
                                                <Link
                                                  href={`/produits/${p.id}`}
                                                  className="font-mono text-xs font-black text-brand-orange hover:underline"
                                                >
                                                  {p.code_interne}
                                                </Link>
                                                {p.grade && (
                                                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-300">
                                                    {p.grade}
                                                  </span>
                                                )}
                                                {p.emplacement && (
                                                  <span className="text-[10px] font-medium text-slate-400">
                                                    · {p.emplacement === "vitrine" ? "Vitrine" : "Réserve"}
                                                  </span>
                                                )}
                                              </div>
                                              <div className="text-[11px] font-mono font-bold text-slate-500 mt-0.5">
                                                {p.numero_serie ? `S/N: ${p.numero_serie}` : "Sans numéro de série"}
                                              </div>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-4">
                                            <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />

                                            <div className="text-right">
                                              <div className="font-mono font-bold text-xs text-slate-900 dark:text-white">
                                                {p.prix_vente_fixe ? formaterDA(p.prix_vente_fixe) : "—"}
                                              </div>
                                              <div className="text-[10px] font-mono text-slate-400">
                                                Achat: {formaterDA(p.prix_achat)}
                                              </div>
                                            </div>

                                            {peutModifier && (
                                              <div className="flex items-center gap-1">
                                                {/* Bouton (+) Scanner Arrivage Universel */}
                                                <button
                                                  type="button"
                                                  onClick={() => ouvrirAjoutRapide(p)}
                                                  className="p-1 rounded-lg text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition font-bold cursor-pointer"
                                                  title="Ajouter des exemplaires en stock"
                                                >
                                                  <Plus className="w-3.5 h-3.5" />
                                                </button>
                                                {p.statut !== "vendu" && (
                                                  <button
                                                    type="button"
                                                    onClick={() => ouvrirVenteInventaire([p])}
                                                    className="p-1 rounded-lg text-brand-orange hover:bg-brand-orange/10 transition"
                                                    title="Facturer cette unité"
                                                  >
                                                    <IconeBillet taille={14} />
                                                  </button>
                                                )}
                                                <button
                                                  type="button"
                                                  onClick={() => ouvrirEdition([p], p.code_interne, g.unites)}
                                                  className="p-1 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
                                                  title="Éditer cette unité"
                                                >
                                                  <IconeCrayon taille={13} />
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => ouvrirSuppressionUnites([p])}
                                                  className="p-1 rounded-lg text-slate-400 hover:text-red-600 transition"
                                                  title="Supprimer cette unité"
                                                >
                                                  <IconeCorbeille taille={13} />
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
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
                selectionne={idsSelectionnes.has(p.id)}
                onToggleSelection={basculerSelection}
                basculerVitrineIds={basculerVitrineIds}
                ouvrirEdition={ouvrirEdition}
                ouvrirSuppressionUnites={ouvrirSuppressionUnites}
                ouvrirAjout={ouvrirAjoutRapide}
                ouvrirVente={(prod) => router.push(`/pos?vendre_produit_id=${prod.id}`)}
                t={t}
              />
            ))}
          </div>

          <div className={`overflow-x-auto rounded-xl border border-brand-light-grey dark:border-white/10 bg-white dark:bg-brand-paper shadow-sm relative scrollbar-fine ${modeAffichage === "tableau" ? "block max-h-[800px]" : "hidden"}`}>
            <table className="w-full min-w-[860px] text-[13px] relative">
              <thead className="bg-brand-light-grey/60 dark:bg-black/60 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        donneesFiltrees.produits.length > 0 &&
                        donneesFiltrees.produits.every((p) => idsSelectionnes.has(p.id))
                      }
                      onChange={toutSelectionner}
                      className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange accent-brand-orange cursor-pointer"
                      title="Tout sélectionner"
                      aria-label="Tout sélectionner"
                    />
                  </th>
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
                  <th className="py-3 px-4 text-right font-bold text-brand-warm-grey dark:text-brand-grey uppercase tracking-wider text-[11px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-light-grey/40 dark:divide-white/5">
                {donneesFiltrees.produits.map((p) => {
                  const estCoche = idsSelectionnes.has(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => router.push(`/produits/${p.id}`)}
                      className={`group cursor-pointer transition-colors min-h-[80px] ${
                        estCoche
                          ? "bg-brand-orange/[0.04] dark:bg-brand-orange/[0.08]"
                          : "hover:bg-brand-light-grey/30 dark:hover:bg-white/5"
                      }`}
                    >
                      <td
                        className="px-3 py-4 text-center"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={estCoche}
                          onChange={(e) => {
                            e.stopPropagation();
                            basculerSelection(p.id);
                          }}
                          className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange accent-brand-orange cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-4 font-mono text-xs text-brand-warm-grey dark:text-brand-grey font-bold">
                        {p.code_interne}
                      </td>
                      <td className="whitespace-normal break-words max-w-[280px] px-4 py-4 font-extrabold text-sm text-brand-black dark:text-white leading-snug" title={p.reference}>
                        {p.reference}
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-brand-warm-grey dark:text-brand-warm-grey whitespace-normal break-words max-w-[160px]">{p.categorie}</td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center gap-2">
                          <BadgeStatut statut={p.statut} aJeter={p.a_jeter} />
                          {p.en_vitrine && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-brand-orange/15 px-2 py-0.5 text-[10px] font-bold text-brand-orange">
                              <IconeVitrine taille={11} /> {t("inventaire.vitrine")}
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-brand-black dark:text-brand-warm-grey">
                        <div className="font-bold">{new Date(p.date_entree).toLocaleDateString("fr-FR")}</div>
                        <div className="text-[11px] text-brand-warm-grey dark:text-brand-grey mt-0.5 font-medium">
                          {p.lot_id
                            ? t("inventaire.lotLong", { n: p.lot_id, f: p.fournisseur || "" })
                            : t("inventaire.sansArrivage")}
                        </div>
                      </td>
                      {!estSocial && (
                        <td className="px-4 py-4 text-right">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-warm-grey dark:text-brand-grey mb-0.5">{t("inventaire.achat")}</span>
                          <span className="font-bold text-brand-black dark:text-white font-mono">{formaterDA(p.prix_achat)}</span>
                          {p.cout_reparations > 0 && (
                            <span className="block text-[10px] text-brand-warm-grey dark:text-brand-grey mt-0.5 font-mono">
                              +{formaterDA(p.cout_reparations)} {t("inventaire.reparationsAbr")}
                            </span>
                          )}
                        </td>
                      )}
                      <td className="px-4 py-4 text-right">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-orange/80 mb-0.5">{t("inventaire.vente")}</span>
                        {prixVenteAffiche(p) !== null ? (
                          <span className="font-extrabold text-brand-orange text-sm font-mono">
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
                      <td className="px-4 py-4 text-right text-brand-warm-grey dark:text-brand-warm-grey font-bold">{p.jours_stock}</td>
                      <td className="px-3 py-4">
                        {peutModifier && (
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            {/* + : Ajouter exemplaire rapide */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                ouvrirAjoutRapide(p);
                              }}
                              title="Ajouter un exemplaire"
                              aria-label="Ajouter un exemplaire"
                              className="rounded-lg p-1.5 text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange transition-colors"
                            >
                              <IconePlus taille={15} />
                            </button>

                            {/* Billet : Vendre / Facturer */}
                            {p.statut === "en_vente" && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  router.push(`/pos?vendre_produit_id=${p.id}`);
                                }}
                                title="Vendre / Facturer"
                                aria-label="Vendre"
                                className="rounded-lg p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                              >
                                <IconeBillet taille={15} />
                              </button>
                            )}

                            {/* Barcode : Copier code interne */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                navigator.clipboard.writeText(p.code_interne);
                                afficher(`Code ${p.code_interne} copié !`);
                              }}
                              title={`Copier le code : ${p.code_interne}`}
                              aria-label="Copier le code"
                              className="rounded-lg p-1.5 text-brand-warm-grey hover:bg-brand-light-grey/60 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
                            >
                              <IconeCodeBarres taille={14} />
                            </button>

                            {/* Imprimer */}
                            <BoutonImpression
                              ids={[p.id]}
                              dejaImprimee={p.etiquette_imprimee}
                              className="rounded-lg p-1.5 text-brand-warm-grey transition-colors hover:bg-brand-light-grey/50 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white"
                            />

                            {/* Crayon : Éditer */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                ouvrirEdition([p], p.code_interne);
                              }}
                              title={t("inventaire.editer")}
                              aria-label={t("inventaire.editerProduit", { code: p.code_interne })}
                              className="rounded-lg p-1.5 text-brand-warm-grey transition-colors hover:bg-brand-light-grey/50 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white"
                            >
                              <IconeCrayon taille={15} />
                            </button>

                            {/* Vitrine */}
                            {p.statut !== "vendu" && (
                              <button
                                type="button"
                                disabled={envoi}
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  void basculerVitrineIds([p.id], !p.en_vitrine, p.code_interne);
                                }}
                                title={p.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
                                aria-label={t("inventaire.basculerVitrine", { code: p.code_interne, action: p.en_vitrine ? t("inventaire.retirer") : t("inventaire.mettre") })}
                                className={`rounded-lg p-1.5 transition-colors disabled:opacity-40 ${
                                  p.en_vitrine
                                    ? "text-brand-orange bg-brand-orange/10 hover:bg-brand-orange/20"
                                    : "text-brand-warm-grey hover:bg-brand-orange/10 hover:text-brand-orange"
                                }`}
                              >
                                <IconeVitrine taille={15} />
                              </button>
                            )}

                            {/* Supprimer */}
                            {p.statut !== "vendu" && (
                              <button
                                type="button"
                                onClick={(e: React.MouseEvent) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  ouvrirSuppressionUnites([p]);
                                }}
                                title={t("inventaire.supprimer")}
                                aria-label={t("inventaire.supprimerProduit", { code: p.code_interne })}
                                className="rounded-lg p-1.5 text-brand-warm-grey transition-colors hover:bg-danger/10 hover:text-danger"
                              >
                                <IconeCorbeille taille={15} />
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
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

      {/* Barre d'actions groupées flottante si sélection active */}
      {selection.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-entree max-w-[95vw]">
          <div className="flex flex-wrap items-center gap-3 px-5 py-3 rounded-2xl bg-brand-black/95 dark:bg-zinc-900/95 text-white shadow-2xl backdrop-blur-xl border border-white/15">
            <div className="flex items-center gap-2 pr-3 border-r border-white/20">
              <span className="w-7 h-7 rounded-xl bg-brand-orange text-white font-black text-xs flex items-center justify-center shadow-md">
                {selection.length}
              </span>
              <span className="text-xs font-bold whitespace-nowrap">
                {selection.length} sélectionné{selection.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Facturer */}
              <button
                type="button"
                onClick={() => {
                  const selectedProds = donneesFiltrees?.produits.filter(p => selection.includes(p.id)) ?? [];
                  if (selectedProds.length > 0) {
                    ouvrirVenteInventaire(selectedProds);
                  }
                }}
                className="btn bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-bold py-2 px-3.5 h-auto rounded-xl flex items-center gap-1.5 shadow-md shadow-brand-orange/20"
              >
                <IconeBillet taille={15} />
                <span>Facturer ({selection.length})</span>
              </button>

              {/* Changer Statut */}
              <button
                type="button"
                onClick={() => {
                  const selectedProds = donneesFiltrees?.produits.filter(p => selection.includes(p.id)) ?? [];
                  if (selectedProds.length > 0) {
                    setIdsSelectionnes(new Set(selection));
                    setStatutMasseCible("");
                    setStatutMasseNote("");
                    setModalStatutMasse(true);
                  }
                }}
                className="btn bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3.5 h-auto rounded-xl flex items-center gap-1.5"
              >
                <IconeReglages taille={15} />
                <span>Changer statut</span>
              </button>

              {/* Imprimer Étiquettes */}
              <BoutonImpression
                ids={selection}
                dejaImprimee={selection.every(id => donneesFiltrees?.produits.find(p => p.id === id)?.etiquette_imprimee)}
                className="btn bg-white/10 hover:bg-white/20 text-white text-xs font-bold py-2 px-3.5 h-auto rounded-xl flex items-center gap-1.5"
                texte={`Imprimer (${selection.length})`}
              />

              {/* Supprimer en masse */}
              {peutModifier && (
                <button
                  type="button"
                  onClick={() => {
                    const selectedProds = donneesFiltrees?.produits.filter(p => selection.includes(p.id)) ?? [];
                    if (selectedProds.length > 0) {
                      ouvrirSuppressionUnites(selectedProds);
                    }
                  }}
                  className="btn bg-red-600/80 hover:bg-red-600 text-white text-xs font-bold py-2 px-3.5 h-auto rounded-xl flex items-center gap-1.5"
                >
                  <IconeCorbeille taille={15} />
                  <span>Supprimer</span>
                </button>
              )}

              {/* Désélectionner */}
              <button
                type="button"
                onClick={() => setSelection([])}
                className="p-2 text-white/60 hover:text-white rounded-xl hover:bg-white/10 transition ml-1"
                title="Désélectionner tout"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
      )}

      <Modale
        titre={produitSourceDuplication ? "Ajouter un exemplaire" : t("inventaire.ajouterProduitTitre")}
        ouverte={modalAjout}
        large="4xl"
        modificationsNonEnregistrees={formulaireModifie || formPhotosModifiees}
        onFermer={() => {
          setModalAjout(false);
          setProduitSourceDuplication(null);
        }}
      >
        {brouillonDisponible && (
          <div className="mb-4 rounded-2xl bg-brand-orange/10 p-3.5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border border-brand-orange/20 animate-entree">
            <div className="text-sm">
              <p className="font-bold text-brand-orange">Un brouillon non enregistré est disponible.</p>
              <p className="text-xs text-brand-orange/80">Sauvegardé {new Date(brouillonDisponible.timestamp).toLocaleTimeString()}</p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <button type="button" onClick={supprimerBrouillon} className="btn btn-secondaire text-xs flex-1 sm:flex-none">Supprimer</button>
              <button type="button" onClick={restaurerBrouillon} className="btn bg-brand-orange text-white hover:bg-brand-orange/90 text-xs font-bold flex-1 sm:flex-none">Reprendre</button>
            </div>
          </div>
        )}
        <div className="mb-4 p-3.5 rounded-2xl bg-brand-orange/10 border border-brand-orange/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-entree">
          <div className="flex items-center gap-2.5 text-xs font-bold text-brand-orange">
            <UploadCloud className="w-4 h-4 shrink-0" />
            <span>Vous possédez un fichier fournisseur (Excel / CSV) ?</span>
          </div>
          <button
            type="button"
            onClick={() => {
              setModalAjout(false);
              setModalImportation(true);
            }}
            className="btn btn-sm bg-brand-orange text-white hover:bg-brand-orange/90 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs shrink-0 w-full sm:w-auto justify-center"
          >
            Ouvrir l'Assistant d'Importation ➔
          </button>
        </div>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!envoi && formulaireValide) {
              void ajouterProduit();
            }
          }}
        >
          {champsProduit}
          <div className="pt-4 border-t border-slate-200/80 dark:border-white/10 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setModalAjout(false);
                setProduitSourceDuplication(null);
              }}
              className="btn btn-secondaire h-12 px-5 rounded-xl font-bold w-full sm:w-auto justify-center"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={envoi || !formulaireValide}
              onClick={() => void ajouterProduit(true)}
              className="btn btn-secondaire h-12 px-5 rounded-xl font-bold w-full sm:w-auto justify-center text-brand-orange border-brand-orange/30 hover:bg-brand-orange/10"
            >
              Enregistrer & Suivant
            </button>
            <button
              type="submit"
              disabled={envoi || !formulaireValide}
              className="btn btn-primaire h-12 px-6 rounded-xl font-black text-sm w-full sm:w-auto justify-center shadow-md shadow-brand-orange/20"
            >
              <IconePlus taille={16} />
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
        large="4xl"
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
            <div className="space-y-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/3 p-4">
              <div className="flex flex-col items-start sm:flex-row sm:items-center justify-between gap-2">
                <span className="block text-xs sm:text-sm font-black uppercase tracking-wider text-brand-black dark:text-white">
                  {t("inventaire.statut")}
                </span>
                {(() => {
                  const tousMemeStatut = modalEdition.unites.every(u => u.statut === modalEdition.unites[0]!.statut);
                  if (tousMemeStatut) {
                    return <BadgeStatut statut={modalEdition.unites[0]!.statut} aJeter={modalEdition.unites[0]!.a_jeter} />;
                  } else {
                    return <span className="text-xs font-black uppercase tracking-wider text-brand-warm-grey">Statuts multiples</span>;
                  }
                })()}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={cibleStatut || ""}
                  onChange={(e) => {
                    const val = e.target.value as StatutProduit;
                    if (val) {
                      void changerStatut(val);
                    }
                  }}
                  disabled={envoi || cibleStatut !== null}
                  className="select w-full sm:w-auto h-11 rounded-xl bg-white dark:bg-brand-black border-slate-200 dark:border-white/10 text-xs sm:text-sm font-bold text-brand-black dark:text-white shadow-xs"
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
                <div className="space-y-2 rounded-2xl bg-white dark:bg-brand-black p-3.5 border border-slate-200 dark:border-white/10 animate-entree">
                  <label className="block text-xs font-bold text-brand-black dark:text-white" htmlFor="note-statut-inv">
                    {t("inventaire.noteObligatoire", { statut: INFOS_STATUT[cibleStatut].libelle })}
                  </label>
                  <textarea
                    id="note-statut-inv"
                    value={noteStatut}
                    onChange={(e) => setNoteStatut(e.target.value)}
                    rows={2}
                    autoFocus
                    placeholder={PLACEHOLDERS_NOTE[cibleStatut] ?? t("inventaire.precisezRaison")}
                    className="textarea w-full rounded-xl bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs font-medium"
                  />
                  <div className="flex flex-col sm:flex-row justify-end gap-2 mt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCibleStatut(null);
                        setNoteStatut("");
                      }}
                      className="btn btn-secondaire text-xs h-10 px-4 rounded-xl font-bold"
                    >
                      {t("inventaire.annuler")}
                    </button>
                    <button
                      type="button"
                      disabled={envoi || !noteStatut.trim()}
                      onClick={() => void changerStatut(cibleStatut)}
                      className="btn btn-primaire text-xs h-10 px-5 rounded-xl font-black"
                    >
                      {t("inventaire.confirmerStatut")}
                    </button>
                  </div>
                </div>
              )}

              {modalEdition.unites[0]!.statut === "hs" && (
                <label className="flex items-start gap-2.5 pt-1 text-xs font-bold text-danger cursor-pointer">
                  <input
                    type="checkbox"
                    checked={modalEdition.unites[0]!.a_jeter}
                    disabled={envoi}
                    onChange={(e) => void basculerAJeter(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-danger shrink-0 rounded"
                  />
                  <span>{t("inventaire.aJeterNonRecuperable")}</span>
                </label>
              )}
            </div>
          )}

          {modalEdition && peutModifier && modalEdition.unites[0]!.statut !== "vendu" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/80 dark:bg-white/3 p-4">
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-brand-black dark:text-white inline-flex items-center gap-1.5">
                  <IconeVitrine taille={16} className="text-brand-orange" /> {t("inventaire.vitrine")}
                </span>
                <p className="text-xs text-brand-warm-grey mt-0.5">
                  {t("inventaire.vitrineDescription")}
                </p>
              </div>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void basculerVitrine()}
                className={
                  modalEdition.unites[0]!.en_vitrine
                    ? "btn bg-brand-orange text-white hover:bg-brand-orange/90 h-11 px-5 rounded-xl text-xs font-bold"
                    : "btn btn-secondaire h-11 px-5 rounded-xl text-xs font-bold"
                }
              >
                {modalEdition.unites[0]!.en_vitrine ? t("inventaire.retirerDeVitrine") : t("inventaire.mettreVitrine")}
              </button>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row justify-between items-center gap-4 border-t border-slate-200/80 dark:border-white/10 pt-5 mt-5">
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
                  className="btn btn-secondaire h-12 px-4 rounded-xl text-xs font-bold flex-1 sm:flex-none justify-center"
                >
                  <IconeChevronGauche taille={16} /> Précédent
                </button>
                <button
                  type="button"
                  disabled={envoi || contexteNavigation.indexCourant >= contexteNavigation.produits.length - 1}
                  onClick={() => {
                    const nextIndex = contexteNavigation.indexCourant + 1;
                    const nextProduct = contexteNavigation.produits[nextIndex];
                    if (nextProduct) ouvrirEdition([nextProduct], nextProduct.code_interne, contexteNavigation.produits);
                  }}
                  className="btn btn-secondaire h-12 px-4 rounded-xl text-xs font-bold flex-1 sm:flex-none justify-center"
                >
                  Suivant <IconeChevronDroite taille={16} />
                </button>
              </div>
            ) : (
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setModalEdition(null)}
                  className="btn btn-secondaire h-12 px-5 rounded-xl font-bold w-full sm:w-auto justify-center"
                >
                  Annuler
                </button>
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {contexteNavigation && modalEdition?.unites.length === 1 && (
                <button
                  type="button"
                  onClick={() => setModalEdition(null)}
                  className="btn btn-secondaire h-12 px-5 rounded-xl font-bold w-full sm:w-auto justify-center sm:hidden"
                >
                  Annuler
                </button>
              )}
              {contexteNavigation && modalEdition?.unites.length === 1 && (
                <button
                  type="button"
                  onClick={() => setModalEdition(null)}
                  className="btn btn-secondaire h-12 px-5 rounded-xl font-bold w-full sm:w-auto justify-center hidden sm:flex"
                >
                  Annuler
                </button>
              )}
              <button
                type="submit"
                disabled={envoi || !formulaireValide}
                className="btn btn-primaire h-12 px-6 rounded-xl font-black text-sm w-full sm:w-auto justify-center shadow-md shadow-brand-orange/20"
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
                  className="btn bg-brand-black hover:bg-brand-black/90 text-white h-12 px-5 rounded-xl text-xs font-black w-full sm:w-auto justify-center shadow-md"
                >
                  Enregistrer & Suivant
                </button>
              )}
            </div>
          </div>
        </form>
      </Modale>

      <ModalSuppression
        modalSuppression={modalSuppression}
        onFermer={() => setModalSuppression(null)}
        onSubmit={() => {
          if (!envoi && modalSuppression?.unites.length) {
            void supprimerProduits();
          }
        }}
        envoi={envoi}
      />

      {modalClassification && (
        <ModalClassification
          produits={modalClassification}
          ouverte={true}
          onFermer={() => setModalClassification(null)}
          onSucces={() => {
            setModalClassification(null);
            void charger();
          }}
        />
      )}
      {/* Barre flottante d'actions groupées (Bulk Actions) */}
      {idsSelectionnes.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-3 bg-brand-black text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 animate-entree backdrop-blur-xl max-w-[95vw]">
          <div className="flex items-center gap-2 border-r border-white/20 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
              {idsSelectionnes.size}
            </span>
            <span className="text-sm font-semibold whitespace-nowrap">
              {idsSelectionnes.size} sélectionné{idsSelectionnes.size > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Facturer / Vendre */}
            <button
              type="button"
              onClick={() => {
                router.push(`/pos?vendre_ids=${Array.from(idsSelectionnes).join(",")}`);
              }}
              className="btn bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 font-bold"
              title="Ajouter au panier POS (1 unité par article)"
            >
              <IconeRecu taille={15} />
              <span>Facturer / Vendre</span>
            </button>

            {/* Changer le statut */}
            {peutStatut && (
              <button
                type="button"
                onClick={() => {
                  setStatutMasseCible("");
                  setStatutMasseNote("");
                  setModalStatutMasse(true);
                }}
                className="btn bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 font-semibold"
                title="Changer le statut de la sélection"
              >
                <IconeReglages taille={15} />
                <span>Statut</span>
              </button>
            )}

            {/* Imprimer les étiquettes */}
            <button
              type="button"
              onClick={() => {
                window.open(
                  `/imprimer-etiquettes?ids=${Array.from(idsSelectionnes).join(",")}`,
                  "_blank",
                  "width=400,height=600"
                );
              }}
              className="btn bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 font-semibold"
              title="Imprimer les étiquettes de la sélection"
            >
              <IconeImprimante taille={15} />
              <span>Étiquettes</span>
            </button>

            {/* Mettre en vitrine */}
            {peutModifier && (
              <button
                type="button"
                disabled={envoi}
                onClick={() => {
                  void basculerVitrineIds(
                    Array.from(idsSelectionnes),
                    true,
                    `${idsSelectionnes.size} produit(s)`
                  );
                }}
                className="btn bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 font-semibold"
                title="Mettre en vitrine"
              >
                <IconeVitrine taille={15} />
                <span className="hidden sm:inline">Vitrine</span>
              </button>
            )}

            {/* Supprimer */}
            {peutModifier && (
              <button
                type="button"
                onClick={() => {
                  if (donneesFiltrees) {
                    const selectionnes = donneesFiltrees.produits.filter((p) =>
                      idsSelectionnes.has(p.id)
                    );
                    ouvrirSuppressionUnites(selectionnes);
                  }
                }}
                className="btn bg-red-600/80 hover:bg-red-600 text-white text-xs py-2 px-3 shadow-sm flex items-center gap-1.5 font-semibold"
                title="Supprimer les exemplaires sélectionnés"
              >
                <IconeCorbeille taille={15} />
                <span>Supprimer</span>
              </button>
            )}
          </div>

          {/* Désélectionner */}
          <button
            type="button"
            onClick={deselectionnerTout}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition ml-auto"
            title="Désélectionner tout"
          >
            <IconeFermer taille={15} />
          </button>
        </div>
      )}



      {/* Modale de changement de statut en masse */}
      <Modale
        titre={`Changer le statut — ${idsSelectionnes.size} produit(s)`}
        ouverte={modalStatutMasse}
        onFermer={() => setModalStatutMasse(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void appliquerStatutMasse();
          }}
        >
          <div>
            <label className="libelle mb-1.5" htmlFor="statut-cible-masse">
              Nouveau statut *
            </label>
            <select
              id="statut-cible-masse"
              value={statutMasseCible}
              onChange={(e) => setStatutMasseCible(e.target.value as StatutProduit)}
              className="champ"
              required
            >
              <option value="">Sélectionner un statut…</option>
              {STATUTS_PRODUIT.map((s) => (
                <option key={s} value={s}>
                  {INFOS_STATUT[s].libelle}
                </option>
              ))}
            </select>
          </div>

          {statutMasseCible &&
            STATUTS_NOTE_OBLIGATOIRE.includes(statutMasseCible as StatutProduit) && (
              <div>
                <label className="libelle mb-1.5" htmlFor="statut-note-masse">
                  Note contextuelle obligatoire *
                </label>
                <textarea
                  id="statut-note-masse"
                  rows={2}
                  value={statutMasseNote}
                  onChange={(e) => setStatutMasseNote(e.target.value)}
                  placeholder="Raison du changement de statut…"
                  className="champ"
                  required
                />
              </div>
            )}

          <div className="flex justify-end gap-2 pt-2 border-t border-brand-light-grey/50">
            <button
              type="button"
              onClick={() => setModalStatutMasse(false)}
              className="btn btn-secondaire"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={envoi || !statutMasseCible}
              className="btn btn-primaire"
            >
              Appliquer le statut
            </button>
          </div>
        </form>
      </Modale>

      <FilterDrawer
        ouvert={tiroirFiltresOuvert}
        onFermer={() => setTiroirFiltresOuvert(false)}
        searchParams={{ get: (k) => searchParams?.get(k) || null }}
        majUrl={majUrl}
        lotsDisponibles={donnees?.lots || []}
        familleNom={nomFamilleActif}
        categorieNom={nomCategorieActif}
      />

      <ModaleAjoutTerrain
        ouverte={modalAjoutTerrain}
        onFermer={() => setModalAjoutTerrain(false)}
        lotsDisponibles={donnees?.lots || []}
        categorieDefautId={sousCategorieActive?.id || categorieActive?.id || (categorieIdActif ? Number(categorieIdActif) : null)}
        onSucces={({ codes, ajoutes }) => {
          afficher(`${ajoutes} exemplaire(s) généré(s) avec succès.`);
          void charger();
        }}
      />

      <AssistantImportation
        ouvert={modalImportation}
        onFermer={() => setModalImportation(false)}
        lots={donnees?.lots || []}
        onSucces={(resume) => {
          const infoCodes = resume.premierCode ? ` (Codes ${resume.premierCode}${resume.dernierCode && resume.dernierCode !== resume.premierCode ? ` à ${resume.dernierCode}` : ""})` : "";
          afficher(`Importation réussie : ${resume.totalExemplairesCrees} unités créées${infoCodes}.`, "succes");
          void charger();
        }}
      />

      <ModaleExport
        ouverte={modalExport}
        onFermer={() => setModalExport(false)}
        searchParamsString={searchParams?.toString() || ""}
        nbArticlesFiltres={donnees?.total || donnees?.produits?.length || 0}
      />

      {modalVenteUnites && (
        <ModaleVenteInventaire
          ouverte={modalVenteUnites !== null}
          unites={modalVenteUnites}
          onFermer={() => setModalVenteUnites(null)}
          onSucces={() => {
            setModalVenteUnites(null);
            setSelection([]);
            void charger();
          }}
        />
      )}

      {/* Modale de Sélection de Quantité ou S/N pour Actions Groupées */}
      {modalSelectionQuantite && (
        <ModaleSelectionQuantite
          ouvert={true}
          action={modalSelectionQuantite.action}
          reference={modalSelectionQuantite.groupe.reference}
          categorie={modalSelectionQuantite.groupe.categorie}
          unites={modalSelectionQuantite.groupe.unites}
          onFermer={() => setModalSelectionQuantite(null)}
          onConfirmer={(unitesSelectionnees, statutCible, note) => {
            if (modalSelectionQuantite.action === "facturer") {
              ouvrirVenteInventaire(unitesSelectionnees);
            } else if (modalSelectionQuantite.action === "statut" && statutCible) {
              void changerStatutUnites(unitesSelectionnees, statutCible, note);
            } else if (modalSelectionQuantite.action === "supprimer") {
              ouvrirSuppressionUnites(unitesSelectionnees);
            }
          }}
        />
      )}

      {/* COMPOSANT UNIVERSEL UNIQUE : Gestion du stock & Ajout d'exemplaires */}
      <UniversalStockManager
        ouvert={cibleStockManager !== null}
        onFermer={() => setCibleStockManager(null)}
        onSucces={() => {
          setCibleStockManager(null);
          void charger();
        }}
        cible={cibleStockManager}
      />
    </>
  );
}
