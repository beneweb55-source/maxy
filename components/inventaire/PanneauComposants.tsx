"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useConfirmation } from "@/hooks/useConfirmation";
import ConfirmerAction from "@/components/ConfirmerAction";
import {
  Cpu,
  HardDrive,
  Plus,
  Trash2,
  Search,
  Layers,
  AlertCircle,
  CheckCircle2,
  Boxes,
  Coins,
  Clock,
  ArrowRightLeft,
  Wrench,
  Settings,
  List,
  History,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";

// ═══════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════

interface ComposantInstalle {
  id: number;
  produit: {
    id: number;
    code_interne: string;
    reference: string;
    categorie: string;
    numero_serie: string | null;
    grade: string | null;
    statut: string;
    prix_achat: number | null;
    image_url: string | null;
    modele: { id: number; nom: string; categorie_id: number | null } | null;
  };
  slot_definition: {
    id: number;
    label: string;
    type_composant: string;
    quantite: number;
    obligatoire: boolean;
    attributs_requis: any;
  } | null;
  installed_at: string;
  removed_at: string | null;
}

interface SlotDefinition {
  id: number;
  label: string;
  type_composant: string;
  quantite: number;
  obligatoire: boolean;
  attributs_requis: any;
  _count: { installed_components: number };
}

interface HistoriqueOperation {
  id: number;
  action: string;
  note: string | null;
  composant_remplace_id: number | null;
  created_at: string;
  produit: { id: number; code_interne: string; reference: string };
  produit_parent: { id: number; code_interne: string; reference: string } | null;
  user: { username: string };
}

interface StatsComposants {
  nb_composants: number;
  cout_total: number;
  par_categorie: Record<string, number>;
}

interface PanneauComposantsProps {
  produitId: number;
  peutModifier: boolean;
  onMiseAJour?: () => void;
}

type Onglet = "installes" | "template" | "historique";

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

const ICONES_CATEGORIE: Record<string, React.ReactNode> = {
  RAM: <Cpu className="w-4 h-4" />,
  SSD: <HardDrive className="w-4 h-4" />,
  "Disque Dur": <HardDrive className="w-4 h-4" />,
  CPU: <Cpu className="w-4 h-4" />,
  GPU: <Cpu className="w-4 h-4" />,
  Alimentation: <Wrench className="w-4 h-4" />,
};

function getIconeCategorie(categorie: string): React.ReactNode {
  const catUpper = categorie.toUpperCase();
  for (const [cle, icone] of Object.entries(ICONES_CATEGORIE)) {
    if (catUpper.includes(cle.toUpperCase())) return icone;
  }
  return <Cpu className="w-4 h-4" />;
}

function getLabelAction(action: string): { label: string; color: string; icon: React.ReactNode } {
  switch (action) {
    case "assemblage":
      return { label: "Assemblé", color: "text-emerald-600 bg-emerald-50", icon: <CheckCircle2 className="w-3 h-3" /> };
    case "désassemblage":
      return { label: "Désassemblé", color: "text-amber-600 bg-amber-50", icon: <ArrowRightLeft className="w-3 h-3" /> };
    case "remplacement":
      return { label: "Remplacé", color: "text-blue-600 bg-blue-50", icon: <ArrowRightLeft className="w-3 h-3" /> };
    case "vente_composant":
      return { label: "Vendu", color: "text-purple-600 bg-purple-50", icon: <Coins className="w-3 h-3" /> };
    default:
      return { label: action, color: "text-brand-warm-grey bg-brand-paper", icon: <Clock className="w-3 h-3" /> };
  }
}

// ═══════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ═══════════════════════════════════════════════════════

export default function PanneauComposants({
  produitId,
  peutModifier,
  onMiseAJour,
}: PanneauComposantsProps) {
  const { afficher } = useToast();
  const { confirmer, propsModal } = useConfirmation();

  // State
  const [onglet, setOnglet] = useState<Onglet>("installes");
  const [composants, setComposants] = useState<ComposantInstalle[]>([]);
  const [slots, setSlots] = useState<SlotDefinition[]>([]);
  const [historique, setHistorique] = useState<HistoriqueOperation[]>([]);
  const [stats, setStats] = useState<StatsComposants | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [enAction, setEnAction] = useState(false);

  // Modal d'ajout de composant
  const [modalAjoutOuvert, setModalAjoutOuvert] = useState(false);
  const [recherche, setRecherche] = useState("");
  const [resultatsRecherche, setResultatsRecherche] = useState<any[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [slotCible, setSlotCible] = useState<number | null>(null);

  // Modal de remplacement
  const [modalRemplacementOuvert, setModalRemplacementOuvert] = useState(false);
  const [composantARemplacer, setComposantARemplacer] = useState<ComposantInstalle | null>(null);

  // Modal d'ajout de slot
  const [modalSlotOuvert, setModalSlotOuvert] = useState(false);
  const [slotEnEdition, setSlotEnEdition] = useState<SlotDefinition | null>(null);
  const [nouveauSlot, setNouveauSlot] = useState({
    label: "",
    type_composant: "",
    quantite: 1,
    obligatoire: true,
  });

  // Historique pagination
  const [historiqueOffset, setHistoriqueOffset] = useState(0);
  const [historiqueTotal, setHistoriqueTotal] = useState(0);
  const HISTORIQUE_LIMIT = 15;

  // ═══════════════════════════════════════════════════
  // CHARGEMENT
  // ═══════════════════════════════════════════════════

  const chargerComposants = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants`);
      if (!res.ok) throw new Error("Erreur lors du chargement des composants.");
      const data = await res.json();
      setComposants(data.composants || []);
      setHistorique(data.historique || []);
      setStats(data.stats || null);
    } catch (e: any) {
      setErreur(e?.message || "Impossible de charger la nomenclature.");
    } finally {
      setChargement(false);
    }
  }, [produitId]);

  const chargerSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/produits/${produitId}/slots`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data.slots || []);
      }
    } catch {
      // Silencieux — les slots sont optionnels
    }
  }, [produitId]);

  const chargerHistorique = useCallback(async (offset = 0) => {
    try {
      const params = new URLSearchParams({
        limit: String(HISTORIQUE_LIMIT),
        offset: String(offset),
      });
      const res = await fetch(`/api/produits/${produitId}/historique-composition?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (offset === 0) {
          setHistorique(data.historique || []);
        } else {
          setHistorique((prev) => [...prev, ...(data.historique || [])]);
        }
        setHistoriqueTotal(data.pagination?.total || 0);
      }
    } catch {
      // Silencieux
    }
  }, [produitId]);

  useEffect(() => {
    void chargerComposants();
    void chargerSlots();
  }, [chargerComposants, chargerSlots]);

  useEffect(() => {
    if (onglet === "historique") {
      setHistoriqueOffset(0);
      void chargerHistorique(0);
    }
  }, [onglet, chargerHistorique]);

  // ═══════════════════════════════════════════════════
  // RECHERCHE DE COMPOSANTS DISPONIBLES
  // ═══════════════════════════════════════════════════

  useEffect(() => {
    if (!modalAjoutOuvert) return;

    const timer = setTimeout(async () => {
      setChargementRecherche(true);
      try {
        const params = new URLSearchParams();
        if (recherche.trim()) params.set("q", recherche.trim());
        params.set("limit", "30");
        const res = await fetch(`/api/produits/composants/disponibles?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          const dispo = (data.produits || []).filter((p: any) => p.id !== produitId);
          setResultatsRecherche(dispo);
        }
      } catch {
        // Ignorer
      } finally {
        setChargementRecherche(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [recherche, modalAjoutOuvert, produitId]);

  // ═══════════════════════════════════════════════════
  // ACTIONS
  // ═══════════════════════════════════════════════════

  const attacherComposant = async (composantId: number) => {
    if (enAction) return;
    setEnAction(true);
    try {
      const body: any = { composant_id: composantId };
      if (slotCible) body.slot_definition_id = slotCible;

      const res = await fetch(`/api/produits/${produitId}/composants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'intégration.");

      afficher("Composant intégré au produit assemblé !", "succes");
      fermerModalAjout();
      await chargerComposants();
      await chargerSlots();
      if (onMiseAJour) onMiseAJour();
    } catch (e: any) {
      afficher(e?.message || "Erreur lors de l'intégration.", "erreur");
    } finally {
      setEnAction(false);
    }
  };

  const detacherComposant = async (composantId: number, nom: string) => {
    const ok = await confirmer({
      titre: "Détacher le composant",
      message: `Détacher « ${nom} » ? Le composant sera remis en stock.`,
      labelConfirmer: "Détacher",
      variante: "warning",
    });
    if (!ok) return;
    if (enAction) return;
    setEnAction(true);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ composant_id: composantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du retrait.");

      afficher("Composant retiré et remis en stock.", "succes");
      await chargerComposants();
      await chargerSlots();
      if (onMiseAJour) onMiseAJour();
    } catch (e: any) {
      afficher(e?.message || "Erreur lors du retrait.", "erreur");
    } finally {
      setEnAction(false);
    }
  };

  const remplacerComposant = async (nouveauComposantId: number) => {
    if (!composantARemplacer || enAction) return;
    setEnAction(true);
    try {
      const res = await fetch(`/api/produits/${produitId}/composants/remplacer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ancien_composant_id: composantARemplacer.produit.id,
          nouveau_composant_id: nouveauComposantId,
          motif: "Remplacement manuel",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors du remplacement.");

      afficher("Composant remplacé avec succès !", "succes");
      fermerModalRemplacement();
      await chargerComposants();
      await chargerSlots();
      if (onMiseAJour) onMiseAJour();
    } catch (e: any) {
      afficher(e?.message || "Erreur lors du remplacement.", "erreur");
    } finally {
      setEnAction(false);
    }
  };

  // Slots CRUD
  const sauvegarderSlot = async () => {
    if (!nouveauSlot.label.trim() || !nouveauSlot.type_composant.trim()) {
      afficher("Le nom et le type de composant sont requis.", "erreur");
      return;
    }
    try {
      const isEdit = !!slotEnEdition;
      const url = `/api/produits/${produitId}/slots`;
      const method = isEdit ? "PUT" : "POST";
      const body = isEdit
        ? { slot_id: slotEnEdition.id, ...nouveauSlot }
        : nouveauSlot;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur.");

      afficher(isEdit ? "Slot modifié." : "Slot ajouté.", "succes");
      fermerModalSlot();
      await chargerSlots();
    } catch (e: any) {
      afficher(e?.message || "Erreur.", "erreur");
    }
  };

  const supprimerSlot = async (slot: SlotDefinition) => {
    if (slot._count.installed_components > 0) {
      afficher("Retirez d'abord les composants de ce slot.", "erreur");
      return;
    }
    const ok = await confirmer({
      titre: "Supprimer le slot",
      message: `Supprimer le slot « ${slot.label} » ?`,
      labelConfirmer: "Supprimer",
      variante: "danger",
    });
    if (!ok) return;
    try {
      const res = await fetch(`/api/produits/${produitId}/slots`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_id: slot.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur.");
      }
      afficher("Slot supprimé.", "succes");
      await chargerSlots();
    } catch (e: any) {
      afficher(e?.message || "Erreur.", "erreur");
    }
  };

  // ═══════════════════════════════════════════════════
  // FERMETURE MODALES
  // ═══════════════════════════════════════════════════

  const fermerModalAjout = () => {
    setModalAjoutOuvert(false);
    setRecherche("");
    setResultatsRecherche([]);
    setSlotCible(null);
  };

  const ouvrirRemplacement = (composant: ComposantInstalle) => {
    setComposantARemplacer(composant);
    setModalRemplacementOuvert(true);
  };

  const fermerModalRemplacement = () => {
    setModalRemplacementOuvert(false);
    setComposantARemplacer(null);
    setRecherche("");
    setResultatsRecherche([]);
  };

  const ouvrirModalSlot = (slot?: SlotDefinition) => {
    if (slot) {
      setSlotEnEdition(slot);
      setNouveauSlot({
        label: slot.label,
        type_composant: slot.type_composant,
        quantite: slot.quantite,
        obligatoire: slot.obligatoire,
      });
    } else {
      setSlotEnEdition(null);
      setNouveauSlot({ label: "", type_composant: "", quantite: 1, obligatoire: true });
    }
    setModalSlotOuvert(true);
  };

  const fermerModalSlot = () => {
    setModalSlotOuvert(false);
    setSlotEnEdition(null);
    setNouveauSlot({ label: "", type_composant: "", quantite: 1, obligatoire: true });
  };

  // ═══════════════════════════════════════════════════
  // ONGLETS
  // ═══════════════════════════════════════════════════

  const ONGLETS: { cle: Onglet; label: string; icone: React.ReactNode }[] = [
    { cle: "installes", label: "Installés", icone: <List className="w-3.5 h-3.5" /> },
    { cle: "template", label: "Template", icone: <Settings className="w-3.5 h-3.5" /> },
    { cle: "historique", label: "Historique", icone: <History className="w-3.5 h-3.5" /> },
  ];

  // ═══════════════════════════════════════════════════
  // RENDU
  // ═══════════════════════════════════════════════════

  return (
    <div className="space-y-4 animate-entree">
      <ConfirmerAction {...propsModal} />

      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-brand-light-grey/25 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-orange" />
            <h4 className="text-sm font-black font-outfit text-brand-black dark:text-white uppercase tracking-wider">
              Composants &amp; Composition (BOM)
            </h4>
          </div>
          <p className="text-xs text-brand-warm-grey mt-0.5">
            Composants matériels intégrés dans cet équipement
          </p>
        </div>
        {peutModifier && (
          <button
            type="button"
            onClick={() => setModalAjoutOuvert(true)}
            className="btn btn-primaire text-xs font-bold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Intégrer un composant
          </button>
        )}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 p-1 rounded-xl bg-brand-light-grey/20 dark:bg-white/5">
        {ONGLETS.map((o) => (
          <button
            key={o.cle}
            type="button"
            onClick={() => setOnglet(o.cle)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              onglet === o.cle
                ? "bg-white dark:bg-brand-paper text-brand-orange shadow-sm"
                : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
            }`}
          >
            {o.icone}
            {o.label}
            {o.cle === "installes" && composants.length > 0 && (
              <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange">
                {composants.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Erreur */}
      {erreur && (
        <div className="p-3 rounded-xl bg-danger/10 text-danger text-xs font-bold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{erreur}</span>
        </div>
      )}

      {/* Chargement */}
      {chargement && (
        <div className="p-8 text-center text-xs text-brand-warm-grey">
          Chargement des composants...
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ONGLET : INSTALLÉS */}
      {/* ═══════════════════════════════════════════════ */}
      {!chargement && onglet === "installes" && (
        <>
          {/* Synthèse */}
          {composants.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-brand-glow/20 dark:bg-white/5 border border-brand-orange/20 text-xs">
              <div>
                <span className="text-[10px] font-extrabold uppercase text-brand-warm-grey block">Composants installés</span>
                <span className="text-sm font-black text-brand-black dark:text-white">
                  {composants.length} pièce{composants.length > 1 ? "s" : ""}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase text-brand-orange block">Coût total composants</span>
                <span className="text-sm font-black text-brand-orange font-mono">{formaterDA(stats?.cout_total || 0)}</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-[10px] font-extrabold uppercase text-emerald-600 block">Gestion du stock</span>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Automatique (Statut: Assemblé)</span>
              </div>
            </div>
          )}

          {/* Vide */}
          {composants.length === 0 && (
            <div className="p-8 text-center rounded-2xl border border-dashed border-brand-light-grey/80 dark:border-white/10 text-xs text-brand-warm-grey space-y-2">
              <Boxes className="w-8 h-8 text-brand-warm-grey/50 mx-auto" />
              <p className="font-bold text-brand-black dark:text-white">Aucun composant installé.</p>
              <p className="text-[11px]">
                Pour assembler ce produit avec des composants du stock, cliquez sur « Intégrer un composant ».
              </p>
            </div>
          )}

          {/* Liste par catégorie */}
          {composants.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[...new Set(composants.map((c) => c.produit.categorie))].sort().map((cat) => {
                const composantsCategorie = composants.filter((c) => c.produit.categorie === cat);
                const icone = getIconeCategorie(cat);
                return (
                  <div
                    key={cat}
                    className="rounded-2xl border border-brand-light-grey/70 dark:border-white/10 bg-white dark:bg-brand-paper overflow-hidden shadow-xs"
                  >
                    <div className="px-3.5 py-2.5 bg-brand-light-grey/20 dark:bg-white/3 border-b border-brand-light-grey/40 dark:border-white/5 flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center">
                        {icone}
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase text-brand-warm-grey block">{cat}</span>
                        <span className="text-xs font-black text-brand-black dark:text-white">
                          {composantsCategorie.length} élément{composantsCategorie.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="divide-y divide-brand-light-grey/30 dark:divide-white/5">
                      {composantsCategorie.map((c) => (
                        <div
                          key={c.id}
                          className="p-3 flex items-center justify-between gap-2 hover:bg-brand-light-grey/15 dark:hover:bg-white/3 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <Link
                                href={`/produits/${c.produit.id}`}
                                className="font-mono text-[11px] font-black text-brand-orange hover:underline"
                              >
                                {c.produit.code_interne}
                              </Link>
                              <span className="font-extrabold text-[11px] text-brand-black dark:text-white truncate max-w-[120px]">
                                {c.produit.reference}
                              </span>
                              {c.slot_definition && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-200">
                                  {c.slot_definition.label}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-brand-warm-grey mt-0.5">
                              {c.produit.numero_serie && (
                                <span>S/N: <strong className="font-mono">{c.produit.numero_serie}</strong></span>
                              )}
                              <span className="font-mono font-bold text-brand-black dark:text-white">
                                {formaterDA(c.produit.prix_achat || 0)}
                              </span>
                              <span className="text-[9px] text-brand-warm-grey/60">
                                installé le {new Date(c.installed_at).toLocaleDateString("fr-DZ")}
                              </span>
                            </div>
                          </div>

                          {peutModifier && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => ouvrirRemplacement(c)}
                                disabled={enAction}
                                className="p-1.5 rounded-lg text-brand-warm-grey hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 transition shrink-0"
                                title="Remplacer ce composant"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => detacherComposant(c.produit.id, c.produit.reference)}
                                disabled={enAction}
                                className="p-1.5 rounded-lg text-brand-warm-grey hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition shrink-0"
                                title="Retirer du composé et remettre au stock"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ONGLET : TEMPLATE */}
      {/* ═══════════════════════════════════════════════ */}
      {!chargement && onglet === "template" && (
        <>
          <div className="p-3.5 rounded-2xl bg-brand-light-grey/15 dark:bg-white/3 border border-brand-light-grey/50 dark:border-white/10">
            <p className="text-xs text-brand-warm-grey mb-3">
              Définissez les emplacements (slots) de composants pour ce type d&apos;équipement.
              Un slot définit quel type de composant est requis et ses critères de compatibilité.
            </p>

            {peutModifier && (
              <button
                type="button"
                onClick={() => ouvrirModalSlot()}
                className="btn btn-secondaire text-xs font-bold flex items-center gap-1.5 mb-3"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter un slot
              </button>
            )}

            {slots.length === 0 && (
              <div className="p-6 text-center text-xs text-brand-warm-grey border border-dashed border-brand-light-grey/60 rounded-xl">
                <Settings className="w-6 h-6 mx-auto mb-2 text-brand-warm-grey/40" />
                <p className="font-bold text-brand-black dark:text-white">Aucun slot défini.</p>
                <p className="text-[11px] mt-1">
                  Ajoutez des slots pour définir la structure de composition de cet équipement.
                </p>
              </div>
            )}

            {slots.length > 0 && (
              <div className="space-y-2">
                {slots.map((slot) => {
                  const nbInstallations = slot._count.installed_components;
                  const estRempli = nbInstallations >= slot.quantite;
                  return (
                    <div
                      key={slot.id}
                      className={`p-3 rounded-xl border transition ${
                        estRempli
                          ? "border-emerald-300 bg-emerald-50/50 dark:bg-emerald-950/20"
                          : "border-brand-light-grey/70 dark:border-white/10 bg-white dark:bg-brand-paper"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-brand-black dark:text-white">{slot.label}</span>
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-light-grey/30 dark:bg-white/5 text-brand-warm-grey">
                              {slot.type_composant}
                            </span>
                            {slot.obligatoire && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">
                                Obligatoire
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-brand-warm-grey mt-0.5">
                            {nbInstallations}/{slot.quantite} empli{slot.quantite > 1 ? "s" : ""}
                            {slot.attributs_requis && (
                              <span className="ml-2 text-blue-600">
                                · Filtres actifs
                              </span>
                            )}
                          </div>
                        </div>
                        {peutModifier && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => ouvrirModalSlot(slot)}
                              className="p-1.5 rounded-lg text-brand-warm-grey hover:text-brand-orange hover:bg-brand-orange/10 transition"
                              title="Modifier le slot"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => supprimerSlot(slot)}
                              disabled={nbInstallations > 0}
                              className="p-1.5 rounded-lg text-brand-warm-grey hover:text-red-600 hover:bg-red-50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                              title={nbInstallations > 0 ? "Retirez d'abord les composants" : "Supprimer le slot"}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* ONGLET : HISTORIQUE */}
      {/* ═══════════════════════════════════════════════ */}
      {!chargement && onglet === "historique" && (
        <>
          {historique.length === 0 && (
            <div className="p-8 text-center rounded-2xl border border-dashed border-brand-light-grey/80 dark:border-white/10 text-xs text-brand-warm-grey space-y-2">
              <Clock className="w-8 h-8 text-brand-warm-grey/50 mx-auto" />
              <p className="font-bold text-brand-black dark:text-white">Aucune opération enregistrée.</p>
            </div>
          )}

          {historique.length > 0 && (
            <div className="space-y-1">
              {historique.map((h) => {
                const actionInfo = getLabelAction(h.action);
                return (
                  <div
                    key={h.id}
                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-brand-light-grey/15 dark:hover:bg-white/3 transition-colors"
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${actionInfo.color}`}>
                      {actionInfo.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold ${actionInfo.color.split(" ")[0]}`}>
                          {actionInfo.label}
                        </span>
                        <span className="text-[10px] text-brand-warm-grey truncate">
                          {h.note || ""}
                        </span>
                      </div>
                      <div className="text-[10px] text-brand-warm-grey/60 mt-0.5">
                        Par <strong>{h.user.username}</strong> ·{" "}
                        {new Date(h.created_at).toLocaleDateString("fr-DZ", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <span className="text-[9px] text-brand-warm-grey/50 shrink-0">
                      #{h.id}
                    </span>
                  </div>
                );
              })}

              {historiqueOffset + HISTORIQUE_LIMIT < historiqueTotal && (
                <button
                  type="button"
                  onClick={() => {
                    const next = historiqueOffset + HISTORIQUE_LIMIT;
                    setHistoriqueOffset(next);
                    void chargerHistorique(next);
                  }}
                  className="w-full p-2 text-xs font-bold text-brand-orange hover:bg-brand-orange/5 rounded-lg transition"
                >
                  Charger plus...
                </button>
              )}
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MODALE : AJOUT COMPOSANT */}
      {/* ═══════════════════════════════════════════════ */}
      {modalAjoutOuvert && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 p-6 space-y-4 shadow-2xl animate-entree">
            <div className="flex items-center justify-between border-b border-brand-light-grey/50 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-brand-orange" />
                <h3 className="font-black text-sm uppercase tracking-wider text-brand-black dark:text-white">
                  Intégrer un composant existant
                </h3>
              </div>
              <button
                type="button"
                onClick={fermerModalAjout}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-brand-warm-grey">
              Recherchez une pièce détachée ou composant disponible en stock.
              Une fois rattaché, il sera <strong>automatiquement retiré du stock général</strong>.
            </p>

            <div className="relative">
              <Search className="w-4 h-4 text-brand-warm-grey absolute left-3.5 top-3" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher par référence, code interne ou S/N..."
                className="champ pl-10 text-xs"
                autoFocus
              />
            </div>

            {chargementRecherche && (
              <p className="text-xs text-brand-warm-grey text-center py-4">Recherche dans le stock...</p>
            )}

            {!chargementRecherche && !recherche.trim() && (
              <p className="text-xs text-brand-warm-grey text-center py-4 border border-dashed border-brand-light-grey/70 rounded-xl">
                Tapez un nom de composant pour commencer la recherche.
              </p>
            )}

            {!chargementRecherche && recherche.trim() && resultatsRecherche.length === 0 && (
              <p className="text-xs text-brand-warm-grey text-center py-4 border border-dashed border-brand-light-grey/70 rounded-xl">
                Aucun article disponible trouvé.
              </p>
            )}

            {resultatsRecherche.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {resultatsRecherche.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/2 flex items-center justify-between gap-2 hover:border-brand-orange transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-orange">{p.code_interne}</span>
                        <span className="font-extrabold text-xs text-brand-black dark:text-white truncate">
                          {p.reference}
                        </span>
                      </div>
                      <div className="text-[11px] text-brand-warm-grey">
                        {p.categorie} {p.numero_serie ? `· S/N: ${p.numero_serie}` : ""} · Achat: {formaterDA(p.prix_achat)}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => attacherComposant(p.id)}
                      disabled={enAction}
                      className="btn btn-primaire text-xs font-bold shrink-0"
                    >
                      Intégrer
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-brand-light-grey/40 dark:border-white/10">
              <button
                type="button"
                onClick={fermerModalAjout}
                className="btn btn-secondaire text-xs font-bold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MODALE : REMPLACEMENT */}
      {/* ═══════════════════════════════════════════════ */}
      {modalRemplacementOuvert && composantARemplacer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 p-6 space-y-4 shadow-2xl animate-entree">
            <div className="flex items-center justify-between border-b border-brand-light-grey/50 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5 text-blue-600" />
                <h3 className="font-black text-sm uppercase tracking-wider text-brand-black dark:text-white">
                  Remplacer un composant
                </h3>
              </div>
              <button
                type="button"
                onClick={fermerModalRemplacement}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-xs">
              <p className="font-bold text-amber-700 dark:text-amber-400">Composant à retirer :</p>
              <p className="text-amber-600 dark:text-amber-300 mt-1">
                {composantARemplacer.produit.code_interne} — {composantARemplacer.produit.reference}
                {composantARemplacer.produit.numero_serie ? ` (S/N: ${composantARemplacer.produit.numero_serie})` : ""}
              </p>
            </div>

            <p className="text-xs text-brand-warm-grey">
              Recherchez le nouveau composant à installer :
            </p>

            <div className="relative">
              <Search className="w-4 h-4 text-brand-warm-grey absolute left-3.5 top-3" />
              <input
                type="text"
                value={recherche}
                onChange={(e) => setRecherche(e.target.value)}
                placeholder="Rechercher le remplaçant..."
                className="champ pl-10 text-xs"
                autoFocus
              />
            </div>

            {chargementRecherche && (
              <p className="text-xs text-brand-warm-grey text-center py-4">Recherche...</p>
            )}

            {!chargementRecherche && recherche.trim() && resultatsRecherche.length === 0 && (
              <p className="text-xs text-brand-warm-grey text-center py-4 border border-dashed border-brand-light-grey/70 rounded-xl">
                Aucun article disponible trouvé.
              </p>
            )}

            {resultatsRecherche.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {resultatsRecherche.map((p) => (
                  <div
                    key={p.id}
                    className="p-3 rounded-xl border border-brand-light-grey/70 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/2 flex items-center justify-between gap-2 hover:border-blue-400 transition"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-orange">{p.code_interne}</span>
                        <span className="font-extrabold text-xs text-brand-black dark:text-white truncate">
                          {p.reference}
                        </span>
                      </div>
                      <div className="text-[11px] text-brand-warm-grey">
                        {p.categorie} · Achat: {formaterDA(p.prix_achat)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remplacerComposant(p.id)}
                      disabled={enAction}
                      className="btn btn-primaire text-xs font-bold shrink-0 bg-blue-600 hover:bg-blue-700"
                    >
                      Remplacer
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-brand-light-grey/40 dark:border-white/10">
              <button
                type="button"
                onClick={fermerModalRemplacement}
                className="btn btn-secondaire text-xs font-bold"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════ */}
      {/* MODALE : AJOUT/MODIFICATION SLOT */}
      {/* ═══════════════════════════════════════════════ */}
      {modalSlotOuvert && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 p-6 space-y-4 shadow-2xl animate-entree">
            <div className="flex items-center justify-between border-b border-brand-light-grey/50 dark:border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-brand-orange" />
                <h3 className="font-black text-sm uppercase tracking-wider text-brand-black dark:text-white">
                  {slotEnEdition ? "Modifier le slot" : "Nouveau slot"}
                </h3>
              </div>
              <button
                type="button"
                onClick={fermerModalSlot}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey block mb-1">
                  Nom du slot *
                </label>
                <input
                  type="text"
                  value={nouveauSlot.label}
                  onChange={(e) => setNouveauSlot({ ...nouveauSlot, label: e.target.value })}
                  placeholder="Ex: RAM SO-DIMM 1"
                  className="champ text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey block mb-1">
                  Type de composant requis *
                </label>
                <input
                  type="text"
                  value={nouveauSlot.type_composant}
                  onChange={(e) => setNouveauSlot({ ...nouveauSlot, type_composant: e.target.value })}
                  placeholder="Ex: ram, stockage, chargeur"
                  className="champ text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-extrabold uppercase text-brand-warm-grey block mb-1">
                    Quantité
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={nouveauSlot.quantite}
                    onChange={(e) => setNouveauSlot({ ...nouveauSlot, quantite: Math.max(1, Number(e.target.value)) })}
                    className="champ text-xs"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-xs font-bold text-brand-black dark:text-white cursor-pointer">
                    <input
                      type="checkbox"
                      checked={nouveauSlot.obligatoire}
                      onChange={(e) => setNouveauSlot({ ...nouveauSlot, obligatoire: e.target.checked })}
                      className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
                    />
                    Obligatoire
                  </label>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-brand-light-grey/40 dark:border-white/10">
              <button
                type="button"
                onClick={fermerModalSlot}
                className="btn btn-secondaire text-xs font-bold"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={sauvegarderSlot}
                className="btn btn-primaire text-xs font-bold"
              >
                {slotEnEdition ? "Modifier" : "Créer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
