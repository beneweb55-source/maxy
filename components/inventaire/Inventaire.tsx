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
import { transitionsPossibles } from "@/lib/state-machine";
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
import { SkeletonCarteProduit, SkeletonTable } from "@/components/Skeleton";
import ModaleSelectionQuantite from "./ModaleSelectionQuantite";
import UniversalStockManager, { type TargetStockSource } from "@/components/produits/UniversalStockManager";
import GestionnaireQuantite from "@/components/produits/GestionnaireQuantite";
import BreadcrumbNavigation from "./BreadcrumbNavigation";
import RechercheMultiModal from "./RechercheMultiModal";
import FilterDrawer from "./FilterDrawer";
import ActiveFilterBadges from "./ActiveFilterBadges";
import GrilleProduits from "./GrilleProduits";
import TableauProduits from "./TableauProduits";
import FiltresRapides from "./FiltresRapides";
import ToolbarInventaire from "./ToolbarInventaire";
import {
  UploadCloud,
  SlidersHorizontal,
  CheckCircle2,
  Plus,
  X,
  Filter as IconFilter,
  LayoutGrid,
  Table2,
} from "lucide-react";
import type { LigneProduit, GroupeProduits, ReponseInventaire, CategorieNoeud, FormulaireProduit } from "./types";
import { FORMULAIRE_VIDE, COLONNES_TRI } from "./types";
import { formatCategoriePath, prixVenteAffiche, grouperDoublons } from "./utils";

export type { LigneProduit, GroupeProduits, ReponseInventaire, CategorieNoeud } from "./types";

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
  const [categoriesTree, setCategoriesTree] = useState<CategorieNoeud[]>([]);

  const chargerCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/categories");
      if (res.ok) {
        const data = await res.json();
        setCategoriesTree(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Error loading categories in Inventaire:", err);
    }
  }, []);

  useEffect(() => {
    void chargerCategories();
  }, [chargerCategories]);

  const familleIdActif = searchParams?.get("famille_id");
  const categorieIdActif = searchParams?.get("categorie_id");
  const sousCategorieIdActif = searchParams?.get("sous_categorie_id");

  const familleActive = categoriesTree.find((f) => String(f.id) === familleIdActif);
  let categorieActive: CategorieNoeud | null = null;
  if (familleActive && categorieIdActif) {
    categorieActive = (familleActive.enfants || []).find((c) => String(c.id) === categorieIdActif) ?? null;
  } else if (categorieIdActif) {
    for (const f of categoriesTree) {
      const found = (f.enfants || []).find((c) => String(c.id) === categorieIdActif);
      if (found) {
        categorieActive = found;
        break;
      }
    }
  }

  let sousCategorieActive: CategorieNoeud | null = null;
  if (sousCategorieIdActif) {
    for (const f of categoriesTree) {
      for (const c of f.enfants || []) {
        const foundSc = (c.enfants || []).find((sc) => String(sc.id) === sousCategorieIdActif);
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
    } : (() => {
      const cleBrute = searchParams?.get("cle");
      const cleDecodée = cleBrute ? decodeBase64Url(cleBrute) : null;
      const sepIdx = cleDecodée?.lastIndexOf("|") ?? -1;
      return {
        ...FORMULAIRE_VIDE,
        categorie: sepIdx !== -1
          ? cleDecodée!.substring(sepIdx + 1)
          : searchParams?.get("categorie") || "",
        reference: sepIdx !== -1
          ? cleDecodée!.substring(0, sepIdx)
          : "",
      };
    })(),
    modalAjout || modalEdition !== null || produitSourceDuplication !== null
  );

  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formPhotosModifiees, setFormPhotosModifiees] = useState(false);
  const [formVitrine, setFormVitrine] = useState(false);
  const [formMettreEnVente, setFormMettreEnVente] = useState(false);

  const [vueGroupee, setVueGroupee] = useState(true);
  const [groupesOuverts, setGroupesOuverts] = useState<Set<string>>(new Set());
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

  // Modale changement de statut en masse
  const [modalStatutMasse, setModalStatutMasse] = useState<boolean>(false);
  const [statutMasseCible, setStatutMasseCible] = useState<StatutProduit | "">("");
  const [statutMasseNote, setStatutMasseNote] = useState<string>("");

  // Source pour l'ajout rapide : peut venir d'un produit, groupe, ou composant Cockpit (camelCase)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function ouvrirAjoutRapide(source?: LigneProduit | GroupeProduits | Record<string, any>) {
    if (!source) {
      ouvrirAjout();
      return;
    }
    const s = source as Record<string, any>;
    setCibleStockManager({
      modeleId: s.modele_id ?? s.modeleId ?? null,
      produitId: s.id ?? null,
      reference: s.reference ?? s.modeleNom ?? "Article",
      categorie: s.categorie ?? "Matériel",
      categorie_id: s.categorie_id ?? s.categorieId ?? null,
      prix_achat: s.prix_achat ?? s.prixAchatDefaut ?? s.prixMin ?? 0,
      prix_vente_fixe: s.prix_vente_fixe ?? s.prixVenteDefaut ?? s.venteMin ?? null,
      image_url: s.image_url ?? null,
      grade: s.grade ?? "Grade A",
      emplacement: s.emplacement ?? "reserve",
      lot_id: s.lot_id ?? null,
    });
  }

  async function appliquerStatutMasse() {
    if (!statutMasseCible || selection.length === 0 || envoi) return;
    setEnvoi(true);
    try {
      const ids = selection;
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
      setSelection([]);
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
    (searchParams?.get("a_classer") ? 1 : 0) +
    (searchParams?.get("sans_photo") ? 1 : 0) +
    (searchParams?.get("sans_etiquette") ? 1 : 0) +
    (searchParams?.get("a_jeter") ? 1 : 0) +
    (searchParams?.get("en_vitrine") ? 1 : 0) +
    statutsActifs.length;

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

  const groupes = donneesFiltrees ? grouperDoublons(donneesFiltrees.produits, statutsActifs) : [];

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
          <select
            id="cat-produit"
            value={formulaire.categorie}
            onChange={(e) => {
              const val = e.target.value;
              setFormulaire({ ...formulaire, categorie: val });
            }}
            className="select w-full h-12 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-sm sm:text-base font-bold text-brand-black dark:text-white shadow-xs focus:border-brand-orange"
          >
            <option value="">Sélectionner une catégorie…</option>
            {categoriesTree.map((famille) => (
              <optgroup key={famille.id} label={famille.nom}>
                {(famille.enfants ?? []).map((cat) => (
                  <React.Fragment key={cat.id}>
                    <option value={cat.nom}>{cat.nom}</option>
                    {(cat.enfants ?? []).map((sc) => (
                      <option key={sc.id} value={sc.nom}>{`  └ ${sc.nom}`}</option>
                    ))}
                  </React.Fragment>
                ))}
              </optgroup>
            ))}
            {categoriesTree.length === 0 && (
              <option value="" disabled>Aucune catégorie disponible</option>
            )}
          </select>
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
                pattern="[0-9]*"
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
                        aria-label="Vue Cartes"
                      >
                        <LayoutGrid className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setModeAffichage("tableau")}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all h-full ${modeAffichage === "tableau" ? "bg-white dark:bg-brand-paper shadow-sm text-brand-black dark:text-white" : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"}`}
                        title="Vue Tableau"
                        aria-label="Vue Tableau"
                      >
                        <Table2 className="w-4 h-4" />
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

          {/* Filtres rapides : statut, période, raccourcis */}
          {vue !== "cockpit" && (
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
                    {" "}· valeur totale (achat + réparations) :{" "}
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
            <div className="space-y-4">
              {modeAffichage === "cartes" ? (
                <SkeletonCarteProduit nombre={8} />
              ) : (
                <SkeletonTable lignes={8} colonnes={7} />
              )}
            </div>
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
              
                            {/* ===================== VUE CARTES ===================== */}
              <div className={modeAffichage === "cartes" ? "" : "hidden"}>
                <GrilleProduits
                  groupes={groupes}
                  selection={selection}
                  groupesOuverts={groupesOuverts}
                  peutModifier={peutModifier}
                  estSocial={estSocial}
                  onSelection={setSelection}
                  onBasculerGroupe={basculerGroupe}
                  onOuvrirAjoutRapide={ouvrirAjoutRapide}
                  onOuvrirEdition={ouvrirEdition}
                  onOuvrirVente={ouvrirVenteInventaire}
                  onOuvrirSelectionQuantite={setModalSelectionQuantite}
                />
              </div>

                            {/* ===================== VUE TABLEAU ===================== */}
              <div className={modeAffichage === "tableau" ? "block" : "hidden"}>
                <TableauProduits
                  groupes={groupes}
                  donneesFiltrees={donneesFiltrees}
                  selection={selection}
                  groupesOuverts={groupesOuverts}
                  peutModifier={peutModifier}
                  estSocial={estSocial}
                  onSelection={setSelection}
                  onBasculerGroupe={basculerGroupe}
                  onOuvrirAjoutRapide={ouvrirAjoutRapide}
                  onOuvrirEdition={ouvrirEdition}
                  onOuvrirVente={ouvrirVenteInventaire}
                  onOuvrirSelectionQuantite={setModalSelectionQuantite}
                  onOuvrirSuppressionModele={ouvrirSuppressionModele}
                  onOuvrirSuppressionUnites={ouvrirSuppressionUnites}
                  onBasculerVitrineIds={basculerVitrineIds}
                  onCharger={charger}
                />
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
                  if (selection.length > 0) {
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
                  {(() => {
                    // Si toutes les unités ont le même statut, n'afficher que les transitions valides
                    const tousMemeStatut = modalEdition.unites.every(u => u.statut === modalEdition.unites[0]!.statut);
                    if (tousMemeStatut) {
                      const statutActuel = modalEdition.unites[0]!.statut;
                      return transitionsPossibles(statutActuel).map((s) => (
                        <option key={s} value={s}>{INFOS_STATUT[s].libelle}</option>
                      ));
                    }
                    // Statuts hétérogènes : afficher tous les statuts sauf les finaux
                    return STATUTS_PRODUIT.filter(s => {
                      const estFinal = ["vendu", "hs"].includes(s);
                      return !estFinal && s !== modalEdition.unites[0]!.statut;
                    }).map((s) => (
                      <option key={s} value={s}>{INFOS_STATUT[s].libelle}</option>
                    ));
                  })()}
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

              {(() => {
                const tousHS = modalEdition.unites.every(u => u.statut === "hs");
                if (!tousHS) return null;
                const tousAJeter = modalEdition.unites.every(u => u.a_jeter);
                return (
                  <label className="flex items-start gap-2.5 pt-1 text-xs font-bold text-danger cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tousAJeter}
                      ref={(el) => { if (el) el.indeterminate = !tousAJeter && modalEdition.unites.some(u => u.a_jeter); }}
                      disabled={envoi}
                      onChange={(e) => void basculerAJeter(e.target.checked)}
                      className="mt-0.5 w-4 h-4 accent-danger shrink-0 rounded"
                    />
                    <span>
                      {t("inventaire.aJeterNonRecuperable")}
                      {modalEdition.unites.length > 1 && (
                        <span className="text-brand-warm-grey font-normal ml-1">
                          ({modalEdition.unites.length} unités HS)
                        </span>
                      )}
                    </span>
                  </label>
                );
              })()}
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
                    if (formulaireModifie || formPhotosModifiees) {
                      if (!window.confirm("Des modifications non enregistrées seront perdues. Continuer ?")) return;
                    }
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
                    if (formulaireModifie || formPhotosModifiees) {
                      if (!window.confirm("Des modifications non enregistrées seront perdues. Continuer ?")) return;
                    }
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
                  className="btn btn-secondaire h-12 px-5 rounded-xl font-bold w-full sm:w-auto justify-center"
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
            void chargerCategories();
          }}
        />
      )}
      {/* Barre flottante d'actions groupées (Bulk Actions) */}
      {selection.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-wrap items-center gap-3 bg-brand-black text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/20 animate-entree backdrop-blur-xl max-w-[95vw]">
          <div className="flex items-center gap-2 border-r border-white/20 pr-3">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-orange text-xs font-bold text-white">
              {selection.length}
            </span>
            <span className="text-sm font-semibold whitespace-nowrap">
              {selection.length} sélectionné{selection.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Facturer / Vendre */}
            <button
              type="button"
              onClick={() => {
                router.push(`/pos?vendre_ids=${selection.join(",")}`);
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
                  `/imprimer-etiquettes?ids=${selection.join(",")}`,
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
                    selection,
                    true,
                    `${selection.length} produit(s)`
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
                      selection.includes(p.id)
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
            onClick={() => setSelection([])}
            className="p-1.5 text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition ml-auto"
            title="Désélectionner tout"
          >
            <IconeFermer taille={15} />
          </button>
        </div>
      )}



      {/* Modale de changement de statut en masse */}
      <Modale
        titre={`Changer le statut — ${selection.length} produit(s)`}
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
            {statutMasseCible && (() => {
              const selectionneIds = new Set(selection);
              const produitsSelectionnes = donnees?.produits.filter((p) => selectionneIds.has(p.id)) ?? [];
              const dejaCible = produitsSelectionnes.filter((p) => p.statut === statutMasseCible).length;
              const serontModifies = produitsSelectionnes.length - dejaCible;
              if (dejaCible === 0) return null;
              return (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                  {serontModifies} produit(s) seront modifié(s)
                  {dejaCible > 0 && ` · ${dejaCible} déjà « ${INFOS_STATUT[statutMasseCible as StatutProduit]?.libelle} »`}
                </p>
              );
            })()}
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
