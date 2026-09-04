"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  X, 
  Store, 
  Truck, 
  Tag, 
  Phone, 
  Share2, 
  Search, 
  Plus, 
  Trash2, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  MapPin,
  User,
  ShieldCheck,
  Package
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";
import { WILAYAS_ALGERIE } from "@/lib/wilayas";
import type { CanalVente, CaisseDestination, StatutCommande } from "@prisma/client";

interface ArticlePanier {
  produit_id?: number | null;
  code_interne: string;
  designation: string;
  prix_unitaire: number;
  quantite: number;
  categorie?: string | null;
  numero_serie?: string | null;
}

interface ModaleCreationCommandeProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces?: (cmd: any) => void;
}

export default function ModaleCreationCommande({
  ouvert,
  onFermer,
  onSucces,
}: ModaleCreationCommandeProps) {
  const { afficher } = useToast();

  // 1. Source & Canal
  const [canal, setCanal] = useState<CanalVente>("COMPTOIR");
  const [caisse, setCaisse] = useState<CaisseDestination>("CAISSE_PHYSIQUE");

  // 2. Coordonnées Client & Expédition
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [wilaya, setWilaya] = useState("");
  const [commune, setCommune] = useState("");
  const [adresse, setAdresse] = useState("");
  const [fraisLivraison, setFraisLivraison] = useState<number>(0);

  // 3. Panier & Paiement
  const [panier, setPanier] = useState<ArticlePanier[]>([]);
  const [rechercheProduit, setRechercheProduit] = useState("");
  const [resultatsRecherche, setResultatsRecherche] = useState<any[]>([]);
  const [chargementRecherche, setChargementRecherche] = useState(false);
  const [estPayee, setEstPayee] = useState<boolean>(false);
  const [remiseGlobale, setRemiseGlobale] = useState<number>(0);
  const [notes, setNotes] = useState("");

  const [soumission, setSoumission] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Synchronisation automatique de la caisse selon le canal
  useEffect(() => {
    if (canal === "YALIDINE") {
      setCaisse("CAISSE_YALIDINE");
      if (fraisLivraison === 0) setFraisLivraison(800); // Frais par défaut recommandés
    } else {
      setCaisse("CAISSE_PHYSIQUE");
    }
  }, [canal]);

  // Recherche d'articles disponibles en stock
  useEffect(() => {
    const q = rechercheProduit.trim();
    if (!q || q.length < 2) {
      setResultatsRecherche([]);
      return;
    }

    const timer = setTimeout(async () => {
      setChargementRecherche(true);
      try {
        const res = await fetch(`/api/recherche?q=${encodeURIComponent(q)}&disponibles=1`);
        if (res.ok) {
          const data = await res.json();
          setResultatsRecherche(data.produits || []);
        }
      } catch (err) {
        console.error("Erreur recherche articles:", err);
      } finally {
        setChargementRecherche(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [rechercheProduit]);

  if (!ouvert) return null;

  const estExpedition = canal === "YALIDINE" || wilaya.length > 0;

  // Ajout d'un article au panier (ou incrémenter quantité si déjà présent)
  const ajouterAuPanier = (p: any) => {
    const existeIndex = panier.findIndex((item) => item.produit_id === p.id);
    if (existeIndex >= 0) {
      // Incrémenter la quantité
      setPanier((prev) => prev.map((item, i) =>
        i === existeIndex ? { ...item, quantite: item.quantite + 1 } : item
      ));
      afficher(`Quantité mise à jour : ${(panier[existeIndex]?.quantite ?? 0) + 1}x`, "info");
      return;
    }

    setPanier((prev) => [
      ...prev,
      {
        produit_id: p.id,
        code_interne: p.code_interne || "P-0000",
        designation: p.reference || p.code_interne || "Article sans nom",
        prix_unitaire: p.prix_vente_fixe || 0,
        quantite: 1,
        categorie: p.categorie || null,
        numero_serie: p.numero_serie || null,
      },
    ]);
    setRechercheProduit("");
    setResultatsRecherche([]);
  };

  const modifierPrixLigne = (index: number, nouveauPrix: number) => {
    setPanier((prev) =>
      prev.map((item, i) => (i === index ? { ...item, prix_unitaire: Math.max(0, nouveauPrix) } : item))
    );
  };

  const modifierQuantite = (index: number, nouvelleQte: number) => {
    const qte = Math.max(1, Math.floor(nouvelleQte || 1));
    setPanier((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantite: qte } : item))
    );
  };

  const supprimerDuPanier = (index: number) => {
    setPanier((prev) => prev.filter((_, i) => i !== index));
  };

  // Calculs totaux
  const sousTotal = panier.reduce((sum, item) => sum + item.prix_unitaire * item.quantite, 0);
  const totalTTC = Math.max(0, sousTotal + (estExpedition ? fraisLivraison : 0) - remiseGlobale);

  // Soumission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErreur(null);

    if (!clientNom.trim()) {
      setErreur("Veuillez renseigner le nom du client.");
      return;
    }

    if (!clientTel.trim()) {
      setErreur("Veuillez renseigner le numéro de téléphone du client.");
      return;
    }

    if (canal === "YALIDINE") {
      if (!wilaya) {
        setErreur("La wilaya est obligatoire pour une expédition Yalidine.");
        return;
      }
      if (!commune.trim()) {
        setErreur("La commune est obligatoire pour une expédition Yalidine.");
        return;
      }
    }

    if (panier.length === 0) {
      setErreur("Veuillez ajouter au moins un produit au panier.");
      return;
    }

    setSoumission(true);

    try {
      let statutInitial: StatutCommande = "EN_ATTENTE";
      if (estPayee) {
        statutInitial = canal === "COMPTOIR" ? "TERMINEE" : "CONFIRMEE";
      } else {
        statutInitial = canal === "YALIDINE" ? "EN_ATTENTE" : "EN_ATTENTE";
      }

      const payload = {
        client_nom: clientNom.trim(),
        client_tel: clientTel.trim(),
        client_adresse: adresse.trim() || (wilaya ? `${commune ? commune + ", " : ""}${wilaya}` : null),
        wilaya: wilaya || null,
        commune: commune.trim() || null,
        frais_livraison: estExpedition ? fraisLivraison : 0,
        canal,
        caisse,
        statut: statutInitial,
        payee: estPayee,
        remise_globale: remiseGlobale,
        notes: notes.trim() || null,
        lignes: panier.map((p) => ({
          produit_id: p.produit_id,
          code_interne: p.code_interne,
          designation: p.designation,
          numero_serie: p.numero_serie,
          categorie: p.categorie,
          quantite: p.quantite,
          prix_unitaire: p.prix_unitaire,
        })),
      };

      const res = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || data.error || "Erreur lors de la création de la commande.");
      }

      const commandeCreee = await res.json();

      afficher(
        `Commande ${commandeCreee.numero} créée avec succès ! Articles réservés en stock.`,
        "succes"
      );

      if (onSucces) onSucces(commandeCreee);
      onFermer();
    } catch (err: any) {
      console.error(err);
      setErreur(err.message || "Erreur inattendue.");
    } finally {
      setSoumission(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-brand-white dark:bg-brand-paper rounded-2xl shadow-2xl border border-brand-light-grey dark:border-white/10 overflow-hidden my-auto max-h-[95vh] flex flex-col">
        {/* Header Modale */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/20 dark:bg-black/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-orange/10 flex items-center justify-center text-brand-orange">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-brand-black dark:text-white">
                Nouvelle Commande Spéciale (OMS)
              </h2>
              <p className="text-xs text-brand-warm-grey">
                Réservation immédiate du stock & séparation comptable des flux
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onFermer}
            disabled={soumission}
            className="p-1.5 rounded-lg text-brand-grey hover:text-brand-black hover:bg-brand-light-grey/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulaire Scrollable */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {erreur && (
            <div className="flex items-center gap-2 p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-xl font-medium">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{erreur}</span>
            </div>
          )}

          {/* ============================================================ */}
          {/* SECTION 1 : SOURCE & CANAL DE VENTE */}
          {/* ============================================================ */}
          <div className="rounded-xl border border-brand-light-grey/80 dark:border-white/10 p-4 bg-brand-light-grey/10 dark:bg-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] text-white">1</span>
                Source & Canal de Vente
              </label>
              <span className="text-[11px] font-semibold text-slate-500">
                Caisse affectée : <strong className={caisse === "CAISSE_YALIDINE" ? "text-blue-600" : "text-emerald-600"}>
                  {caisse === "CAISSE_YALIDINE" ? "Caisse Yalidine (Recouvrement)" : "Caisse Physique (Magasin)"}
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "COMPTOIR", label: "Comptoir", icon: Store, color: "hover:border-slate-400" },
                { id: "YALIDINE", label: "Yalidine", icon: Truck, color: "hover:border-blue-400" },
                { id: "OUEDKNISS", label: "Ouedkniss", icon: Tag, color: "hover:border-amber-400" },
                { id: "TELEPHONE", label: "Téléphone", icon: Phone, color: "hover:border-emerald-400" },
                { id: "FACEBOOK", label: "Facebook / RS", icon: Share2, color: "hover:border-indigo-400" },
              ].map((c) => {
                const Icon = c.icon;
                const actif = canal === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setCanal(c.id as CanalVente)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition ${c.color} ${
                      actif
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange shadow-sm"
                        : "border-brand-light-grey bg-brand-white dark:bg-brand-paper text-brand-black dark:text-white"
                    }`}
                  >
                    <Icon className="w-5 h-5 mb-1" />
                    <span>{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================================ */}
          {/* SECTION 2 : COORDONNÉES CLIENT & EXPÉDITION */}
          {/* ============================================================ */}
          <div className="rounded-xl border border-brand-light-grey/80 dark:border-white/10 p-4 bg-brand-light-grey/10 dark:bg-white/5 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey flex items-center gap-1.5">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] text-white">2</span>
              Client & Expédition
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-brand-black dark:text-white mb-1">
                  Nom complet du client <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={clientNom}
                  onChange={(e) => setClientNom(e.target.value)}
                  placeholder="Ex: Karim Benali"
                  className="w-full rounded-xl border border-brand-light-grey bg-brand-white dark:bg-black/20 px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-brand-black dark:text-white mb-1">
                  Numéro de téléphone <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={clientTel}
                  onChange={(e) => setClientTel(e.target.value)}
                  placeholder="Ex: 0550 12 34 56"
                  className="w-full rounded-xl border border-brand-light-grey bg-brand-white dark:bg-black/20 px-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            {/* Champs d'expédition si Yalidine ou demandée */}
            {estExpedition ? (
              <div className="p-3.5 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-blue-800 dark:text-blue-300">
                  <Truck className="w-4 h-4" />
                  <span>Détails de Livraison Yalidine</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Wilaya <span className="text-danger">*</span>
                    </label>
                    <select
                      value={wilaya}
                      onChange={(e) => setWilaya(e.target.value)}
                      className="w-full rounded-xl border border-blue-200 bg-white dark:bg-black/40 px-3 py-2 text-xs font-semibold focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Sélectionner la wilaya...</option>
                      {WILAYAS_ALGERIE.map((w) => (
                        <option key={w.code} value={`${w.code} - ${w.nom}`}>
                          {w.code} - {w.nom}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Commune <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={commune}
                      onChange={(e) => setCommune(e.target.value)}
                      placeholder="Ex: Bab Ezzouar"
                      className="w-full rounded-xl border border-blue-200 bg-white dark:bg-black/40 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Frais de port (DA)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={fraisLivraison}
                      onChange={(e) => setFraisLivraison(Math.max(0, Number(e.target.value) || 0))}
                      placeholder="Ex: 800"
                      className="w-full rounded-xl border border-blue-200 bg-white dark:bg-black/40 px-3 py-2 text-xs font-bold focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Adresse complète / Point relais
                  </label>
                  <input
                    type="text"
                    value={adresse}
                    onChange={(e) => setAdresse(e.target.value)}
                    placeholder="Ex: Cité 500 logts Bâtiment B, ou Agence Yalidine"
                    className="w-full rounded-xl border border-blue-200 bg-white dark:bg-black/40 px-3 py-2 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-start">
                <button
                  type="button"
                  onClick={() => setWilaya("16 - Alger")}
                  className="text-xs text-brand-orange hover:underline flex items-center gap-1 font-semibold"
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Ajouter une adresse de livraison / expédition
                </button>
              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* SECTION 3 : PANIER & SÉLECTION D'ARTICLES EN STOCK */}
          {/* ============================================================ */}
          <div className="rounded-xl border border-brand-light-grey/80 dark:border-white/10 p-4 bg-brand-light-grey/10 dark:bg-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-brand-warm-grey flex items-center gap-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-orange text-[10px] text-white">3</span>
                Panier & Réservation de Stock
              </label>
              <span className="text-[11px] text-brand-warm-grey">
                {panier.length} article{panier.length > 1 ? "s" : ""} dans la commande
              </span>
            </div>

            {/* Barre de recherche d'articles */}
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3 text-brand-grey" />
                <input
                  type="text"
                  value={rechercheProduit}
                  onChange={(e) => setRechercheProduit(e.target.value)}
                  placeholder="Rechercher un produit disponible (Désignation, code P-XXXX, numéro de série...)"
                  className="w-full rounded-xl border border-brand-light-grey bg-brand-white dark:bg-black/20 pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-brand-orange"
                />
              </div>

              {/* Résultats de recherche déroulants */}
              {rechercheProduit.trim().length >= 2 && (
                <div className="absolute top-full left-0 right-0 z-30 mt-1 rounded-xl border border-brand-light-grey bg-brand-white dark:bg-brand-paper shadow-xl max-h-60 overflow-y-auto">
                  {chargementRecherche ? (
                    <div className="p-3 text-center text-xs text-brand-grey">Recherche en cours...</div>
                  ) : resultatsRecherche.length === 0 ? (
                    <div className="p-3 text-center text-xs text-brand-grey">Aucun produit disponible trouvé.</div>
                  ) : (
                    resultatsRecherche.map((p) => (
                      <div
                        key={p.id}
                        onClick={() => ajouterAuPanier(p)}
                        className="flex items-center justify-between p-2.5 hover:bg-brand-orange/10 cursor-pointer border-b border-brand-light-grey/30 last:border-0 transition"
                      >
                        <div>
                          <div className="text-xs font-bold text-brand-black dark:text-white">
                            {p.reference || p.code_interne}
                          </div>
                          <div className="text-[10px] text-brand-warm-grey font-mono">
                            {p.code_interne} {p.numero_serie && `· S/N: ${p.numero_serie}`}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-xs text-brand-orange">
                            {formaterDA(p.prix_vente_fixe || 0)}
                          </span>
                          <button
                            type="button"
                            className="p-1 rounded-lg bg-brand-orange text-white text-xs hover:bg-brand-orange/90"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Tableau des articles dans le panier */}
            {panier.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white dark:bg-brand-paper">
                <table className="w-full text-left text-xs">
                  <thead className="bg-brand-light-grey/30 dark:bg-black/20 text-brand-warm-grey">
                    <tr>
                      <th className="py-2 px-3">Article</th>
                      <th className="py-2 px-3">Code / S/N</th>
                      <th className="py-2 px-3 text-center w-16">Qté</th>
                      <th className="py-2 px-3 text-right">Prix Unitaire (DA)</th>
                      <th className="py-2 px-3 text-center w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-light-grey/30 dark:divide-white/5">
                    {panier.map((item, idx) => (
                      <tr key={idx} className="hover:bg-brand-light-grey/10">
                        <td className="py-2.5 px-3 font-semibold text-brand-black dark:text-white">
                          {item.designation}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-brand-warm-grey">
                          {item.code_interne} {item.numero_serie && `· ${item.numero_serie}`}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <input
                            type="number"
                            min={1}
                            value={item.quantite}
                            onChange={(e) => modifierQuantite(idx, Number(e.target.value))}
                            className="w-14 text-center rounded-lg border border-brand-light-grey bg-transparent px-1 py-1 text-xs font-bold focus:outline-none focus:border-brand-orange"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <input
                            type="number"
                            min={0}
                            value={item.prix_unitaire}
                            onChange={(e) => modifierPrixLigne(idx, Number(e.target.value) || 0)}
                            className="w-24 text-right rounded-lg border border-brand-light-grey bg-transparent px-2 py-1 text-xs font-bold focus:outline-none focus:border-brand-orange"
                          />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => supprimerDuPanier(idx)}
                            className="text-danger hover:text-danger/80 p-1 transition"
                            title="Retirer du panier"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center rounded-xl border border-dashed border-brand-light-grey text-xs text-brand-grey">
                Le panier est vide. Utilisez la barre de recherche ci-dessus pour ajouter des articles en stock.
              </div>
            )}

            {/* Options financières & statut de paiement */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              {/* Toggle de paiement */}
              <div className="p-3 rounded-xl border border-brand-light-grey bg-brand-white dark:bg-brand-paper flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-brand-black dark:text-white flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-brand-orange" />
                    <span>Statut du Règlement</span>
                  </div>
                  <p className="text-[10px] text-brand-warm-grey mt-0.5">
                    {estPayee ? "Paiement déjà encaissé" : "Paiement à la livraison / à terme (COD)"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEstPayee(!estPayee)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    estPayee ? "bg-emerald-600" : "bg-slate-300 dark:bg-slate-700"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      estPayee ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              {/* Remise globale */}
              <div className="p-3 rounded-xl border border-brand-light-grey bg-brand-white dark:bg-brand-paper flex items-center justify-between">
                <span className="text-xs font-bold text-brand-black dark:text-white">Remise Globale (DA)</span>
                <input
                  type="number"
                  min={0}
                  value={remiseGlobale}
                  onChange={(e) => setRemiseGlobale(Math.max(0, Number(e.target.value) || 0))}
                  placeholder="0"
                  className="w-24 text-right rounded-lg border border-brand-light-grey bg-transparent px-2 py-1 text-xs font-bold focus:outline-none focus:border-brand-orange"
                />
              </div>
            </div>

            {/* Récapitulatif Financier */}
            <div className="p-4 rounded-xl bg-brand-orange/5 border border-brand-orange/20 space-y-1.5 text-xs">
              <div className="flex justify-between text-brand-warm-grey">
                <span>Sous-total articles :</span>
                <span>{formaterDA(sousTotal)}</span>
              </div>
              {estExpedition && (
                <div className="flex justify-between text-blue-700 dark:text-blue-300">
                  <span>Frais de livraison (Yalidine) :</span>
                  <span>+{formaterDA(fraisLivraison)}</span>
                </div>
              )}
              {remiseGlobale > 0 && (
                <div className="flex justify-between text-danger">
                  <span>Remise appliquée :</span>
                  <span>-{formaterDA(remiseGlobale)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-brand-black dark:text-white pt-2 border-t border-brand-orange/20">
                <span>Total Net Commande :</span>
                <span className="text-brand-orange">{formaterDA(totalTTC)}</span>
              </div>
            </div>
          </div>
        </form>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/20 dark:bg-black/20">
          <button
            type="button"
            onClick={onFermer}
            disabled={soumission}
            className="px-4 py-2 rounded-xl border border-brand-light-grey bg-brand-white dark:bg-brand-paper text-xs font-semibold hover:bg-brand-light-grey/50 transition"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={soumission || panier.length === 0}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-brand-orange text-white text-xs font-bold hover:bg-brand-orange/90 transition shadow-md disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{soumission ? "Création en cours..." : "Créer et Réserver le Stock"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
