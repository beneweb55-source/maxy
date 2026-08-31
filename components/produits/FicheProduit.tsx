"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DecisionRapport, Role, StatutLot, StatutProduit } from "@prisma/client";
import { 
  Laptop, 
  Server, 
  HardDrive, 
  Cpu, 
  Zap, 
  Monitor, 
  Printer, 
  Scan, 
  Barcode, 
  PackagePlus, 
  Tag, 
  Coins, 
  Layers, 
  Edit3, 
  Trash2, 
  Store, 
  Warehouse, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  ArrowLeft, 
  Archive, 
  Plus, 
  Wrench, 
  FileText, 
  History, 
  ShoppingBag, 
  ExternalLink,
  ShieldCheck,
  Eye,
  RefreshCw,
  Sparkles,
  SlidersHorizontal,
  X
} from "lucide-react";
import BadgeStatut from "@/components/BadgeStatut";
import Modale from "@/components/Modale";
import ChampPhotos from "@/components/ChampPhotos";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import ModalClassification from "@/components/inventaire/ModalClassification";
import ModaleArrivageRapide from "@/components/produits/ModaleArrivageRapide";
import FormulaireModele from "@/components/produits/FormulaireModele";
import BoutonImpression from "@/components/BoutonImpression";
import SelecteurStatutProduit from "@/components/produits/SelecteurStatutProduit";
import ModaleVente from "@/components/ventes/ModaleVente";
import { useToast } from "@/components/toast";
import { formaterDA } from "@/lib/caisse";
import { INFOS_STATUT } from "@/lib/statuts";
import { 
  determinerProfilEquipement, 
  type ProfilEquipement 
} from "@/lib/matrice-specifications";

export interface ExemplairePhysique {
  id: number;
  code_interne: string;
  reference: string;
  numero_serie: string | null;
  grade: string | null;
  emplacement: string | null;
  statut: StatutProduit;
  a_jeter: boolean;
  en_vitrine: boolean;
  prix_achat: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  date_vente: string | null;
  etiquette_imprimee: boolean;
  lot_id: number | null;
  created_at: string;
  lot?: {
    id: number;
    fournisseur: string;
    date_entree: string;
  } | null;
}

export interface ProduitDetailDto {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  numero_serie: string | null;
  grade: string | null;
  emplacement: string | null;
  modele_id: number | null;
  categorie_id: number | null;
  statut: StatutProduit;
  notes: string | null;
  image_url: string | null;
  images: string[];
  en_vitrine: boolean;
  etiquette_imprimee: boolean;
  decision_rapport: DecisionRapport | null;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  prix_vente_reel: number | null;
  date_vente: string | null;
  quantite: number;
  ids_modele: number[];
  marge: number | null;
  jours_stock: number;
  date_entree: string;
  modele?: {
    id: number;
    nom: string;
    description: string | null;
    attributs: Record<string, any> | null;
    prix_vente_conseille: number | null;
    image_url: string | null;
    categorie?: {
      id: number;
      nom: string;
      parent?: {
        id: number;
        nom: string;
        parent?: { id: number; nom: string } | null;
      } | null;
    } | null;
  } | null;
  categorie_rel?: {
    id: number;
    nom: string;
    parent?: {
      id: number;
      nom: string;
      parent?: { id: number; nom: string } | null;
    } | null;
  } | null;
  lot: { id: number; fournisseur: string; date_entree: string; statut_lot: StatutLot } | null;
  exemplaires: ExemplairePhysique[];
  reparations: { id: number; cout: number; description: string; date: string; par: string }[];
  historique: {
    id: number;
    statut_avant: StatutProduit | null;
    statut_apres: StatutProduit;
    note: string | null;
    quand: string;
    par: string;
  }[];
  ventes: {
    id: number;
    prix_vente_reel: number;
    canal: string | null;
    date_vente: string;
    vendeur: string;
    annulee: boolean;
    motif_annulation: string | null;
  }[];
}

const GRADES_LABELS: Record<string, { label: string; badge: string }> = {
  "Neuf": { label: "Neuf", badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200" },
  "Grade A+": { label: "Grade A+", badge: "bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border-teal-200" },
  "Grade A": { label: "Grade A", badge: "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200" },
  "Grade B": { label: "Grade B", badge: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200" },
  "Grade C": { label: "Grade C", badge: "bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-200" },
  "A réparer": { label: "À réparer", badge: "bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border-purple-200" },
  "Pour pièces": { label: "Pour pièces", badge: "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300 border-red-200" },
};

export default function FicheProduit({
  produitId,
  role,
}: {
  produitId: number;
  role: Role;
}) {
  const router = useRouter();
  const { afficher } = useToast();
  const peutModifier = ["gerant", "technicien", "dev"].includes(role);
  const estGerant = ["gerant", "dev"].includes(role);

  const [produit, setProduit] = useState<ProduitDetailDto | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  // Modales
  const [modalArrivage, setModalArrivage] = useState(false);
  const [modalVenteDirecte, setModalVenteDirecte] = useState(false);
  const [modalEditModele, setModalEditModele] = useState(false);
  const [modalClassification, setModalClassification] = useState(false);
  const [indexVisionneuse, setIndexVisionneuse] = useState<number | null>(null);
  const [modalEditUnite, setModalEditUnite] = useState<ExemplairePhysique | null>(null);
  const [editSn, setEditSn] = useState("");
  const [editGrade, setEditGrade] = useState("Grade A");
  const [editEmplacement, setEditEmplacement] = useState<"reserve" | "vitrine">("reserve");
  const [editPrixVente, setEditPrixVente] = useState("");
  const [envoiUnite, setEnvoiUnite] = useState(false);

  // Modal Réparation SAV
  const [modalReparation, setModalReparation] = useState(false);
  const [coutReparation, setCoutReparation] = useState("");
  const [descReparation, setDescReparation] = useState("");
  const [envoiReparation, setEnvoiReparation] = useState(false);

  // Verrouiller le scroll du body lorsqu'une sous-modale est ouverte
  useEffect(() => {
    if (modalEditUnite || modalReparation) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [modalEditUnite, modalReparation]);

  // Onglet secondaire actif (Exemplaires, Atelier SAV, Historique, Ventes)
  const [ongletActif, setOngletActif] = useState<"exemplaires" | "atelier" | "historique" | "ventes">("exemplaires");

  // Charger les données du produit
  const chargerProduit = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/produits/${produitId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Produit introuvable.");
        throw new Error("Erreur lors du chargement des données.");
      }
      const json = await res.json();
      setProduit(json);
    } catch (err: any) {
      setErreur(err.message || "Erreur réseau");
    } finally {
      setChargement(false);
    }
  }, [produitId]);

  useEffect(() => {
    void chargerProduit();
  }, [chargerProduit]);

  // Profil d'équipement détecté
  const profilEquipement: ProfilEquipement | null = React.useMemo(() => {
    if (!produit) return null;
    const catNom = produit.modele?.categorie?.nom || produit.categorie_rel?.nom || produit.categorie;
    const famNom = produit.modele?.categorie?.parent?.parent?.nom || produit.categorie_rel?.parent?.parent?.nom || "";
    return determinerProfilEquipement(catNom, famNom);
  }, [produit]);

  // Liste des attributs techniques renseignés
  const specsAffichees = React.useMemo(() => {
    if (!produit) return [];
    const attrSource = produit.modele?.attributs || {};
    const entries: { cle: string; label: string; valeur: string; unite?: string }[] = [];

    if (profilEquipement) {
      for (const def of profilEquipement.attributs) {
        const val = attrSource[def.cle];
        if (val !== undefined && val !== null && val !== "") {
          entries.push({
            cle: def.cle,
            label: def.label,
            valeur: typeof val === "boolean" ? (val ? "Oui" : "Non") : String(val),
            unite: def.unite,
          });
        }
      }
    } else {
      // Fallback si pas de profil strict
      for (const [k, v] of Object.entries(attrSource)) {
        if (v !== undefined && v !== null && v !== "") {
          entries.push({
            cle: k,
            label: k.replace(/_/g, " ").toUpperCase(),
            valeur: typeof v === "boolean" ? (v ? "Oui" : "Non") : String(v),
          });
        }
      }
    }

    return entries;
  }, [produit, profilEquipement]);

  // Calcul du stock disponible (non vendu, non au rebut)
  const stockDisponible = React.useMemo(() => {
    if (!produit?.exemplaires) return 0;
    return produit.exemplaires.filter((e) => e.statut !== "vendu" && !e.a_jeter).length;
  }, [produit]);

  const stockEnVitrine = React.useMemo(() => {
    if (!produit?.exemplaires) return 0;
    return produit.exemplaires.filter((e) => e.en_vitrine && e.statut !== "vendu").length;
  }, [produit]);

  // Basculer la vitrine pour une unité
  const basculerVitrineUnite = async (uniteId: number, enVitrine: boolean) => {
    try {
      const res = await fetch(`/api/produits/${uniteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ en_vitrine: enVitrine }),
      });
      if (!res.ok) throw new Error("Erreur de modification");
      afficher(enVitrine ? "Exposé en vitrine" : "Retiré de la vitrine", "succes");
      void chargerProduit();
    } catch {
      afficher("Erreur lors de la mise en vitrine", "erreur");
    }
  };

  // Basculer statut À jeter / HS
  const basculerRebutUnite = async (uniteId: number, aJeter: boolean) => {
    try {
      const res = await fetch(`/api/produits/${uniteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          a_jeter: aJeter,
          statut: aJeter ? "hs" : "recu"
        }),
      });
      if (!res.ok) throw new Error("Erreur de modification");
      afficher(aJeter ? "Unité mise au rebut" : "Unité réactivée", "succes");
      void chargerProduit();
    } catch {
      afficher("Erreur lors de la mise au rebut", "erreur");
    }
  };

  // Supprimer une unité physique
  const supprimerUnite = async (uniteId: number, codeInterne: string) => {
    if (!confirm(`Confirmer la suppression définitive de l'exemplaire ${codeInterne} ?`)) return;
    try {
      const res = await fetch(`/api/produits/${uniteId}`, { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur de suppression");
      }
      afficher(`Exemplaire ${codeInterne} supprimé`, "succes");
      if (uniteId === produitId && produit?.exemplaires && produit.exemplaires.length > 1) {
        // Rediriger vers un autre exemplaire du modèle
        const autre = produit.exemplaires.find((e) => e.id !== uniteId);
        if (autre) router.push(`/produits/${autre.id}`);
        else router.push("/inventaire");
      } else {
        void chargerProduit();
      }
    } catch (err: any) {
      afficher(err.message || "Erreur de suppression", "erreur");
    }
  };

  // Ouvrir la modal d'édition d'une unité
  const ouvrirModaleEditUnite = (unite: ExemplairePhysique) => {
    setModalEditUnite(unite);
    setEditSn(unite.numero_serie || "");
    setEditGrade(unite.grade || "Grade A");
    setEditEmplacement(unite.en_vitrine ? "vitrine" : (unite.emplacement as any) || "reserve");
    setEditPrixVente(unite.prix_vente_fixe ? String(unite.prix_vente_fixe) : "");
  };

  // Sauvegarder la modification d'une unité
  const sauvegarderEditUnite = async () => {
    if (!modalEditUnite) return;
    setEnvoiUnite(true);
    try {
      const res = await fetch(`/api/produits/${modalEditUnite.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numero_serie: editSn.trim() || null,
          grade: editGrade,
          emplacement: editEmplacement,
          en_vitrine: editEmplacement === "vitrine",
          prix_vente_fixe: editPrixVente ? Number(editPrixVente) : null,
        }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur de modification");
      }
      afficher("Exemplaire mis à jour", "succes");
      setModalEditUnite(null);
      void chargerProduit();
    } catch (err: any) {
      afficher(err.message || "Erreur", "erreur");
    } finally {
      setEnvoiUnite(false);
    }
  };

  // Ajouter une intervention SAV
  const ajouterReparation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!descReparation.trim()) return;
    setEnvoiReparation(true);
    try {
      const res = await fetch(`/api/produits/${produitId}/reparations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cout: Number(coutReparation) || 0,
          description: descReparation.trim(),
        }),
      });
      if (!res.ok) throw new Error("Erreur");
      afficher("Intervention d'atelier enregistrée", "succes");
      setModalReparation(false);
      setCoutReparation("");
      setDescReparation("");
      void chargerProduit();
    } catch {
      afficher("Erreur lors de l'enregistrement de l'intervention", "erreur");
    } finally {
      setEnvoiReparation(false);
    }
  };

  if (chargement) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-8 h-8 text-brand-orange animate-spin" />
        <p className="text-xs font-bold text-brand-warm-grey">Chargement du dashboard produit...</p>
      </div>
    );
  }

  if (erreur || !produit) {
    return (
      <div className="p-8 max-w-xl mx-auto my-12 text-center rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey dark:border-white/10 space-y-4 shadow-sm">
        <AlertCircle className="w-12 h-12 text-danger mx-auto" />
        <h2 className="text-lg font-black text-brand-black dark:text-white">Fiche Produit Introuvable</h2>
        <p className="text-xs text-brand-warm-grey">{erreur || "Cet équipement n'existe pas ou a été supprimé."}</p>
        <Link href="/inventaire" className="btn btn-primaire text-xs px-6 py-2.5 rounded-xl font-bold inline-block">
          Retour à l'inventaire
        </Link>
      </div>
    );
  }

  const nomCommercial = produit.modele?.nom || produit.reference;
  const cheminHierarchie: string[] = [
    produit.modele?.categorie?.parent?.parent?.nom || produit.categorie_rel?.parent?.parent?.nom,
    produit.modele?.categorie?.parent?.nom || produit.categorie_rel?.parent?.nom,
    produit.modele?.categorie?.nom || produit.categorie_rel?.nom || produit.categorie,
  ].filter((n): n is string => Boolean(n));

  return (
    <div className="space-y-6 animate-entree max-w-7xl mx-auto pb-12">
      
      {/* 1. Breadcrumb de Navigation & Bouton Retour */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 overflow-x-auto py-1">
          <Link href="/inventaire" className="hover:text-brand-orange transition-colors flex items-center gap-1 shrink-0 text-slate-600">
            <ArrowLeft className="w-3.5 h-3.5" /> Inventaire
          </Link>
          {cheminHierarchie.map((niveau, idx) => (
            <React.Fragment key={niveau}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <Link
                href={`/inventaire?categorie=${encodeURIComponent(niveau)}`}
                className={`shrink-0 hover:text-brand-orange transition-colors ${
                  idx === cheminHierarchie.length - 1 ? "text-slate-900 font-extrabold" : "text-slate-500"
                }`}
              >
                {niveau}
              </Link>
            </React.Fragment>
          ))}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300">
            SKU #{produit.code_interne}
          </span>
        </div>
      </div>

      {/* 2. En-tête B2B : Dashboard Produit (Header) */}
      <div className="p-6 rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          
          {/* Titre & Badges */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-brand-orange bg-brand-orange/10 px-2.5 py-0.5 rounded-full">
                {cheminHierarchie[0] || "Équipement"}
              </span>

              {profilEquipement && (
                <span className="text-[11px] font-bold text-brand-warm-grey bg-brand-light-grey/40 dark:bg-white/5 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-brand-orange" />
                  {profilEquipement.familleNom}
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black font-outfit text-brand-black dark:text-white leading-tight">
              {nomCommercial}
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              {/* Badge Stock Global Disponible */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 font-extrabold text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>{stockDisponible} unité{stockDisponible > 1 ? "s" : ""} en stock</span>
              </div>

              {stockEnVitrine > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-brand-orange/15 text-brand-orange font-bold text-xs">
                  <Store className="w-3.5 h-3.5" />
                  <span>{stockEnVitrine} en vitrine</span>
                </div>
              )}

              {produit.jours_stock > 0 && (
                <span className="text-xs text-brand-warm-grey flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5" /> {produit.jours_stock} jours en stock
                </span>
              )}
            </div>
          </div>

          {/* Boutons d'Action Rapide B2B */}
          <div className="flex flex-wrap items-center gap-2.5 lg:self-center shrink-0">
            
            {/* Vente Directe & Facturation (POS) */}
            {peutModifier && stockDisponible > 0 && (
              <button
                type="button"
                onClick={() => setModalVenteDirecte(true)}
                className="btn bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-2.5 px-4 rounded-md font-black shadow-md flex items-center gap-2"
              >
                <ShoppingBag className="w-4 h-4" />
                Vendre / Facturer
              </button>
            )}

            {/* Ajouter du Stock (Scanner-First) */}
            {peutModifier && (
              <button
                type="button"
                onClick={() => setModalArrivage(true)}
                className="btn btn-primaire text-xs py-2.5 px-4 rounded-md font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
              >
                <PackagePlus className="w-4 h-4" />
                Ajouter Stock
              </button>
            )}

            {/* Imprimer Étiquettes */}
            <BoutonImpression
              ids={produit.exemplaires?.map((e) => e.id) || [produit.id]}
              dejaImprimee={produit.etiquette_imprimee}
              texte="Étiquettes"
              className="btn btn-secondaire text-xs py-2.5 px-3.5 rounded-md font-bold flex items-center gap-1.5"
            />

            {/* Modifier le Modèle */}
            {peutModifier && (
              <button
                type="button"
                onClick={() => setModalEditModele(true)}
                className="btn btn-secondaire text-xs py-2.5 px-3.5 rounded-md font-bold flex items-center gap-1.5"
              >
                <Edit3 className="w-4 h-4" />
                Modèle
              </button>
            )}

            {/* Classer */}
            {peutModifier && (
              <button
                type="button"
                onClick={() => setModalClassification(true)}
                className="btn btn-secondaire text-xs py-2.5 px-3 rounded-md font-bold"
                title="Modifier la classification"
              >
                <Archive className="w-4 h-4" />
              </button>
            )}

          </div>

        </div>
      </div>

      {/* 3. Layout à 2 Colonnes : Dashboard Technique & Stock Physique */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ===================== COLONNE GAUCHE (Spécifications Techniques) ===================== */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Fiche Technique & Attributs Spécifiques */}
          <div className="p-6 rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs space-y-5">
            
            <div className="flex items-center justify-between border-b border-brand-light-grey/60 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-brand-orange" />
                <h3 className="text-sm font-black font-outfit text-brand-black dark:text-white uppercase tracking-wider">
                  Spécifications Techniques
                </h3>
              </div>

              {peutModifier && (
                <button
                  type="button"
                  onClick={() => setModalEditModele(true)}
                  className="text-xs font-bold text-brand-orange hover:underline flex items-center gap-1"
                >
                  <Edit3 className="w-3 h-3" /> Éditer specs
                </button>
              )}
            </div>

            {/* Liste de Définition (<dl>) des Caractéristiques Remplies */}
            {specsAffichees.length === 0 ? (
              <div className="p-4 text-center rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 text-brand-warm-grey text-xs">
                Aucune caractéristique technique détaillée n'est renseignée pour ce modèle.
                {peutModifier && (
                  <button
                    type="button"
                    onClick={() => setModalEditModele(true)}
                    className="block text-brand-orange font-bold mt-1.5 mx-auto hover:underline"
                  >
                    + Ajouter les spécifications maintenant
                  </button>
                )}
              </div>
            ) : (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {specsAffichees.map((spec) => (
                  <div 
                    key={spec.cle}
                    className="p-3 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/5 space-y-1"
                  >
                    <dt className="text-[10px] font-extrabold uppercase tracking-wider text-brand-warm-grey">
                      {spec.label}
                    </dt>
                    <dd className="font-black text-brand-black dark:text-white text-sm">
                      {spec.valeur} {spec.unite && <span className="text-xs font-normal opacity-70">{spec.unite}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {/* Bloc Financier & Tarification de Référence */}
            <div className="p-4 rounded-2xl bg-brand-glow/20 dark:bg-white/5 border border-brand-orange/20 space-y-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-brand-orange">
                Tarification & Rentabilité
              </div>

              <div className="grid grid-cols-2 gap-3">
                {!["vendeur"].includes(role) && (
                  <div>
                    <span className="block text-[10px] font-bold text-brand-warm-grey uppercase">Prix Achat Moyen</span>
                    <span className="text-base font-black text-brand-black dark:text-white">
                      {formaterDA(produit.prix_achat)}
                    </span>
                  </div>
                )}

                <div>
                  <span className="block text-[10px] font-bold text-brand-orange uppercase">Prix Vente Conseillé</span>
                  <span className="text-base font-black text-brand-orange">
                    {produit.prix_vente_fixe !== null ? formaterDA(produit.prix_vente_fixe) : (produit.modele?.prix_vente_conseille ? formaterDA(produit.modele.prix_vente_conseille) : "Non fixé")}
                  </span>
                </div>
              </div>
            </div>

            {/* Photos du Modèle */}
            {produit.images && produit.images.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-brand-light-grey/60 dark:border-white/10">
                <span className="text-xs font-black uppercase tracking-wider text-brand-warm-grey">
                  Galerie Visuelle ({produit.images.length})
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {produit.images.map((imgUrl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setIndexVisionneuse(idx)}
                      className="relative aspect-square rounded-xl overflow-hidden border border-brand-light-grey/80 dark:border-white/10 group hover:opacity-90 transition-opacity"
                    >
                      <img 
                        src={imgUrl} 
                        alt={`${nomCommercial} - Photo ${idx + 1}`} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform" 
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Informations du Lot / Arrivage d'origine */}
            {produit.lot && (
              <div className="p-3.5 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/5 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-brand-warm-grey block">Arrivage / Conteneur</span>
                  <Link href={`/lots/${produit.lot.id}`} className="font-extrabold text-brand-orange hover:underline">
                    Lot #{produit.lot.id} - {produit.lot.fournisseur}
                  </Link>
                </div>
                <span className="text-brand-warm-grey font-medium">
                  {new Date(produit.lot.date_entree).toLocaleDateString("fr-FR")}
                </span>
              </div>
            )}

          </div>

        </div>

        {/* ===================== COLONNE DROITE (Stock Physique & Exemplaires) ===================== */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="p-6 rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs space-y-4">
            
            {/* Onglets de la colonne droite */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-light-grey/60 dark:border-white/10 pb-3">
              
              <div className="flex items-center gap-1 bg-brand-light-grey/30 dark:bg-white/5 p-1 rounded-2xl border border-brand-light-grey/60 dark:border-white/10">
                <button
                  type="button"
                  onClick={() => setOngletActif("exemplaires")}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
                    ongletActif === "exemplaires"
                      ? "bg-white dark:bg-brand-paper text-brand-black dark:text-white shadow-xs"
                      : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                  }`}
                >
                  <Barcode className="w-3.5 h-3.5 text-brand-orange" />
                  Exemplaires ({produit.exemplaires?.length || 1})
                </button>

                <button
                  type="button"
                  onClick={() => setOngletActif("atelier")}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
                    ongletActif === "atelier"
                      ? "bg-white dark:bg-brand-paper text-brand-black dark:text-white shadow-xs"
                      : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-brand-orange" />
                  Atelier SAV ({produit.reparations?.length || 0})
                </button>

                <button
                  type="button"
                  onClick={() => setOngletActif("historique")}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
                    ongletActif === "historique"
                      ? "bg-white dark:bg-brand-paper text-brand-black dark:text-white shadow-xs"
                      : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-brand-orange" />
                  Historique
                </button>

                <button
                  type="button"
                  onClick={() => setOngletActif("ventes")}
                  className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-black transition-all ${
                    ongletActif === "ventes"
                      ? "bg-white dark:bg-brand-paper text-brand-black dark:text-white shadow-xs"
                      : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
                  }`}
                >
                  <ShoppingBag className="w-3.5 h-3.5 text-brand-orange" />
                  Ventes ({produit.ventes?.length || 0})
                </button>
              </div>

              {ongletActif === "exemplaires" && peutModifier && (
                <button
                  type="button"
                  onClick={() => setModalArrivage(true)}
                  className="btn btn-primaire text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Réceptionner
                </button>
              )}

              {ongletActif === "atelier" && peutModifier && (
                <button
                  type="button"
                  onClick={() => setModalReparation(true)}
                  className="btn btn-primaire text-xs py-1.5 px-3 rounded-xl font-bold flex items-center gap-1.5"
                >
                  <Wrench className="w-3.5 h-3.5" /> Nouvelle intervention
                </button>
              )}

            </div>

            {/* ==================== ONGLET 1 : DATA TABLE DES EXEMPLAIRES ==================== */}
            {ongletActif === "exemplaires" && (
              <div className="space-y-3 animate-entree">
                
                <div className="border border-brand-light-grey/80 dark:border-white/10 rounded-2xl overflow-hidden shadow-xs">
                  <div className="w-full overflow-x-auto">
                    <table className="w-full min-w-[700px] text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-brand-light-grey/30 dark:bg-white/5 border-b border-brand-light-grey/60 dark:border-white/10 text-brand-warm-grey font-black uppercase text-[10px] tracking-wider">
                          <th className="py-3 px-3.5">Code SKU</th>
                          <th className="py-3 px-3.5">Numéro de Série (S/N)</th>
                          <th className="py-3 px-3.5">Grade</th>
                          <th className="py-3 px-3.5">Emplacement</th>
                          <th className="py-3 px-3.5 text-right">Prix Vente</th>
                          <th className="py-3 px-3.5 text-center">Statut</th>
                          <th className="py-3 px-3.5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-light-grey/30 dark:divide-white/5 font-medium">
                        {(produit.exemplaires || []).map((unite) => {
                          const gradeInfo = GRADES_LABELS[unite.grade || "Grade A"] || { label: unite.grade || "Standard", badge: "bg-zinc-100 text-zinc-700" };
                          const estActuel = unite.id === produit.id;

                          return (
                            <tr 
                              key={unite.id}
                              className={`hover:bg-brand-light-grey/15 dark:hover:bg-white/2 transition-colors ${
                                estActuel ? "bg-brand-orange/5 dark:bg-brand-orange/10 font-bold" : ""
                              }`}
                            >
                              {/* Code Interne SKU */}
                              <td className="py-3 px-3.5 font-mono font-bold text-brand-black dark:text-white whitespace-nowrap">
                                <div className="flex items-center gap-1.5">
                                  <span>{unite.code_interne}</span>
                                  {estActuel && (
                                    <span className="text-[9px] font-black uppercase text-brand-orange bg-brand-orange/15 px-1.5 py-0.2 rounded">
                                      Actuel
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Numéro de Série */}
                              <td className="py-3 px-3.5 font-mono font-black text-brand-black dark:text-white whitespace-nowrap">
                                {unite.numero_serie ? (
                                  <span className="bg-brand-light-grey/40 dark:bg-white/10 px-2 py-0.5 rounded-md border border-brand-light-grey/80 dark:border-white/10">
                                    {unite.numero_serie}
                                  </span>
                                ) : (
                                  <span className="text-brand-warm-grey font-sans text-[11px] italic">Non renseigné</span>
                                )}
                              </td>

                              {/* Grade */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold border ${gradeInfo.badge}`}>
                                  {gradeInfo.label}
                                </span>
                              </td>

                              {/* Emplacement */}
                              <td className="py-3 px-3.5 whitespace-nowrap">
                                {unite.en_vitrine ? (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-lg">
                                    <Store className="w-3 h-3" /> Vitrine
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-warm-grey bg-brand-light-grey/30 dark:bg-white/5 px-2 py-0.5 rounded-lg">
                                    <Warehouse className="w-3 h-3" /> Réserve
                                  </span>
                                )}
                              </td>

                              {/* Prix Vente */}
                              <td className="py-3 px-3.5 text-right font-extrabold text-brand-orange whitespace-nowrap">
                                {unite.prix_vente_fixe !== null ? formaterDA(unite.prix_vente_fixe) : "—"}
                              </td>

                              {/* Statut avec State Machine Interactive */}
                              <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                <SelecteurStatutProduit
                                  produitId={unite.id}
                                  statutActuel={unite.statut}
                                  peutModifier={peutModifier}
                                  onStatutChange={() => void chargerProduit()}
                                  taille="sm"
                                />
                              </td>

                              {/* Actions Unitaires */}
                              <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1">
                                  
                                  {peutModifier && unite.statut !== "vendu" && (
                                    <button
                                      type="button"
                                      onClick={() => basculerVitrineUnite(unite.id, !unite.en_vitrine)}
                                      className={`p-1.5 rounded-lg transition-colors ${
                                        unite.en_vitrine
                                          ? "text-brand-orange bg-brand-orange/10"
                                          : "text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-orange"
                                      }`}
                                      title={unite.en_vitrine ? "Retirer de la vitrine" : "Mettre en vitrine"}
                                    >
                                      <Store className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  <BoutonImpression
                                    ids={[unite.id]}
                                    dejaImprimee={unite.etiquette_imprimee}
                                    className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
                                  />

                                  {peutModifier && (
                                    <button
                                      type="button"
                                      onClick={() => ouvrirModaleEditUnite(unite)}
                                      className="p-1.5 rounded-lg text-brand-warm-grey hover:bg-brand-light-grey/40 dark:hover:bg-white/10 hover:text-brand-black dark:hover:text-white transition-colors"
                                      title="Modifier cet exemplaire"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {peutModifier && (
                                    <button
                                      type="button"
                                      onClick={() => supprimerUnite(unite.id, unite.code_interne)}
                                      className="p-1.5 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition-colors"
                                      title="Supprimer cet exemplaire"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                </div>
                              </td>

                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ==================== ONGLET 2 : ATELIER SAV & RÉPARATIONS ==================== */}
            {ongletActif === "atelier" && (
              <div className="space-y-4 animate-entree">
                {produit.reparations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl bg-brand-light-grey/10 dark:bg-white/2 border border-brand-light-grey/60 dark:border-white/10 text-brand-warm-grey space-y-2">
                    <Wrench className="w-8 h-8 mx-auto opacity-30 text-brand-orange" />
                    <p className="text-xs font-bold">Aucune intervention d'atelier enregistrée</p>
                    {peutModifier && (
                      <button
                        type="button"
                        onClick={() => setModalReparation(true)}
                        className="btn btn-secondaire text-xs mt-1"
                      >
                        + Ajouter une réparation / pièce
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {produit.reparations.map((rep) => (
                      <div
                        key={rep.id}
                        className="p-4 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10 flex items-start justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-brand-black dark:text-white">
                              {rep.description}
                            </span>
                            <span className="text-[10px] font-bold text-brand-warm-grey bg-brand-light-grey/40 dark:bg-white/10 px-2 py-0.5 rounded-full">
                              Par {rep.par}
                            </span>
                          </div>
                          <div className="text-[11px] text-brand-warm-grey flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(rep.date).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        <div className="text-right font-black text-brand-orange text-sm shrink-0">
                          +{formaterDA(rep.cout)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ONGLET 3 : HISTORIQUE DES STATUTS ==================== */}
            {ongletActif === "historique" && (
              <div className="space-y-3 animate-entree">
                {produit.historique.length === 0 ? (
                  <div className="p-8 text-center text-xs text-brand-warm-grey">
                    Aucun historique enregistré.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {produit.historique.map((h) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-2xl bg-brand-light-grey/20 dark:bg-white/5 border border-brand-light-grey/40 dark:border-white/5 flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <BadgeStatut statut={h.statut_apres} />
                          {h.note && (
                            <span className="text-brand-warm-grey text-[11px]">« {h.note} »</span>
                          )}
                        </div>
                        <div className="text-right text-[11px] text-brand-warm-grey">
                          <span className="font-bold text-brand-black dark:text-white">{h.par}</span> · {new Date(h.quand).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ONGLET 4 : VENTES PASSÉES ==================== */}
            {ongletActif === "ventes" && (
              <div className="space-y-3 animate-entree">
                {produit.ventes.length === 0 ? (
                  <div className="p-8 text-center text-xs text-brand-warm-grey">
                    Aucune vente enregistrée pour cet exemplaire.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {produit.ventes.map((v) => (
                      <div
                        key={v.id}
                        className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                            Vendu par {v.vendeur} {v.canal ? `via ${v.canal}` : ""}
                          </div>
                          <div className="text-[11px] text-emerald-600 dark:text-emerald-400">
                            {new Date(v.date_vente).toLocaleDateString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </div>

                        <div className="text-base font-black text-emerald-700 dark:text-emerald-300">
                          {formaterDA(v.prix_vente_reel)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

      </div>

      {/* MODALE : Réception & Arrivage Rapide (Scanner-First) */}
      <ModaleArrivageRapide
        ouvert={modalArrivage}
        onFermer={() => setModalArrivage(false)}
        onSucces={() => {
          afficher("Exemplaires ajoutés avec succès", "succes");
          void chargerProduit();
        }}
        modeleId={produit.modele_id}
        modeleNom={nomCommercial}
        categorieId={produit.categorie_id}
        prixAchatDefaut={produit.prix_achat}
        prixVenteDefaut={produit.prix_vente_fixe || produit.modele?.prix_vente_conseille}
        lots={produit.lot ? [produit.lot] : []}
      />

      {/* MODALE : Édition du Modèle & Spécifications */}
      <FormulaireModele
        ouvert={modalEditModele}
        onFermer={() => setModalEditModele(false)}
        onSucces={() => {
          afficher("Modèle mis à jour avec succès", "succes");
          void chargerProduit();
        }}
        modeleId={produit.modele_id}
        modeleInitial={produit.modele ? {
          id: produit.modele.id,
          nom: produit.modele.nom,
          categorie_id: produit.modele.categorie?.id || produit.categorie_id || 1,
          image_url: produit.modele.image_url,
          description: produit.modele.description,
          prix_vente_conseille: produit.modele.prix_vente_conseille,
          attributs: produit.modele.attributs,
        } : {
          nom: produit.reference,
          categorie_id: produit.categorie_id || 1,
          prix_vente_conseille: produit.prix_vente_fixe,
        }}
      />

      {/* MODALE : Modification d'une unité spécifique */}
      {modalEditUnite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-entree">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-900">
            
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black font-outfit text-slate-900">
                Modifier l&apos;Exemplaire #{modalEditUnite.code_interne}
              </h3>
              <button
                type="button"
                onClick={() => setModalEditUnite(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Numéro de Série (S/N)
                </label>
                <input
                  type="text"
                  value={editSn}
                  onChange={(e) => setEditSn(e.target.value)}
                  placeholder="Numéro de série fabricant..."
                  className="input w-full font-mono font-bold h-10 rounded-xl bg-white border border-slate-200 text-slate-900 focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Grade / État cosmétique
                </label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="select w-full font-bold h-10 rounded-xl bg-white border border-slate-200 text-slate-900"
                >
                  {Object.keys(GRADES_LABELS).map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Emplacement physique
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditEmplacement("reserve")}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      editEmplacement === "reserve"
                        ? "bg-slate-900 text-white border-transparent shadow-xs"
                        : "border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    <Warehouse className="w-3.5 h-3.5" /> Réserve
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditEmplacement("vitrine")}
                    className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 border transition-all ${
                      editEmplacement === "vitrine"
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "border-slate-200 text-slate-600 bg-white"
                    }`}
                  >
                    <Store className="w-3.5 h-3.5" /> Vitrine
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Prix de vente spécifique (DA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editPrixVente}
                  onChange={(e) => setEditPrixVente(e.target.value)}
                  placeholder="Laisser vide pour utiliser le prix standard"
                  className="input w-full font-bold h-10 rounded-xl bg-white border border-slate-200 text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalEditUnite(null)}
                className="btn btn-secondaire text-xs py-2 px-4 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={sauvegarderEditUnite}
                disabled={envoiUnite}
                className="btn btn-primaire text-xs py-2 px-5 rounded-xl font-black"
              >
                {envoiUnite ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODALE : Nouvelle réparation SAV */}
      {modalReparation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-entree">
          <form onSubmit={ajouterReparation} className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 space-y-4 text-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black font-outfit text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-brand-orange" />
                Intervention Atelier & SAV
              </h3>
              <button
                type="button"
                onClick={() => setModalReparation(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Description de l&apos;intervention / Pièce changée *
                </label>
                <input
                  type="text"
                  required
                  value={descReparation}
                  onChange={(e) => setDescReparation(e.target.value)}
                  placeholder="Ex: Remplacement pâte thermique + ventilateur..."
                  className="input w-full font-bold h-10 rounded-xl bg-white border border-slate-200 text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-600 mb-1">
                  Coût de l&apos;intervention (DA)
                </label>
                <input
                  type="number"
                  min="0"
                  value={coutReparation}
                  onChange={(e) => setCoutReparation(e.target.value)}
                  placeholder="0 DA"
                  className="input w-full font-bold h-10 rounded-xl bg-white border border-slate-200 text-slate-900"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalReparation(false)}
                className="btn btn-secondaire text-xs py-2 px-4 rounded-xl font-bold"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={envoiReparation}
                className="btn btn-primaire text-xs py-2 px-5 rounded-xl font-black"
              >
                {envoiReparation ? "Enregistrement..." : "Ajouter à l'atelier"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODALE : Classification */}
      {modalClassification && (
        <ModalClassification
          produits={produit.exemplaires?.map((e: any) => ({ ...e, categorie_id: produit.categorie_id, reference: nomCommercial, categorie: produit.categorie })) || [produit as any]}
          ouverte={modalClassification}
          onFermer={() => setModalClassification(false)}
          onSucces={() => {
            setModalClassification(false);
            void chargerProduit();
          }}
        />
      )}

      {/* MODALE : Visionneuse plein écran de photos */}
      {indexVisionneuse !== null && produit.images && produit.images.length > 0 && (
        <VisionneusePhotos
          photos={produit.images}
          index={indexVisionneuse}
          onFermer={() => setIndexVisionneuse(null)}
          onNaviguer={(nouvelIndex) => setIndexVisionneuse(nouvelIndex)}
          titre={nomCommercial}
        />
      )}

      {/* MODALE : Vente Directe & Facturation */}
      {modalVenteDirecte && produit && (
        <ModaleVente
          ouverte={modalVenteDirecte}
          unites={(produit.exemplaires || [produit as any])
            .filter((e) => e.statut !== "vendu" && e.statut !== "hs")
            .map((e) => ({
              id: e.id,
              code_interne: e.code_interne,
              reference: nomCommercial,
              numero_serie: e.numero_serie,
              grade: e.grade,
              prix_achat: e.prix_achat,
              prix_vente_fixe: e.prix_vente_fixe,
              prix_vente_reel: e.prix_vente_reel,
              etiquette_imprimee: e.etiquette_imprimee,
              statut: e.statut,
            }))}
          onFermer={() => setModalVenteDirecte(false)}
          onSucces={() => {
            setModalVenteDirecte(false);
            void chargerProduit();
          }}
        />
      )}

    </div>
  );
}
