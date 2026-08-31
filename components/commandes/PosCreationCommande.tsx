"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  Search, 
  Barcode, 
  Plus, 
  Minus, 
  Trash2, 
  UserPlus, 
  CreditCard, 
  Receipt, 
  Check, 
  Percent, 
  X,
  UserCheck,
  RotateCcw,
  Sparkles,
  Layers,
  FileText,
  Clock,
  CheckCircle2,
  Wrench,
  Monitor,
  Laptop
} from "lucide-react";
import { formaterDA } from "@/lib/caisse";
import { useToast } from "@/components/toast";

interface LignePanier {
  produit_id?: number;
  modele_id?: number;
  code_interne: string;
  designation: string;
  numero_serie?: string;
  categorie?: string;
  prix_unitaire: number;
  quantite: number;
  remise_ligne: number;
}

interface ClientOption {
  id: number;
  nom: string;
  telephone?: string;
  email?: string;
  adresse?: string;
}

export default function PosCreationCommande() {
  const router = useRouter();
  const { afficher } = useToast();

  const [recherche, setRecherche] = useState("");
  const [rechercheLoading, setRechercheLoading] = useState(false);
  const [resultatsRecherche, setResultatsRecherche] = useState<any[]>([]);

  // Panier
  const [panier, setPanier] = useState<LignePanier[]>([]);
  const [remiseGlobale, setRemiseGlobale] = useState<number>(0);
  const [garantieMois, setGarantieMois] = useState<number>(6);
  const [notes, setNotes] = useState<string>("");

  // Client
  const [clientSelectionne, setClientSelectionne] = useState<ClientOption | null>(null);
  const [modalClient, setModalClient] = useState(false);
  const [rechercheClient, setRechercheClient] = useState("");
  const [clientsTrouves, setClientsTrouves] = useState<ClientOption[]>([]);
  const [formNouveauClient, setFormNouveauClient] = useState({ nom: "", telephone: "", email: "", adresse: "" });
  const [ongetClient, setOngletClient] = useState<"recherche" | "nouveau">("recherche");

  // Modale Paiement
  const [modalPaiement, setModalPaiement] = useState(false);
  const [statutVente, setStatutVente] = useState<"payee" | "en_attente" | "devis">("payee");
  const [typePaiement, setTypePaiement] = useState<"especes" | "carte" | "virement" | "cheque">("especes");
  const [montantRecu, setMontantRecu] = useState<string>("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const inputScannerRef = useRef<HTMLInputElement>(null);

  // Focus permanent sur le scanner
  useEffect(() => {
    inputScannerRef.current?.focus();
  }, []);

  // Recherche automatique au scan ou saisie
  useEffect(() => {
    const q = recherche.trim();
    if (!q || q.length < 2) {
      setResultatsRecherche([]);
      return;
    }

    const timer = setTimeout(async () => {
      setRechercheLoading(true);
      try {
        const res = await fetch(`/api/recherche?q=${encodeURIComponent(q)}&disponibles=1`);
        if (res.ok) {
          const data = await res.json();
          // Si le scan correspond exactement à un code_interne ou un S/N unique, on l'ajoute immédiatement
          if (data.produits && data.produits.length === 1 && (
            data.produits[0].code_interne.toLowerCase() === q.toLowerCase() ||
            (data.produits[0].numero_serie && data.produits[0].numero_serie.toLowerCase() === q.toLowerCase())
          )) {
            ajouterProduitAuPanier(data.produits[0]);
            setRecherche("");
            setResultatsRecherche([]);
          } else {
            setResultatsRecherche(data.produits || []);
          }
        }
      } catch (err) {
        console.error("Erreur recherche scan:", err);
      } finally {
        setRechercheLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [recherche]);

  // Recherche de clients
  useEffect(() => {
    if (ongetClient !== "recherche" || !modalClient) return;
    const q = rechercheClient.trim();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clients?q=${encodeURIComponent(q)}`);
        if (res.ok) {
          const data = await res.json();
          setClientsTrouves(data);
        }
      } catch (err) {
        console.error("Erreur recherche clients:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [rechercheClient, ongetClient, modalClient]);

  // Ajouter un produit physique sérialisé au panier
  const ajouterProduitAuPanier = (p: any) => {
    // Vérifier si le produit est déjà dans le panier
    if (panier.some((l) => l.produit_id === p.id)) {
      afficher(`L'exemplaire ${p.code_interne} est déjà dans le panier.`, "erreur");
      return;
    }

    const nouvelleLigne: LignePanier = {
      produit_id: p.id,
      code_interne: p.code_interne,
      designation: p.reference,
      numero_serie: p.numero_serie,
      categorie: p.categorie,
      prix_unitaire: p.prix_vente_fixe || p.prix_vente_conseille || 0,
      quantite: 1,
      remise_ligne: 0,
    };

    setPanier((prev) => [nouvelleLigne, ...prev]);
    afficher(`Ajouté : ${p.reference} (${p.code_interne})`, "succes");
    inputScannerRef.current?.focus();
  };

  // Ajouter un service ou article rapide (Quick Pick)
  const ajouterQuickPick = (designation: string, prix: number, categorie = "Service") => {
    const nouvelleLigne: LignePanier = {
      code_interne: "SRV-" + Math.floor(1000 + Math.random() * 9000),
      designation,
      categorie,
      prix_unitaire: prix,
      quantite: 1,
      remise_ligne: 0,
    };
    setPanier((prev) => [nouvelleLigne, ...prev]);
    afficher(`Ajouté : ${designation}`, "succes");
    inputScannerRef.current?.focus();
  };

  const modifierQuantite = (index: number, delta: number) => {
    setPanier((prev) =>
      prev
        .map((ligne, idx) => {
          if (idx === index) {
            // Si c'est un exemplaire sérialisé physique, la quantité reste 1
            if (ligne.produit_id && delta > 0) {
              afficher("Les ordinateurs sérialisés sont gérés à l'unité (1 exemplaire = 1 S/N unique).", "info");
              return ligne;
            }
            const nvQte = ligne.quantite + delta;
            return nvQte > 0 ? { ...ligne, quantite: nvQte } : null;
          }
          return ligne;
        })
        .filter(Boolean) as LignePanier[]
    );
  };

  const modifierPrixLigne = (index: number, nouveauPrix: number) => {
    setPanier((prev) =>
      prev.map((ligne, idx) => (idx === index ? { ...ligne, prix_unitaire: Math.max(0, nouveauPrix) } : ligne))
    );
  };

  const supprimerLigne = (index: number) => {
    setPanier((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Calculs financiers
  const sousTotal = useMemo(() => {
    return panier.reduce((acc, l) => acc + (l.prix_unitaire * l.quantite - l.remise_ligne), 0);
  }, [panier]);

  const totalFinal = Math.max(0, sousTotal - remiseGlobale);
  const monnaieARendre = montantRecu ? Math.max(0, Number(montantRecu) - totalFinal) : 0;

  // Création rapide de client
  const creerClientRapide = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formNouveauClient.nom.trim()) return;

    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formNouveauClient),
      });

      if (!res.ok) throw new Error("Erreur création client");
      const client = await res.json();
      setClientSelectionne(client);
      setModalClient(false);
      afficher(`Client « ${client.nom} » associé.`, "succes");
    } catch (err: any) {
      afficher(err.message || "Erreur client.", "erreur");
    }
  };

  // Validation Finale de la Commande
  const validerCommande = async () => {
    if (panier.length === 0) return;

    setEnvoiEnCours(true);

    try {
      const payload = {
        client_id: clientSelectionne?.id || null,
        client_nom: clientSelectionne?.nom || "Client Comptoir",
        client_tel: clientSelectionne?.telephone || null,
        client_adresse: clientSelectionne?.adresse || null,
        statut: statutVente,
        type_paiement: typePaiement,
        remise_globale: remiseGlobale,
        garantie_mois: garantieMois,
        notes,
        lignes: panier.map((l) => ({
          produit_id: l.produit_id || null,
          modele_id: l.modele_id || null,
          code_interne: l.code_interne,
          designation: l.designation,
          numero_serie: l.numero_serie || null,
          categorie: l.categorie || null,
          quantite: l.quantite,
          prix_unitaire: l.prix_unitaire,
          remise_ligne: l.remise_ligne,
        })),
      };

      const res = await fetch("/api/commandes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Erreur lors de la validation");
      }

      const commande = await res.json();
      afficher(`Vente ${commande.numero} enregistrée avec succès !`, "succes");
      setModalPaiement(false);
      router.push(`/commandes/${commande.id}`);
    } catch (err: any) {
      afficher(err.message || "Erreur enregistrement vente.", "erreur");
    } finally {
      setEnvoiEnCours(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-[calc(100dvh-4rem)] lg:h-[calc(100dvh-4rem)] gap-4 p-3 sm:p-4 bg-slate-100 dark:bg-zinc-950 font-sans">
      
      {/* ===================== PANNEAU GAUCHE : RECHERCHE SCANNER & QUICK PICKS ===================== */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-5 shadow-sm overflow-hidden">
        
        {/* Scanner-First Input */}
        <div className="relative mb-4">
          <div className="absolute left-4 top-3.5 p-1 rounded-lg bg-brand-orange/15 text-brand-orange">
            <Barcode className="w-6 h-6" />
          </div>
          <input
            ref={inputScannerRef}
            type="text"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            placeholder="Scannez un Code-Barres, S/N ou saisissez une désignation..."
            className="w-full h-16 pl-16 pr-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border-2 border-slate-200 dark:border-zinc-700 text-base font-bold text-slate-900 dark:text-white focus:border-brand-orange focus:outline-none transition-all shadow-inner"
          />
        </div>

        {/* Résultats de recherche dynamique */}
        {resultatsRecherche.length > 0 && (
          <div className="mb-4 p-3 bg-slate-50 dark:bg-zinc-800/80 rounded-2xl border border-slate-200 dark:border-zinc-700 max-h-48 overflow-y-auto space-y-1.5 animate-entree">
            <span className="text-[11px] font-black uppercase text-brand-orange block px-1">
              Résultats trouvés ({resultatsRecherche.length}) :
            </span>
            {resultatsRecherche.map((p) => (
              <div
                key={p.id}
                onClick={() => {
                  ajouterProduitAuPanier(p);
                  setRecherche("");
                  setResultatsRecherche([]);
                }}
                className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 hover:border-brand-orange cursor-pointer flex items-center justify-between transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span className="font-mono text-brand-orange">{p.code_interne}</span>
                    <span>{p.reference}</span>
                  </div>
                  {p.numero_serie && (
                    <span className="text-[10px] font-mono text-slate-400">S/N: {p.numero_serie}</span>
                  )}
                </div>
                <div className="text-xs font-black font-mono text-slate-900 dark:text-white">
                  {formaterDA(p.prix_vente_fixe || 0)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Picks / Prestations & Accessoires Fréquents */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-slate-500">
              Services & Accessoires Rapides
            </span>
            <span className="text-[11px] font-bold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
              1-Clic
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { nom: "Installation Windows & Pilotes", prix: 2000, cat: "Atelier", icon: Laptop },
              { nom: "Nettoyage & Pâte Thermique", prix: 2500, cat: "Atelier", icon: Wrench },
              { nom: "Diagnostic & Devis Réparation", prix: 1000, cat: "Atelier", icon: Monitor },
              { nom: "Câble HDMI 4K 1.5m", prix: 600, cat: "Accessoires", icon: Layers },
              { nom: "Souris Optique USB Ergonomique", prix: 1200, cat: "Accessoires", icon: Sparkles },
              { nom: "Chargeur Universel PC 65W", prix: 3500, cat: "Accessoires", icon: Laptop },
            ].map((qp, idx) => {
              const IconComp = qp.icon;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => ajouterQuickPick(qp.nom, qp.prix, qp.cat)}
                  className="p-4 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/30 hover:border-brand-orange hover:bg-brand-orange/5 text-left transition-all flex flex-col justify-between min-h-[105px] active:scale-98 shadow-xs"
                >
                  <div className="flex items-start justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{qp.cat}</span>
                    <IconComp className="w-4 h-4 text-brand-orange" />
                  </div>
                  <div className="text-xs font-black text-slate-900 dark:text-white line-clamp-2 my-1 leading-snug">
                    {qp.nom}
                  </div>
                  <div className="text-sm font-black text-brand-orange font-mono">
                    {formaterDA(qp.prix)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* ===================== PANNEAU DROIT : TICKET DE CAISSE / PANIER ===================== */}
      <div className="w-full lg:w-[480px] flex flex-col bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-sm overflow-hidden">
        
        {/* Header Ticket + Client */}
        <div className="p-4 border-b border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-800/20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-brand-orange" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
              Ticket de Vente
            </h2>
          </div>

          <button
            type="button"
            onClick={() => setModalClient(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-brand-orange shadow-xs"
          >
            {clientSelectionne ? <UserCheck className="w-4 h-4 text-emerald-500" /> : <UserPlus className="w-4 h-4 text-brand-orange" />}
            <span className="truncate max-w-[130px]">{clientSelectionne ? clientSelectionne.nom : "Associer Client"}</span>
          </button>
        </div>

        {/* Liste des Lignes du Panier */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {panier.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2 py-12">
              <Barcode className="w-12 h-12 stroke-1 text-slate-300 dark:text-zinc-700" />
              <p className="text-xs font-bold text-center">Panier vide. Scannez un article pour commencer la vente.</p>
            </div>
          ) : (
            panier.map((ligne, idx) => (
              <div
                key={`${ligne.code_interne}_${idx}`}
                className="p-3.5 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-800/30 space-y-2.5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-black text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                      {ligne.code_interne}
                    </span>
                    <div className="text-xs sm:text-sm font-black text-slate-900 dark:text-white mt-1 leading-snug">
                      {ligne.designation}
                    </div>
                    {ligne.numero_serie && (
                      <span className="text-[10px] font-mono text-slate-500 font-bold block mt-0.5">
                        S/N : {ligne.numero_serie}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => supprimerLigne(idx)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-zinc-800/60">
                  {/* Contrôles Quantité Tactiles */}
                  <div className="flex items-center border border-slate-200 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-800 overflow-hidden shadow-xs">
                    <button
                      type="button"
                      onClick={() => modifierQuantite(idx, -1)}
                      className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-zinc-700"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-9 text-center text-xs font-black font-mono">{ligne.quantite}</span>
                    <button
                      type="button"
                      onClick={() => modifierQuantite(idx, 1)}
                      className="w-9 h-9 flex items-center justify-center text-slate-600 dark:text-slate-300 active:bg-slate-100 dark:active:bg-zinc-700"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Prix Unitaire Éditables */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      value={ligne.prix_unitaire}
                      onChange={(e) => modifierPrixLigne(idx, Number(e.target.value))}
                      className="input input-xs w-24 text-right font-mono font-black text-xs rounded-xl border-slate-200 dark:border-zinc-700"
                    />
                    <span className="font-mono font-black text-sm text-slate-900 dark:text-white">
                      {formaterDA(ligne.prix_unitaire * ligne.quantite - ligne.remise_ligne)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer Sticky Totaux & Bouton d'Encaissement */}
        <div className="p-5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-800/40 space-y-3.5">
          <div className="space-y-1.5 text-xs font-semibold text-slate-500">
            <div className="flex justify-between">
              <span>Sous-total Brut</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">{formaterDA(sousTotal)}</span>
            </div>

            {/* Remise commerciale globale */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1 text-slate-500">
                <Percent className="w-3.5 h-3.5 text-brand-orange" /> Remise commerciale
              </span>
              <input
                type="number"
                min="0"
                value={remiseGlobale || ""}
                onChange={(e) => setRemiseGlobale(Number(e.target.value) || 0)}
                placeholder="0 DA"
                className="input input-xs w-24 text-right font-mono font-bold text-xs rounded-lg border-slate-200 dark:border-zinc-700 text-red-600"
              />
            </div>

            <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 dark:border-zinc-700">
              <span className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Net à Payer</span>
              <span className="text-2xl font-black font-mono text-brand-orange">{formaterDA(totalFinal)}</span>
            </div>
          </div>

          <button
            type="button"
            disabled={panier.length === 0}
            onClick={() => setModalPaiement(true)}
            className="w-full h-16 rounded-2xl bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-base uppercase tracking-wider shadow-lg shadow-brand-orange/25 flex items-center justify-center gap-2 active:scale-98 transition-all disabled:opacity-40"
          >
            <CreditCard className="w-5 h-5" />
            Encaisser ({formaterDA(totalFinal)})
          </button>
        </div>

      </div>

      {/* ===================== MODALE D'ASSOCIATION / CRÉATION CLIENT ===================== */}
      {modalClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-entree">
          <div className="w-full max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Sélection du Client
              </h3>
              <button onClick={() => setModalClient(false)} className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Onglets Recherche vs Nouveau */}
            <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setOngletClient("recherche")}
                className={`flex-1 py-2.5 min-h-[44px] text-xs font-black rounded-lg transition-all ${
                  ongetClient === "recherche" ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs" : "text-slate-500"
                }`}
              >
                Rechercher un Client
              </button>
              <button
                type="button"
                onClick={() => setOngletClient("nouveau")}
                className={`flex-1 py-2.5 min-h-[44px] text-xs font-black rounded-lg transition-all ${
                  ongetClient === "nouveau" ? "bg-white dark:bg-zinc-900 text-brand-orange shadow-xs" : "text-slate-500"
                }`}
              >
                + Nouveau Client
              </button>
            </div>

            {ongetClient === "recherche" ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={rechercheClient}
                  onChange={(e) => setRechercheClient(e.target.value)}
                  placeholder="Rechercher par nom, téléphone ou RC..."
                  className="input w-full h-12 min-h-[48px] rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-base font-bold"
                />

                <div className="max-h-48 overflow-y-auto space-y-1.5">
                  <div
                    onClick={() => {
                      setClientSelectionne(null);
                      setModalClient(false);
                    }}
                    className="p-3 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-brand-orange cursor-pointer text-xs font-bold text-slate-500 text-center"
                  >
                    Client de passage (Anonyme)
                  </div>

                  {clientsTrouves.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setClientSelectionne(c);
                        setModalClient(false);
                        afficher(`Client ${c.nom} sélectionné.`, "succes");
                      }}
                      className="p-3 rounded-xl border border-slate-200 dark:border-zinc-800 hover:border-brand-orange cursor-pointer flex justify-between items-center transition-all"
                    >
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-white">{c.nom}</div>
                        {c.telephone && <div className="text-[10px] text-slate-400">{c.telephone}</div>}
                      </div>
                      <Check className="w-4 h-4 text-brand-orange" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <form onSubmit={creerClientRapide} className="space-y-3">
                <div>
                  <label className="text-xs font-bold uppercase text-slate-500">Nom / Raison Sociale *</label>
                  <input
                    type="text"
                    required
                    value={formNouveauClient.nom}
                    onChange={(e) => setFormNouveauClient({ ...formNouveauClient, nom: e.target.value })}
                    placeholder="Ex. Sarl Numidia Tech ou Karim Benali"
                    className="input w-full h-12 min-h-[48px] rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-base font-bold"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Téléphone</label>
                    <input
                      type="text"
                      value={formNouveauClient.telephone}
                      onChange={(e) => setFormNouveauClient({ ...formNouveauClient, telephone: e.target.value })}
                      placeholder="0550 00 00 00"
                      className="input w-full h-12 min-h-[48px] rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-base font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase text-slate-500">Email</label>
                    <input
                      type="email"
                      value={formNouveauClient.email}
                      onChange={(e) => setFormNouveauClient({ ...formNouveauClient, email: e.target.value })}
                      placeholder="contact@client.dz"
                      className="input w-full h-12 min-h-[48px] rounded-xl bg-slate-50 dark:bg-zinc-800 border-slate-200 dark:border-zinc-700 text-base font-bold"
                    />
                  </div>
                </div>
                <button type="submit" className="btn btn-primaire w-full h-12 min-h-[48px] rounded-xl font-black text-xs">
                  Enregistrer & Associer
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* ===================== MODALE DE PAIEMENT & VALIDATION ===================== */}
      {modalPaiement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/40 backdrop-blur-sm animate-entree">
          <div className="w-full max-w-[95vw] sm:max-w-lg max-h-[90dvh] overflow-y-auto bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl shadow-2xl p-4 sm:p-6 space-y-4 sm:space-y-5">
            
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                Validation & Paiement
              </h3>
              <button onClick={() => setModalPaiement(false)} className="h-10 w-10 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl p-1 text-slate-400 hover:text-slate-900">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type d'opération (Vente Comptant vs Devis vs En attente) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-slate-500">Type de Document</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "payee", label: "Vente Payée", desc: "Déstockage immédiat" },
                  { id: "en_attente", label: "En Attente", desc: "Commande réservée" },
                  { id: "devis", label: "Devis Proforma", desc: "Sans déstockage" },
                ].map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStatutVente(st.id as any)}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      statutVente === st.id
                        ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                        : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 text-slate-600 dark:text-slate-300"
                    }`}
                  >
                    <div className="text-xs font-black">{st.label}</div>
                    <div className="text-[10px] opacity-70 mt-0.5">{st.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mode de Paiement */}
            {statutVente === "payee" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase text-slate-500">Mode de Règlement</label>
                <div className="grid grid-cols-4 gap-2">
                  {(["especes", "carte", "virement", "cheque"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setTypePaiement(mode)}
                      className={`h-11 rounded-xl border text-xs font-black uppercase tracking-wider transition-all ${
                        typePaiement === mode
                          ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                          : "border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/40 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Calcul de Monnaie */}
            {statutVente === "payee" && typePaiement === "especes" && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200 dark:border-zinc-700 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500">Total à payer :</span>
                  <span className="text-lg font-black font-mono text-brand-orange">{formaterDA(totalFinal)}</span>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase text-slate-500 block mb-1">Montant Reçu (DA)</label>
                  <input
                    type="number"
                    value={montantRecu}
                    onChange={(e) => setMontantRecu(e.target.value)}
                    placeholder={String(totalFinal)}
                    className="input w-full h-12 rounded-xl text-right font-mono font-black text-lg"
                  />
                </div>

                {monnaieARendre > 0 && (
                  <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                    <span>Monnaie à rendre :</span>
                    <span className="font-mono font-black text-lg">{formaterDA(monnaieARendre)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Durée de garantie */}
            <div className="flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-800/20">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Garantie Matériel :</span>
              <select
                value={garantieMois}
                onChange={(e) => setGarantieMois(Number(e.target.value))}
                className="select select-sm rounded-xl font-bold border-slate-200 dark:border-zinc-700 text-xs"
              >
                <option value={1}>1 Mois</option>
                <option value={3}>3 Mois</option>
                <option value={6}>6 Mois (Standard)</option>
                <option value={12}>12 Mois (1 An)</option>
                <option value={24}>24 Mois (2 Ans)</option>
              </select>
            </div>

            <button
              type="button"
              disabled={envoiEnCours}
              onClick={validerCommande}
              className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-base uppercase tracking-wider shadow-lg flex items-center justify-center gap-2"
            >
              {envoiEnCours ? (
                <span>Validation en cours...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" />
                  Valider & Générer la Facture
                </>
              )}
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
