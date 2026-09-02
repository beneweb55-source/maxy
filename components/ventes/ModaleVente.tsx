"use client";

import React, { useState, useEffect, useMemo } from "react";
import Modale from "@/components/Modale";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { 
  IconeBillet, 
  IconeAlerte, 
  IconeEtiquette, 
  IconeCoche 
} from "@/components/icons";
import { 
  ShieldCheck, 
  Barcode, 
  Package, 
  CheckSquare, 
  Square, 
  Plus, 
  Minus,
  Sparkles,
  Layers,
  AlertCircle,
  AlertTriangle,
  Download
} from "lucide-react";

export interface ArticleAVendre {
  id: number;
  code_interne: string;
  reference: string;
  numero_serie?: string | null;
  grade?: string | null;
  prix_achat?: number;
  prix_vente_fixe?: number | null;
  prix_vente_reel?: number | null;
  etiquette_imprimee?: boolean;
  statut?: string;
}

interface ModaleVenteProps {
  ouverte: boolean;
  unites: ArticleAVendre[];
  onFermer: () => void;
  onSucces: () => void;
}

function aujourdhuiIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Arrondi monétaire sécurisé pour éviter tout bug de virgule flottante JavaScript
function arrondirMonnaie(valeur: number): number {
  return Math.round((valeur + Number.EPSILON) * 100) / 100;
}

export default function ModaleVente({
  ouverte,
  unites,
  onFermer,
  onSucces,
}: ModaleVenteProps) {
  const { afficher } = useToast();
  const [envoi, setEnvoi] = useState(false);

  // Filtrer les unités éligibles (exclure formellement 'vendu', 'produit_commande', 'hs')
  const unitesDisponibles = useMemo(() => {
    return unites.filter((u) => u.statut !== "vendu" && u.statut !== "produit_commande" && u.statut !== "hs");
  }, [unites]);

  // Ensemble des ID d'unités sélectionnées pour la vente
  const [selectionnes, setSelectionnes] = useState<Set<number>>(new Set());

  // Prix par unité (ajustable à la volée, 0 DA permis)
  const [prixMap, setPrixMap] = useState<{ [id: number]: number }>({});

  const [typeFacture, setTypeFacture] = useState<"FACTURE_TVA" | "PROFORMA" | "DEVIS">("FACTURE_TVA");
  const [numeroManuel, setNumeroManuel] = useState("");
  const [modePaiement, setModePaiement] = useState("especes");
  const [especesRecues, setEspecesRecues] = useState("");
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [clientAdresse, setClientAdresse] = useState("");
  const [clientRc, setClientRc] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientAi, setClientAi] = useState("");
  const [clientNis, setClientNis] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [garantieMois, setGarantieMois] = useState(6);
  const [etiquetteValidee, setEtiquetteValidee] = useState(false);
  const [avertissement, setAvertissement] = useState<string | null>(null);

  // Initialisation à l'ouverture : Quantité par défaut TOUJOURS égale à 1 par référence (Jamais tout le stock)
  useEffect(() => {
    if (unitesDisponibles.length > 0) {
      const map: { [id: number]: number } = {};
      const initialSelection = new Set<number>();
      const referencesVues = new Set<string>();

      for (const u of unitesDisponibles) {
        map[u.id] =
          u.prix_vente_fixe !== null && u.prix_vente_fixe !== undefined
            ? u.prix_vente_fixe
            : u.prix_vente_reel !== null && u.prix_vente_reel !== undefined
              ? u.prix_vente_reel
              : (u.prix_achat && u.prix_achat > 0 ? Math.round(u.prix_achat * 1.25) : 0);
        
        // Règle absolue UX POS : pré-sélectionner exactement 1 unité par modèle/référence
        const cleRef = u.reference || `prod-${u.id}`;
        if (!referencesVues.has(cleRef)) {
          initialSelection.add(u.id);
          referencesVues.add(cleRef);
        }
      }

      setPrixMap(map);
      setSelectionnes(initialSelection);
      setEspecesRecues("");
      setAvertissement(null);
      setEtiquetteValidee(unitesDisponibles.every((u) => u.etiquette_imprimee));
    } else {
      setSelectionnes(new Set());
      setPrixMap({});
    }
  }, [unitesDisponibles]);

  // Regroupement des unités par modèle / référence
  const groupesParReference = useMemo(() => {
    const groupes = new Map<string, ArticleAVendre[]>();
    for (const u of unitesDisponibles) {
      const ref = u.reference || "Produit";
      const existant = groupes.get(ref);
      if (existant) existant.push(u);
      else groupes.set(ref, [u]);
    }
    return Array.from(groupes.entries()).map(([reference, items]) => {
      // Un modèle est sérialisé si au moins un exemplaire a un numéro de série renseigné
      const hasSerial = items.some((i) => Boolean(i.numero_serie && i.numero_serie.trim()));
      return { reference, items, hasSerial };
    });
  }, [unitesDisponibles]);

  // Unités actuellement cochées / sélectionnées
  const unitesChoisies = useMemo(() => {
    return unitesDisponibles.filter((u) => selectionnes.has(u.id));
  }, [unitesDisponibles, selectionnes]);

  // Total à encaisser (Arrondi sécurisé)
  const total = useMemo(() => {
    const sum = unitesChoisies.reduce((acc, u) => acc + (prixMap[u.id] ?? 0), 0);
    return arrondirMonnaie(Math.max(0, sum));
  }, [unitesChoisies, prixMap]);

  // Calcul dynamique de la monnaie
  const monnaieARendre = useMemo(() => {
    const recu = Number(especesRecues);
    if (!Number.isFinite(recu) || recu <= 0) return 0;
    return arrondirMonnaie(Math.max(0, recu - total));
  }, [especesRecues, total]);

  const articlesSansEtiquette = useMemo(() => {
    return unitesChoisies.filter((u) => !u.etiquette_imprimee);
  }, [unitesChoisies]);

  // Bascule de sélection pour une unité sérialisée
  const basculerUnite = (id: number) => {
    setSelectionnes((prev) => {
      const suivant = new Set(prev);
      if (suivant.has(id)) suivant.delete(id);
      else suivant.add(id);
      return suivant;
    });
  };

  // Sélection globale par modèle
  const selectionnerTousDuGroupe = (items: ArticleAVendre[], tout: boolean) => {
    setSelectionnes((prev) => {
      const suivant = new Set(prev);
      for (const item of items) {
        if (tout) suivant.add(item.id);
        else suivant.delete(item.id);
      }
      return suivant;
    });
  };

  // Ajustement de quantité pour les produits génériques (sans S/N)
  const definirQuantiteGenerique = (items: ArticleAVendre[], quantiteVoulue: number) => {
    const quantite = Math.max(0, Math.min(quantiteVoulue, items.length));
    setSelectionnes((prev) => {
      const suivant = new Set(prev);
      // Retirer tous les éléments de ce groupe
      for (const item of items) {
        suivant.delete(item.id);
      }
      // Ré-ajouter exactement 'quantite' premiers éléments
      for (let i = 0; i < quantite; i++) {
        if (items[i]) suivant.add(items[i]!.id);
      }
      return suivant;
    });
  };

  // Validation et enregistrement de la vente
  async function enregistrerVente(confirmer: boolean) {
    if (unitesChoisies.length === 0) {
      afficher("Veuillez sélectionner au moins un exemplaire à vendre.", "erreur");
      return;
    }

    if (modePaiement === "credit" && !clientNom.trim()) {
      afficher("Veuillez saisir le nom du client pour une vente à crédit.", "erreur");
      return;
    }

    // Vérifier les prix : prix négatifs interdits (0 DA autorisé)
    for (const u of unitesChoisies) {
      const p = prixMap[u.id];
      if (p === undefined || p === null || p < 0 || Number.isNaN(p)) {
        afficher(`Veuillez renseigner un prix de vente valide (≥ 0 DA) pour ${u.code_interne}.`, "erreur");
        return;
      }
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
        type_document: typeFacture,
        numero_manuel: numeroManuel.trim() || undefined,
        mode_paiement: modePaiement,
        etiquette_imprimee: etiquetteValidee || undefined,
        confirmer: confirmer || undefined,
      };

      const res =
        unitesChoisies.length === 1
          ? await fetch("/api/ventes", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_id: unitesChoisies[0]!.id,
                prix_vente_reel: prixMap[unitesChoisies[0]!.id] ?? 0,
                ...commun,
              }),
            })
          : await fetch("/api/ventes/groupee", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                produit_ids: unitesChoisies.map((u) => u.id),
                prix_total: total,
                prix_par_produit: prixMap,
                ...commun,
              }),
            });

      const corps = (await res.json().catch(() => null)) as {
        ok?: boolean;
        confirmation_required?: boolean;
        message?: string;
        error?: string;
        facture_id?: number;
        facture_numero?: string;
      } | null;

      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'enregistrement de la vente.", "erreur");
        return;
      }

      if (corps?.confirmation_required) {
        setAvertissement(corps.message ?? "Prix sous la marge minimum. Confirmer la vente ?");
        return;
      }

      afficher(
        `Vente enregistrée avec succès — facture ${corps?.facture_numero ?? ""} créée.`,
        "succes"
      );
      if (corps?.facture_id) {
        window.open(`/factures/${corps.facture_id}`, "_blank");
      }
      onSucces();
    } catch {
      afficher("Impossible de joindre le serveur. Veuillez réessayer.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <Modale
      titre={`Vente & Facturation — ${unitesChoisies.length} article${unitesChoisies.length > 1 ? "s" : ""} sélectionné${unitesChoisies.length > 1 ? "s" : ""}`}
      ouverte={ouverte}
      large="4xl"
      onFermer={onFermer}
    >
      <div className="space-y-5 max-h-[80dvh] overflow-y-auto pr-1 text-slate-900">
        
        {/* ===================== SECTION 1 : SÉLECTION INTELLIGENTE S/N & QUANTITÉS ===================== */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1 border-b border-slate-200">
            <span className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-orange" />
              <span>Choix des Exemplaires & Numéros de Série (S/N)</span>
            </span>
            <span className="text-xs font-bold text-slate-500">
              {unitesChoisies.length} sur {unitesDisponibles.length} disponible{unitesDisponibles.length > 1 ? "s" : ""}
            </span>
          </div>

          {groupesParReference.map(({ reference, items, hasSerial }) => {
            const itemsSelectionnesDuGroupe = items.filter((i) => selectionnes.has(i.id));
            const nbSelectionnes = itemsSelectionnesDuGroupe.length;
            const tousCoches = nbSelectionnes === items.length;

            return (
              <div
                key={reference}
                className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 space-y-3 shadow-xs"
              >
                {/* En-tête du groupe de produit */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-sm text-slate-900">{reference}</h4>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Stock physique : {items.length} unité{items.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Actions rapides selon que le produit est sérialisé ou générique */}
                  {hasSerial ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => selectionnerTousDuGroupe(items, !tousCoches)}
                        className="btn btn-secondaire btn-xs text-[11px] font-bold rounded-lg"
                      >
                        {tousCoches ? "Tout désélectionner" : "Tout sélectionner"}
                      </button>
                    </div>
                  ) : (
                    /* Sélecteur de quantité éditable pour produits génériques sans S/N */
                    <div className="flex items-center gap-1.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl p-1 shadow-2xs">
                      <button
                        type="button"
                        disabled={nbSelectionnes <= 0}
                        onClick={() => definirQuantiteGenerique(items, nbSelectionnes - 1)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 font-black transition active:scale-95 cursor-pointer"
                        title="Diminuer la quantité (-1)"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-1 px-1">
                        <input
                          type="number"
                          min={0}
                          max={items.length}
                          value={nbSelectionnes}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            definirQuantiteGenerique(items, isNaN(val) ? 0 : val);
                          }}
                          className="w-14 h-8 text-center font-mono font-black text-sm text-brand-orange bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-orange [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          title={`Quantité à facturer (Max disponible: ${items.length})`}
                        />
                        <span className="text-xs font-bold text-slate-400 font-mono">/ {items.length}</span>
                      </div>
                      <button
                        type="button"
                        disabled={nbSelectionnes >= items.length}
                        onClick={() => definirQuantiteGenerique(items, nbSelectionnes + 1)}
                        className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-zinc-700 disabled:opacity-30 font-black transition active:scale-95 cursor-pointer"
                        title="Augmenter la quantité (+1)"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* CAS A : Liste visuelle interactive des S/N pour les produits sérialisés */}
                {hasSerial ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {items.map((u) => {
                      const estCoche = selectionnes.has(u.id);
                      const prixActuel = prixMap[u.id];
                      const prixNulOuManquant = prixActuel === undefined || prixActuel <= 0;

                      return (
                        <div
                          key={u.id}
                          onClick={() => basculerUnite(u.id)}
                          className={`flex flex-col gap-2 p-3 rounded-xl border cursor-pointer transition-all ${
                            estCoche
                              ? "bg-white dark:bg-zinc-900 border-brand-orange shadow-xs ring-1 ring-brand-orange/30"
                              : "bg-white/60 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:border-slate-300 opacity-60"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <input
                                type="checkbox"
                                checked={estCoche}
                                onChange={() => {}} // géré par le conteneur onClick
                                className="checkbox checkbox-xs checkbox-primary rounded"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-slate-900 dark:text-white text-xs">
                                    {u.code_interne}
                                  </span>
                                  {u.grade && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300">
                                      {u.grade}
                                    </span>
                                  )}
                                </div>
                                {u.numero_serie ? (
                                  <span className="font-mono text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 mt-0.5 truncate">
                                    <ShieldCheck className="w-3 h-3 shrink-0" />
                                    <span>S/N : {u.numero_serie}</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Sans S/N</span>
                                )}
                              </div>
                            </div>

                            {/* Ajustement de prix unitaire */}
                            <div 
                              className="flex items-center gap-1 shrink-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                min="0"
                                value={prixMap[u.id] !== undefined ? prixMap[u.id] : ""}
                                onChange={(e) =>
                                  setPrixMap({ ...prixMap, [u.id]: Number(e.target.value) || 0 })
                                }
                                className={`input input-xs h-7 w-24 text-right font-mono font-bold text-xs rounded-lg ${
                                  estCoche && prixNulOuManquant
                                    ? "bg-red-50 dark:bg-red-950/40 border-red-400 text-red-700 dark:text-red-300 ring-2 ring-red-400/30"
                                    : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900"
                                }`}
                                placeholder="Prix obligatoire"
                              />
                              <span className="text-[10px] font-bold text-slate-500">DA</span>
                            </div>
                          </div>

                          {/* Avertissement Auto-Override si le statut n'est pas en_vente */}
                          {u.statut && u.statut !== "en_vente" && (
                            <div className="px-2 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5 animate-entree">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>
                                Ce produit est en statut <strong>{u.statut.toUpperCase()}</strong>. Il sera automatiquement mis en vente et facturé.
                              </span>
                            </div>
                          )}

                          {estCoche && prixNulOuManquant && (
                            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold">
                              * Saisie du prix de vente obligatoire avant encaissement
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* CAS B : Ajustement de prix unitaire pour le lot générique */
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
                      <span className="text-slate-600 dark:text-slate-300 font-medium">Prix unitaire appliqué :</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          min="0"
                          value={items[0] && prixMap[items[0].id] !== undefined ? prixMap[items[0].id] : ""}
                          onChange={(e) => {
                            const val = Number(e.target.value) || 0;
                            const newMap = { ...prixMap };
                            for (const item of items) {
                              newMap[item.id] = val;
                            }
                            setPrixMap(newMap);
                          }}
                          className={`input input-xs h-8 w-28 text-right font-mono font-bold text-xs rounded-lg ${
                            (prixMap[items[0]?.id ?? 0] ?? 0) <= 0
                              ? "bg-red-50 dark:bg-red-950/40 border-red-400 text-red-700 dark:text-red-300 ring-2 ring-red-400/30"
                              : "bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 focus:bg-white dark:focus:bg-zinc-900"
                          }`}
                          placeholder="Prix obligatoire"
                        />
                        <span className="font-bold text-brand-orange">DA</span>
                      </div>
                    </div>

                    {/* Avertissement Auto-Override pour lot générique */}
                    {items.some((i) => i.statut && i.statut !== "en_vente") && (
                      <div className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-[10px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1.5 animate-entree">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>
                          Certains exemplaires sont en statut non-vente (ex: REÇU/OK). Ils seront automatiquement régularisés en vente et facturés.
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ===================== BANDEAU TOTAL À ENCAISSER ===================== */}
        <div className="flex justify-between items-center p-4 rounded-2xl bg-brand-orange/10 border border-brand-orange/30 shadow-xs">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
              Total à Encaisser ({unitesChoisies.length} article{unitesChoisies.length > 1 ? "s" : ""})
            </span>
            <span className="text-[11px] text-slate-500">
              Paiement comptant ou différé
            </span>
          </div>
          <span className="text-2xl font-black font-mono text-brand-orange">
            {formaterDA(total)}
          </span>
        </div>

        {/* ===================== SECTION 2 : FACTURATION & PAIEMENT ===================== */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="type-facture-unifie">
              Type de Document
            </label>
            <select
              id="type-facture-unifie"
              value={typeFacture}
              onChange={(e) => setTypeFacture(e.target.value as any)}
              className="select w-full h-10 text-xs font-bold bg-white border-slate-200 rounded-xl"
            >
              <option value="FACTURE_TVA">Facture TVA (Document fiscal)</option>
              <option value="PROFORMA">Facture Proforma</option>
              <option value="DEVIS">Devis Client</option>
            </select>
          </div>

          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="numero-manuel-unifie">
              N° Personnalisé (Optionnel)
            </label>
            <input
              id="numero-manuel-unifie"
              type="text"
              value={numeroManuel}
              onChange={(e) => setNumeroManuel(e.target.value)}
              placeholder="Auto (ex: FA-2026-...)"
              className="input w-full h-10 text-xs font-mono font-bold bg-white border-slate-200 rounded-xl"
            />
          </div>

          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="mode-paiement-unifie">
              Mode de Paiement
            </label>
            <select
              id="mode-paiement-unifie"
              value={modePaiement}
              onChange={(e) => setModePaiement(e.target.value)}
              className="select w-full h-10 text-xs font-bold bg-white border-slate-200 rounded-xl"
            >
              <option value="especes">Espèces</option>
              <option value="carte">Carte Bancaire / CIB</option>
              <option value="virement">Virement CCP / Bancaire</option>
              <option value="cheque">Chèque</option>
              <option value="credit">Vente à Crédit</option>
            </select>
          </div>
        </div>

        {/* Calcul de Monnaie si Espèces */}
        {modePaiement === "especes" && (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
            <label className="libelle text-xs font-bold text-slate-700" htmlFor="especes-recues-unifie">
              Montant Reçu en Espèces (DA)
            </label>
            <div className="flex items-center gap-3">
              <input
                id="especes-recues-unifie"
                type="number"
                value={especesRecues}
                onChange={(e) => setEspecesRecues(e.target.value)}
                placeholder={String(total)}
                className="input flex-1 font-bold font-mono text-base h-11 bg-white border-slate-200 rounded-xl"
              />
              {monnaieARendre > 0 && (
                <div className="flex flex-col text-right shrink-0">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Monnaie à rendre</span>
                  <span className="text-base font-black font-mono text-emerald-600">{formaterDA(monnaieARendre)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* RÈGLE 2 ERP/WMS : Contrôle Étiquette Produit */}
        {articlesSansEtiquette.length > 0 && (
          <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="toggle-etiquette-unifie"
                className="text-xs font-bold text-amber-900 cursor-pointer select-none"
              >
                Avez-vous imprimé et collé l&apos;étiquette sur les articles ({articlesSansEtiquette.length}) ?
              </label>
              <input
                id="toggle-etiquette-unifie"
                type="checkbox"
                checked={etiquetteValidee}
                onChange={(e) => setEtiquetteValidee(e.target.checked)}
                className="toggle toggle-warning h-6 w-11 cursor-pointer"
              />
            </div>
            {!etiquetteValidee && (
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-amber-500/20">
                <span className="text-[11px] text-amber-800">
                  Sans confirmation, l&apos;article sera réservé (Produit Commandé).
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const ids = articlesSansEtiquette.map((l) => l.id);
                    window.open(`/imprimer-etiquettes?ids=${ids.join(",")}`, "_blank");
                    setEtiquetteValidee(true);
                  }}
                  className="btn btn-xs bg-brand-orange text-white hover:bg-brand-orange/90 font-bold"
                >
                  Imprimer les étiquettes
                </button>
              </div>
            )}
          </div>
        )}

        {/* Coordonnées Client & Canal */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="client-nom-unifie">
              Nom du client {modePaiement === "credit" ? "*" : ""}
            </label>
            <input
              id="client-nom-unifie"
              type="text"
              value={clientNom}
              onChange={(e) => setClientNom(e.target.value)}
              placeholder="Ex. Karim M. (Particulier)"
              className="input w-full h-10 text-xs bg-white border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="client-tel-unifie">
              Téléphone
            </label>
            <input
              id="client-tel-unifie"
              type="tel"
              value={clientTel}
              onChange={(e) => setClientTel(e.target.value)}
              placeholder="0X XX XX XX XX"
              className="input w-full h-10 text-xs bg-white border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="date-vente-unifie">
              Date de vente
            </label>
            <input
              id="date-vente-unifie"
              type="date"
              value={dateVente}
              max={aujourdhuiIso()}
              onChange={(e) => setDateVente(e.target.value)}
              className="input w-full h-10 text-xs font-mono bg-white border-slate-200 rounded-xl"
            />
          </div>
          <div>
            <label className="libelle mb-1.5 text-xs font-bold text-slate-700" htmlFor="canal-unifie">
              Canal de Vente
            </label>
            <input
              id="canal-unifie"
              type="text"
              value={canal}
              onChange={(e) => setCanal(e.target.value)}
              placeholder="Boutique, Ouedkniss, Facebook…"
              className="input w-full h-10 text-xs bg-white border-slate-200 rounded-xl"
            />
          </div>
        </div>

        {/* Accordéon Informations Légales & Entreprise */}
        <details className="group">
          <summary className="cursor-pointer text-xs font-bold text-brand-orange hover:underline outline-none">
            + Informations légales pour facture proforma / entreprise (Optionnel)
          </summary>
          <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div>
              <label className="libelle mb-1 text-slate-600" htmlFor="client-adresse-unifie">Adresse</label>
              <input
                id="client-adresse-unifie"
                type="text"
                value={clientAdresse}
                onChange={(e) => setClientAdresse(e.target.value)}
                className="input w-full h-9 text-xs bg-white border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="libelle mb-1 text-slate-600" htmlFor="client-rc-unifie">RC (Registre Commerce)</label>
              <input
                id="client-rc-unifie"
                type="text"
                value={clientRc}
                onChange={(e) => setClientRc(e.target.value)}
                className="input w-full h-9 text-xs bg-white border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="libelle mb-1 text-slate-600" htmlFor="client-nif-unifie">NIF</label>
              <input
                id="client-nif-unifie"
                type="text"
                value={clientNif}
                onChange={(e) => setClientNif(e.target.value)}
                className="input w-full h-9 text-xs bg-white border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="libelle mb-1 text-slate-600" htmlFor="client-nis-unifie">NIS</label>
              <input
                id="client-nis-unifie"
                type="text"
                value={clientNis}
                onChange={(e) => setClientNis(e.target.value)}
                className="input w-full h-9 text-xs bg-white border-slate-200 rounded-xl"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="libelle mb-1 text-slate-600" htmlFor="client-ai-unifie">Article d&apos;imposition (AI)</label>
              <input
                id="client-ai-unifie"
                type="text"
                value={clientAi}
                onChange={(e) => setClientAi(e.target.value)}
                className="input w-full h-9 text-xs bg-white border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </details>

        {avertissement && (
          <div className="flex items-start gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-3 text-xs text-amber-900">
            <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
            <span>{avertissement}</span>
          </div>
        )}

        <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-200">
          {avertissement ? (
            <>
              <button
                type="button"
                onClick={() => setAvertissement(null)}
                className="btn btn-secondaire text-xs h-11 px-4 rounded-xl font-bold"
              >
                Revoir le prix
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void enregistrerVente(true)}
                className="btn btn-primaire text-xs h-11 px-5 rounded-xl font-black"
              >
                Vendre quand même
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={envoi || unitesChoisies.length === 0 || total < 0}
              onClick={() => void enregistrerVente(false)}
              className="btn btn-primaire w-full sm:w-auto min-h-[46px] px-6 rounded-2xl text-xs font-black shadow-lg shadow-brand-orange/20 flex items-center justify-center gap-2"
            >
              <IconeBillet taille={16} />
              <span>
                {envoi ? "Enregistrement..." : `Valider la Vente (${unitesChoisies.length}) & Facturer`}
              </span>
            </button>
          )}
        </div>
      </div>
    </Modale>
  );
}
