"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/contexte";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";
import { rechercheTolérante } from "@/lib/recherche";
import { useSearchParams, useRouter } from "next/navigation";
import type { Role } from "@prisma/client";
import Modale from "@/components/Modale";
import VisionneusePhotos from "@/components/VisionneusePhotos";
import { useToast } from "@/components/toast";
import { useLayer, LAYER_PRIORITY } from "@/hooks/useLayerStack";
import { formaterDA } from "@/lib/caisse";
import RechercheRapide from "@/components/RechercheRapide";
import {
  IconeAlerte,
  IconeBillet,
  IconeCoche,
  IconeImage,
  IconePaquet,
  IconeRecherche,
  IconeStore,
  IconeCorbeille,
  IconePause,
  IconePlus,
  IconeMoins,
  IconeFermer,
} from "@/components/icons";

interface CarteEnVente {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  prix_achat: number;
  cout_reparations: number;
  prix_vente_fixe: number | null;
  marge_prevue: number;
  jours_en_vente: number;
  image_url: string | null;
  images: string[];
}

interface GroupeEnVente {
  cle: string;
  reference: string;
  categorie: string;
  prix_vente_fixe: number | null;
  marge_prevue: number;
  jours_en_vente: number;
  image_url: string | null;
  images: string[];
  unites: CarteEnVente[];
}

function grouperDoublonsVente(cartes: CarteEnVente[]): GroupeEnVente[] {
  const map = new Map<string, GroupeEnVente>();
  for (const c of cartes) {
    const cle = `${c.reference.toLowerCase().trim()}|${c.categorie.toLowerCase().trim()}`;
    const existant = map.get(cle);
    if (existant) {
      existant.unites.push(c);
    } else {
      map.set(cle, {
        cle,
        reference: c.reference,
        categorie: c.categorie,
        prix_vente_fixe: c.prix_vente_fixe,
        marge_prevue: c.marge_prevue,
        jours_en_vente: c.jours_en_vente,
        image_url: c.image_url,
        images: c.images,
        unites: [c],
      });
    }
  }
  return Array.from(map.values());
}

interface LigneVente {
  id: number;
  produit_id: number;
  code_interne: string;
  reference: string;
  image_url: string | null;
  prix_vente_reel: number;
  marge: number;
  canal: string | null;
  date_vente: string;
  vendeur: string;
  vendeur_id: number;
  annulee: boolean;
  motif_annulation: string | null;
  groupe_vente: string | null;
}

interface ReponseHistorique {
  ventes: LigneVente[];
  vendeurs: { id: number; username: string }[];
  totaux: { nombre: number; chiffre_affaires: number; marge: number };
}

const CANAUX = ["Ouedkniss", "Facebook", "direct"];

function aujourdhuiIso() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

function playBeep(success: boolean) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    if (success) {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } else {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    }
  } catch (e) {
    console.error("Audio API error", e);
  }
}

function HorlogeLive() {
  const [temps, setTemps] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTemps(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="flex flex-col text-right ml-4 border-l border-white/20 pl-4">
      <span className="font-black text-xl leading-none text-white tracking-widest">
        {temps.toLocaleTimeString("fr-DZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
      </span>
      <span className="text-[10px] text-brand-warm-grey uppercase tracking-wider block mt-1">
        {temps.toLocaleDateString("fr-DZ", { weekday: "short", day: "2-digit", month: "short" })}
      </span>
    </div>
  );
}

function UptimeCaisse() {
  const [debut] = useState(new Date());
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsed(Math.floor((Date.now() - debut.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [debut]);

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  
  const formatted = [
    h.toString().padStart(2, '0'),
    m.toString().padStart(2, '0'),
    s.toString().padStart(2, '0')
  ].join(':');

  return (
    <div className="flex flex-col text-right ml-4 border-l border-white/20 pl-4">
      <span className="font-black text-xl leading-none text-brand-orange tracking-widest font-mono">
        {formatted}
      </span>
      <span className="text-[10px] text-brand-warm-grey uppercase tracking-wider block mt-1">
        Session Caisse
      </span>
    </div>
  );
}

export default function CaisseClient({ role }: { role: Role }) {
  const { afficher } = useToast();
  const t = useT();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [initTermine, setInitTermine] = useState(false);
  const [onglet, setOnglet] = useState<"en_vente" | "historique">("en_vente");
  const [envoi, setEnvoi] = useState(false);
  const [statsJour, setStatsJour] = useState<{ total: number; nombre: number } | null>(null);
  const [statsJourErreur, setStatsJourErreur] = useState<string | null>(null);

  const chargerStatsJour = useCallback(async () => {
    try {
      const res = await fetch("/api/caisse/stats-jour");
      if (res.ok) {
        setStatsJour(await res.json());
        setStatsJourErreur(null);
      } else {
        setStatsJourErreur("Erreur de chargement des statistiques.");
      }
    } catch (e) {
      console.error(e);
      setStatsJourErreur("Impossible de joindre le serveur.");
    }
  }, []);

  const [cartes, setCartes] = useState<CarteEnVente[] | null>(null);
  const [erreurCartes, setErreurCartes] = useState<string | null>(null);
  const [modalVente, setModalVente] = useState<GroupeEnVente | null>(null);
  const [quantiteVente, setQuantiteVente] = useState(1);
  const [modalRetrait, setModalRetrait] = useState<GroupeEnVente | null>(null);
  const [quantiteRetrait, setQuantiteRetrait] = useState(1);
  const [prixReel, setPrixReel] = useState("");
  const [canal, setCanal] = useState("");
  const [dateVente, setDateVente] = useState(aujourdhuiIso());
  const [clientNom, setClientNom] = useState("");
  const [clientTel, setClientTel] = useState("");
  const [typeFacture, setTypeFacture] = useState("normale");
  const [clientAdresse, setClientAdresse] = useState("");
  const [clientRc, setClientRc] = useState("");
  const [clientNif, setClientNif] = useState("");
  const [clientAi, setClientAi] = useState("");
  const [clientNis, setClientNis] = useState("");
  const [modePaiement, setModePaiement] = useState("especes");
  const [avertissement, setAvertissement] = useState<string | null>(null);

  // Recherche / filtres / tri de l'onglet « En vente » (côté client).
  const [rechercheEnVente, setRechercheEnVente] = useState("");
  const [filtreCategorie, setFiltreCategorie] = useState("");
  const [triCartes, setTriCartes] = useState("");

  // Vente groupée (bundle) toujours active (Panier POS).
  const [modeBundle, setModeBundle] = useState(true);
  const [panierMobileOuvert, setPanierMobileOuvert] = useState(false);
  const [selection, setSelection] = useState<Map<string, Set<number>>>(new Map());
  const [paniersEnAttente, setPaniersEnAttente] = useState<{ id: number; selection: Map<string, Set<number>>; remise: string; date: Date }[]>([]);
  const [modalBundle, setModalBundle] = useState(false);
  const [prixTotalBundle, setPrixTotalBundle] = useState("");
  const [canalBundle, setCanalBundle] = useState("");
  const [dateBundle, setDateBundle] = useState(aujourdhuiIso());
  const [clientNomBundle, setClientNomBundle] = useState("");
  const [clientTelBundle, setClientTelBundle] = useState("");
  const [typeFactureBundle, setTypeFactureBundle] = useState("normale");
  const [clientAdresseBundle, setClientAdresseBundle] = useState("");
  const [clientRcBundle, setClientRcBundle] = useState("");
  const [clientNifBundle, setClientNifBundle] = useState("");
  const [clientAiBundle, setClientAiBundle] = useState("");
  const [clientNisBundle, setClientNisBundle] = useState("");
  const [modePaiementBundle, setModePaiementBundle] = useState("especes");
  const [especesRecues, setEspecesRecues] = useState("");
  const [avertissementBundle, setAvertissementBundle] = useState<string | null>(null);
  const [remiseBundle, setRemiseBundle] = useState("");
  const [impressionAuto, setImpressionAuto] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("impressionAuto");
    if (saved) setImpressionAuto(saved === "true");
  }, []);

  const nbArticlesSelectionnes = Array.from(selection.values()).reduce((acc, set) => acc + set.size, 0);

  // Protection contre la sortie accidentelle si un panier est en cours hors modale
  useLayer(
    "caisse-panier-actif",
    nbArticlesSelectionnes > 0 && !modalBundle && !modalVente && !panierMobileOuvert,
    () => {
      if (window.confirm("Vous avez un panier en cours dans la caisse. Voulez-vous vraiment quitter ?")) {
        return true;
      }
      return false;
    },
    LAYER_PRIORITY.DEFAUT
  );
  
  const [historique, setHistorique] = useState<ReponseHistorique | null>(null);
  const [erreurHistorique, setErreurHistorique] = useState<string | null>(null);
  const [filtreMois, setFiltreMois] = useState("");
  const [filtreVendeur, setFiltreVendeur] = useState("");
  const [modalAnnulation, setModalAnnulation] = useState<LigneVente | null>(null);
  const [motif, setMotif] = useState("");

  // Aperçu plein écran des photos d'un produit (galerie + téléchargement).
  const [apercuPhotos, setApercuPhotos] = useState<{
    photos: string[];
    index: number;
    titre: string;
  } | null>(null);


  const peutVendre = role === "gerant" || role === "dev" || role === "social_media";
  const estGerant = role === "gerant";
  const estSocial = role === "social_media";

  const chargerCartes = useCallback(async () => {
    try {
      const res = await fetch("/api/ventes/en-vente");
      const corps = (await res.json().catch(() => null)) as
        | { produits: CarteEnVente[] }
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreurCartes((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      setCartes((corps as { produits: CarteEnVente[] }).produits);
      setErreurCartes(null);
    } catch {
      setErreurCartes("Impossible de joindre le serveur.");
    }
  }, []);

  const chargerHistorique = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filtreMois) params.set("mois", filtreMois);
      if (filtreVendeur) params.set("vendeur", filtreVendeur);
      const res = await fetch(`/api/ventes?${params.toString()}`);
      const corps = (await res.json().catch(() => null)) as
        | ReponseHistorique
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreurHistorique(
          (corps as { error?: string } | null)?.error ?? "Erreur de chargement."
        );
        return;
      }
      setHistorique(corps as ReponseHistorique);
      setErreurHistorique(null);
    } catch {
      setErreurHistorique("Impossible de joindre le serveur.");
    }
  }, [filtreMois, filtreVendeur]);

  useEffect(() => {
    void chargerCartes();
    // Auto-resync toutes les 15 secondes pour toujours avoir le stock à jour
    // si un autre vendeur fait une vente depuis un autre poste.
    const interval = setInterval(() => {
      void chargerCartes();
    }, 15000);
    return () => clearInterval(interval);
  }, [chargerCartes]);

  const ouvrirVente = useCallback((groupe: GroupeEnVente) => {
    setPrixReel(groupe.prix_vente_fixe !== null ? String(groupe.prix_vente_fixe) : "");
    setQuantiteVente(1);
    setCanal("");
    setDateVente(aujourdhuiIso());
    setClientNom("");
    setClientTel("");
    setTypeFacture("normale");
    setClientAdresse("");
    setClientRc("");
    setClientNif("");
    setClientAi("");
    setClientNis("");
    setModePaiement("especes");
    setAvertissement(null);
    setModalVente(groupe);
  }, []);

  useEffect(() => {
    if (cartes && !initTermine) {
      setInitTermine(true);
      const produitId = searchParams.get("vendre_produit_id");
      if (produitId && peutVendre) {
        const produit = cartes.find((c) => c.id === Number(produitId));
        if (produit) {
          const groupe = grouperDoublonsVente(cartes).find(g => g.unites.some(u => u.id === produit.id));
          if (groupe) {
            ajouterASelection(groupe.cle, produit.id);
          }
        }
      }
    }
  }, [cartes, searchParams, peutVendre, initTermine]);

  const [lastScanCodeProcessed, setLastScanCodeProcessed] = useState<string | null>(null);

  const gererScan = useCallback((code: string) => {
    if (modalBundle || modalRetrait || modalVente || modalAnnulation) return;
    if (!cartes) return;
    const produit = cartes.find((c) => c.code_interne === code);
    if (produit) {
      const groupe = grouperDoublonsVente(cartes).find((g) => g.unites.some((u) => u.id === produit.id));
      if (groupe) {
        setSelection((prev) => {
          const suivant = new Map(prev);
          const s = suivant.get(groupe.cle) ? new Set(suivant.get(groupe.cle)) : new Set<number>();
          if (!s.has(produit.id)) {
            s.add(produit.id);
            suivant.set(groupe.cle, s);
            playBeep(true);
            afficher(`Produit scanné : ${produit.reference}`);
          } else {
            // L'utilisateur a scanné EXACTEMENT le même code-barres physique.
            // On bloque l'ajout automatique d'un autre exemplaire pour éviter les erreurs.
            playBeep(false);
            afficher("Cet exemplaire a déjà été ajouté à la vente.", "erreur");
          }
          return suivant;
        });
      }
    } else {
      playBeep(false);
      afficher(`Code non reconnu ou produit indisponible : ${code}`, "erreur");
    }
  }, [cartes, afficher, modalBundle, modalRetrait, modalVente, modalAnnulation, playBeep]);

  useBarcodeScanner((code) => {
    gererScan(code);
  });

  useEffect(() => {
    if (cartes) {
      const scanCode = searchParams.get("scan_code");
      const timestamp = searchParams.get("t");
      const trackingKey = `${scanCode}-${timestamp}`;
      if (scanCode && trackingKey !== lastScanCodeProcessed) {
        setLastScanCodeProcessed(trackingKey);
        gererScan(scanCode);
      }
    }
  }, [cartes, searchParams, gererScan, lastScanCodeProcessed]);
  useEffect(() => {
    void chargerHistorique();
  }, [chargerHistorique]);

  const categoriesEnVente = Array.from(new Set((cartes ?? []).map((c) => c.categorie))).sort();

  const groupesFiltres = (() => {
    let liste = cartes ?? [];
    if (rechercheEnVente.trim()) {
      liste = rechercheTolérante(liste, rechercheEnVente, (c) => [c.reference, c.code_interne, c.categorie]);
    }
    if (filtreCategorie) liste = liste.filter((c) => c.categorie === filtreCategorie);
    
    const tri = grouperDoublonsVente(liste);
    
    switch (triCartes) {
      case "prix_asc":
        tri.sort((a, b) => (a.prix_vente_fixe ?? 0) - (b.prix_vente_fixe ?? 0));
        break;
      case "prix_desc":
        tri.sort((a, b) => (b.prix_vente_fixe ?? 0) - (a.prix_vente_fixe ?? 0));
        break;
      case "marge_desc":
        tri.sort((a, b) => b.marge_prevue - a.marge_prevue);
        break;
      case "anciennete":
        tri.sort((a, b) => b.jours_en_vente - a.jours_en_vente);
        break;
    }
    return tri;
  })();

  const totalSelectionnees = Array.from(selection.values()).reduce((a, b) => a + b.size, 0);

  const selectionnees = (() => {
    const ids: number[] = [];
    if (!cartes) return [];
    for (const [cle, setIds] of selection.entries()) {
      ids.push(...Array.from(setIds));
    }
    return cartes.filter(c => ids.includes(c.id));
  })();

  const cartItems = (() => {
    const arr: { groupe: GroupeEnVente; qty: number; prix: number }[] = [];
    if (!cartes) return arr;
    const groupes = grouperDoublonsVente(cartes);
    for (const [cle, setIds] of selection.entries()) {
      const g = groupes.find(groupe => groupe.cle === cle);
      if (g) {
        arr.push({ groupe: g, qty: setIds.size, prix: g.prix_vente_fixe ?? 0 });
      }
    }
    return arr;
  })();

  const cartTotal = cartItems.reduce((sum, item) => sum + item.prix * item.qty, 0);
  const totalApresRemise = cartTotal - (Number(remiseBundle) || 0);

  function ajouterASelection(cle: string, produitId?: number) {
    setSelection((prev) => {
      const suivant = new Map(prev);
      const s = suivant.get(cle) ? new Set(suivant.get(cle)) : new Set<number>();
      
      if (produitId && !s.has(produitId)) {
        s.add(produitId);
      } else {
        if (cartes) {
          const groupes = grouperDoublonsVente(cartes);
          const g = groupes.find(x => x.cle === cle);
          if (g) {
            const dispo = g.unites.find(u => !s.has(u.id));
            if (dispo) s.add(dispo.id);
          }
        }
      }
      suivant.set(cle, s);
      return suivant;
    });
  }

  function retirerDeSelection(cle: string) {
    setSelection((prev) => {
      const suivant = new Map(prev);
      const s = suivant.get(cle);
      if (s && s.size > 0) {
        const nouveauSet = new Set(s);
        const last = Array.from(nouveauSet).pop();
        if (last !== undefined) nouveauSet.delete(last);
        
        if (nouveauSet.size === 0) {
          suivant.delete(cle);
        } else {
          suivant.set(cle, nouveauSet);
        }
      }
      return suivant;
    });
  }

  function quitterModeBundle() {
    setSelection(new Map());
    setRemiseBundle("");
  }

  function mettreEnAttente() {
    if (selection.size === 0) return;
    setPaniersEnAttente(prev => [
      ...prev,
      { id: Date.now(), selection: new Map(selection), remise: remiseBundle, date: new Date() }
    ]);
    setSelection(new Map());
    setRemiseBundle("");
    afficher("Panier mis en attente.");
  }

  function restaurerPanier(id: number) {
    const panier = paniersEnAttente.find(p => p.id === id);
    if (panier) {
      if (selection.size > 0) {
        mettreEnAttente(); // Mettre en attente l'actuel avant de restaurer
      }
      setSelection(new Map(panier.selection));
      setRemiseBundle(panier.remise);
      setPaniersEnAttente(prev => prev.filter(p => p.id !== id));
      afficher("Panier restauré.");
    }
  }

  function ouvrirBundle() {
    setPrixTotalBundle(totalApresRemise > 0 ? String(totalApresRemise) : "");
    setCanalBundle("");
    setDateBundle(aujourdhuiIso());
    setClientNomBundle("");
    setClientTelBundle("");
    setTypeFactureBundle("normale");
    setClientAdresseBundle("");
    setClientRcBundle("");
    setClientNifBundle("");
    setClientAiBundle("");
    setClientNisBundle("");
    setModePaiementBundle("especes");
    setEspecesRecues("");
    setAvertissementBundle(null);
    setModalBundle(true);
  }

  async function enregistrerVenteGroupee(confirmer: boolean) {
    if (envoi) return;
    if (modePaiementBundle === "credit" && !clientNomBundle.trim()) {
      afficher("Veuillez saisir le nom du client pour une vente à crédit.", "erreur");
      return;
    }
    setEnvoi(true);
    try {
        const produit_ids: number[] = [];
        const groupes = grouperDoublonsVente(cartes ?? []);
        for (const [cle, setIds] of selection.entries()) {
          const groupe = groupes.find(g => g.cle === cle);
          if (groupe) {
            produit_ids.push(...Array.from(setIds));
          }
        }
        
        const res = await fetch("/api/ventes/groupee", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            produit_ids,
          prix_total: Number(prixTotalBundle),
          canal: canalBundle.trim() || undefined,
          date_vente: dateBundle !== aujourdhuiIso() ? dateBundle : undefined,
          confirmer: confirmer || undefined,
          client_nom: clientNomBundle.trim() || undefined,
          client_tel: clientTelBundle.trim() || undefined,
          client_adresse: clientAdresseBundle.trim() || undefined,
          client_rc: clientRcBundle.trim() || undefined,
          client_nif: clientNifBundle.trim() || undefined,
          client_ai: clientAiBundle.trim() || undefined,
          client_nis: clientNisBundle.trim() || undefined,
          type_facture: typeFactureBundle,
          mode_paiement: modePaiementBundle,
        }),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la vente groupée.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setAvertissementBundle(corps.message ?? "Prix total sous la marge minimum. Confirmer ?");
        return;
      }
      const factureId = (corps as { facture_id?: number })?.facture_id;
      const factureNumero = (corps as { facture_numero?: string })?.facture_numero;
      afficher(
        factureId
          ? `Vente groupée enregistrée : ${produit_ids.length} produits — ${formaterDA(Number(prixTotalBundle))}. Facture ${factureNumero} créée.`
          : `Vente groupée enregistrée : ${produit_ids.length} produits — ${formaterDA(Number(prixTotalBundle))}.`
      );
      if (factureId) {
        window.open(`/factures/${factureId}?print=${impressionAuto ? "auto" : "ticket"}`, '_blank');
      }
      setModalBundle(false);
      quitterModeBundle();
      await Promise.all([chargerCartes(), chargerHistorique(), chargerStatsJour()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }


  async function enregistrerVente(confirmer: boolean) {
    if (envoi) return;
    if (!modalVente) return;
    setEnvoi(true);
    try {
      const isMultiple = quantiteVente > 1;
      const url = isMultiple ? "/api/ventes/groupee" : "/api/ventes";
      const unitesConcernees = modalVente.unites.slice(0, quantiteVente);
      
      const body = isMultiple ? {
        produit_ids: unitesConcernees.map(u => u.id),
        prix_total: Number(prixReel),
        canal: canal.trim() || undefined,
        date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
        confirmer: confirmer || undefined,
        client_nom: clientNom.trim() || undefined,
        client_tel: clientTel.trim() || undefined,
        client_adresse: clientAdresse.trim() || undefined,
        client_rc: clientRc.trim() || undefined,
        client_nif: clientNif.trim() || undefined,
        client_ai: clientAi.trim() || undefined,
        client_nis: clientNis.trim() || undefined,
        type_facture: typeFacture,
        mode_paiement: modePaiement,
      } : {
        produit_id: unitesConcernees[0]!.id,
        prix_vente_reel: Number(prixReel),
        canal: canal.trim() || undefined,
        date_vente: dateVente !== aujourdhuiIso() ? dateVente : undefined,
        confirmer: confirmer || undefined,
        client_nom: clientNom.trim() || undefined,
        client_tel: clientTel.trim() || undefined,
        client_adresse: clientAdresse.trim() || undefined,
        client_rc: clientRc.trim() || undefined,
        client_nif: clientNif.trim() || undefined,
        client_ai: clientAi.trim() || undefined,
        client_nis: clientNis.trim() || undefined,
        type_facture: typeFacture,
        mode_paiement: modePaiement,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const corps = (await res.json().catch(() => null)) as
        | { ok?: boolean; confirmation_required?: boolean; message?: string; error?: string }
        | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de la vente.", "erreur");
        return;
      }
      if (corps?.confirmation_required) {
        setAvertissement(corps.message ?? "Prix sous la marge minimum. Confirmer ?");
        return;
      }
      const factureId = (corps as { facture_id?: number })?.facture_id;
      const factureNumero = (corps as { facture_numero?: string })?.facture_numero;
      afficher(
        factureId
          ? `Vente enregistrée : ${modalVente.reference} (x${quantiteVente}) — ${formaterDA(Number(prixReel))}. Facture ${factureNumero} créée.`
          : `Vente enregistrée : ${modalVente.reference} (x${quantiteVente}) — ${formaterDA(Number(prixReel))}.`
      );
      if (factureId) {
        window.open(`/factures/${factureId}?print=ticket`, '_blank');
      }
      setModalVente(null);
      quitterModeBundle();
      await Promise.all([chargerCartes(), chargerHistorique(), chargerStatsJour()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  const ouvrirRetrait = useCallback((groupe: GroupeEnVente) => {
    setQuantiteRetrait(1);
    setAvertissement(null);
    setModalRetrait(groupe);
  }, []);

  async function enregistrerRetrait() {
    if (envoi) return;
    if (!modalRetrait) return;
    setEnvoi(true);
    try {
      const ids = modalRetrait.unites.slice(0, quantiteRetrait).map(u => u.id);
      const res = await fetch("/api/produits/masse/statut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids,
          statut: "ok",
          note: "Retiré de la vente depuis la page Ventes.",
        }),
      });
      const corps = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors du retrait.", "erreur");
        return;
      }
      afficher(`${quantiteRetrait} unité(s) de ${modalRetrait.reference} retirée(s) de la vente.`);
      setModalRetrait(null);
      await Promise.all([chargerCartes(), chargerHistorique()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  useEffect(() => {
    if (!initTermine) {
      Promise.all([chargerCartes(), chargerHistorique(), chargerStatsJour()]).finally(() =>
        setInitTermine(true)
      );
    }
  }, [initTermine, chargerCartes, chargerHistorique, chargerStatsJour]);

  async function annulerVente() {
    if (envoi) return;
    if (!modalAnnulation) return;
    setEnvoi(true);
    try {
      const res = await fetch(`/api/ventes/${modalAnnulation.id}/annulation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motif }),
      });
      const corps = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        afficher(corps?.error ?? "Erreur lors de l'annulation.", "erreur");
        return;
      }
      afficher("Vente annulée — caisse contre-passée, produit remis en vente.");
      setModalAnnulation(null);
      setMotif("");
      await Promise.all([chargerCartes(), chargerHistorique(), chargerStatsJour()]);
    } catch {
      afficher("Impossible de joindre le serveur.", "erreur");
    } finally {
      setEnvoi(false);
    }
  }

  return (
    <div className="flex flex-col h-[100dvh] max-h-[100dvh] bg-brand-light-grey/10">
      <header className="bg-[var(--color-sidebar-bg)] text-white p-3 shrink-0 flex items-center justify-between shadow-md z-10">
        <div className="flex items-center gap-4">
          <Link href="/caisse" className="btn py-1 px-3 bg-white/10 text-white hover:bg-white/20 border border-white/20">
            ← Retour au Tableau de Bord
          </Link>
          <div className="font-black text-lg tracking-wide uppercase flex items-center gap-2">
            <IconeStore taille={20} className="text-brand-orange" />
            Mode Caisse
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          {(statsJour || statsJourErreur) && (
            <div className="flex items-center gap-6">
              {statsJourErreur ? (
                <div className="text-right">
                  <span className="text-sm text-red-500 font-medium">{statsJourErreur}</span>
                </div>
              ) : statsJour ? (
                <>
                  <div className="text-right">
                    <span className="text-[10px] text-brand-warm-grey uppercase tracking-wider block">{t("caisse.ventesAujourdhui")}</span>
                    <span className="font-bold text-lg leading-none">{statsJour.nombre}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-brand-warm-grey uppercase tracking-wider block">{t("caisse.chiffreAffaires")}</span>
                    <span className="font-black text-brand-orange text-lg leading-none">{formaterDA(statsJour.total)}</span>
                  </div>
                </>
              ) : null}
              {peutVendre && (
                <button 
                  onClick={() => {
                    if (window.confirm("Êtes-vous sûr de vouloir vider la caisse ? Les compteurs de la journée repartiront à 0.")) {
                      fetch('/api/caisse/vider', { method: 'POST' })
                        .then(() => chargerStatsJour())
                        .catch(() => alert("Erreur lors de la réinitialisation de la caisse."));
                    }
                  }}
                  className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-bold rounded shadow-sm transition"
                >
                  Vider la Caisse
                </button>
              )}
            </div>
          )}
          <UptimeCaisse />
          <HorlogeLive />
        </div>
      </header>

      <div className="flex-1 overflow-hidden flex flex-col p-4">
        {onglet === "en_vente" && (
        <div className="flex flex-col lg:flex-row gap-4 items-start h-full overflow-hidden">
          <div className="flex-1 flex flex-col space-y-3 w-full min-w-0 h-full overflow-y-auto pr-2 pb-24">
          <div className="carte flex flex-wrap items-center gap-3">
            <div className="relative min-w-56 flex-1 border-r border-brand-light-grey pr-3 mr-3">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-brand-orange">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect width="2" height="8" x="7" y="8"/><rect width="2" height="8" x="11" y="8"/><rect width="2" height="8" x="15" y="8"/></svg>
              </span>
              <input
                id="scanner-pos"
                type="text"
                autoFocus
                placeholder="Scanner code-barres..."
                className="champ pl-9 border-brand-orange ring-1 ring-brand-orange focus:ring-2 focus:border-brand-orange font-mono"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const code = e.currentTarget.value.trim();
                    if (!code) return;
                    e.currentTarget.value = "";
                    gererScan(code);
                  }
                }}
              />
            </div>
            <RechercheRapide
              valeur={rechercheEnVente}
              onChange={setRechercheEnVente}
              placeholder="Rechercher code, ref ou catégorie..."
              className="w-full sm:max-w-md"
            />
            <select
              value={filtreCategorie}
              onChange={(e) => setFiltreCategorie(e.target.value)}
              className="champ w-auto"
            >
              <option value="">{t("caisse.toutesCategories")}</option>
              {categoriesEnVente.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={triCartes}
              onChange={(e) => setTriCartes(e.target.value)}
              className="champ w-auto"
              aria-label="Trier les produits en vente"
            >
              <option value="">{t("caisse.triDefaut")}</option>
              <option value="prix_asc">{t("caisse.prixAsc")}</option>
              <option value="prix_desc">{t("caisse.prixDesc")}</option>
              <option value="marge_desc">{t("caisse.margeDesc")}</option>
              <option value="anciennete">{t("caisse.anciennete")}</option>
            </select>
            {peutVendre && (
              <button type="button" onClick={quitterModeBundle} className="btn btn-secondaire">
                <IconeCorbeille taille={14} /> {t("caisse.viderPanier")}
              </button>
            )}
          </div>

          {erreurCartes && (
            <div className="alerte-erreur" role="alert">
              {erreurCartes}
            </div>
          )}
          {!erreurCartes && cartes === null && (
            <p className="text-sm text-brand-warm-grey">{t("commun.chargement")}</p>
          )}
          {cartes !== null && cartes.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucun produit en vente. Le gérant fixe les prix des produits « OK » pour les mettre
              en vente.
            </p>
          )}
          {cartes !== null && groupesFiltres.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucun produit ne correspond à la recherche.
            </p>
          )}
          {cartes !== null && groupesFiltres.length > 0 && rechercheEnVente.trim() !== "" && (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groupesFiltres.map((g) => {
                const qtySelected = selection.get(g.cle)?.size ?? 0;
                const choisi = qtySelected > 0;
                const c = g.unites[0]!;
                return (
                  <li
                    key={g.cle}
                    className={`group flex flex-col overflow-hidden rounded-xl border bg-brand-white/80 backdrop-blur-lg transition hover:shadow-md effet-lumiere ${
                      modeBundle && choisi
                        ? "border-brand-orange ring-2 ring-brand-orange"
                        : "border-brand-light-grey"
                    }`}
                  >
                    <div
                      className="relative block aspect-[4/3] w-full overflow-hidden bg-brand-paper"
                    >
                      {/* Clic principal sur la carte */}
                      <div
                        className={`absolute inset-0 z-0 ${
                          modeBundle
                            ? "cursor-pointer"
                            : c.images.length > 0
                              ? "cursor-zoom-in"
                              : "cursor-default"
                        }`}
                        onClick={() => {
                          if (modeBundle) {
                            if (!choisi) ajouterASelection(g.cle);
                          } else if (c.images.length > 0) {
                            setApercuPhotos({ photos: c.images, index: 0, titre: c.code_interne });
                          }
                        }}
                        title={
                          modeBundle
                            ? choisi
                              ? ""
                              : "Ajouter au groupe"
                            : c.images.length > 0
                              ? "Voir les photos en grand"
                              : undefined
                        }
                      />

                      {c.image_url ? (
                        <img
                          src={c.image_url}
                          alt={`Photo de ${c.reference}`}
                          loading="lazy"
                          className="pointer-events-none h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="pointer-events-none flex h-full w-full items-center justify-center text-brand-grey">
                          <IconeImage taille={30} />
                        </span>
                      )}
                      
                      {/* Contrôles / Badges */}
                      {modeBundle && (
                        <div className="absolute left-2 top-2 z-10">
                          {choisi ? (
                            <div className="flex h-7 items-center gap-3 rounded-full bg-brand-white/95 px-2 font-bold shadow ring-1 ring-brand-orange">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); retirerDeSelection(g.cle); }}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-light-grey/50 text-brand-black transition hover:bg-brand-orange hover:text-white"
                              >
                                -
                              </button>
                              <span className="w-8 text-center text-xs text-brand-orange">{qtySelected}</span>
                              <button
                                type="button"
                                disabled={qtySelected >= g.unites.length}
                                onClick={(e) => { e.stopPropagation(); ajouterASelection(g.cle); }}
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-light-grey/50 text-brand-black transition hover:bg-brand-orange hover:text-white disabled:opacity-30 disabled:hover:bg-brand-light-grey/50 disabled:hover:text-brand-black"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="pointer-events-none inline-flex items-center gap-1 rounded-full bg-brand-white/90 px-2 py-1 text-[11px] font-bold text-brand-smooth shadow">
                              <IconeCoche taille={12} />
                              Choisir
                            </span>
                          )}
                        </div>
                      )}
                      
                      {c.images.length > 1 && (
                        <span className="pointer-events-none absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/55 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                          <IconeImage taille={11} />
                          {c.images.length}
                        </span>
                      )}
                      
                      <span className="pointer-events-none absolute bottom-2 left-2 z-10 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {c.jours_en_vente} j en vente
                      </span>
                      <span className="pointer-events-none absolute bottom-2 right-2 z-10 rounded-full bg-brand-orange px-2 py-0.5 text-[11px] font-semibold text-white">
                        En stock : {g.unites.length}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-brand-warm-grey">
                          {c.code_interne}
                        </span>
                        <span className="truncate text-xs text-brand-warm-grey">{c.categorie}</span>
                      </div>
                      <Link
                        href={`/produits/${c.id}`}
                        className="mt-1 line-clamp-2 text-sm font-semibold leading-snug transition hover:text-brand-crystal hover:underline"
                        title={c.reference}
                      >
                        {c.reference}
                      </Link>
                      <div className="mt-auto flex items-end justify-between gap-2 pt-2.5">
                        <div>
                          <span className="block text-[10px] font-semibold uppercase tracking-wide text-brand-grey">
                            Prix fixé
                          </span>
                          <span className="text-lg font-extrabold leading-tight text-brand-orange">
                            {c.prix_vente_fixe !== null ? formaterDA(c.prix_vente_fixe) : "—"}
                          </span>
                        </div>
                        {!estSocial && (
                          <div className="text-right">
                            <span className="block text-[10px] font-semibold uppercase tracking-wide text-brand-grey">
                              Marge prévue
                            </span>
                            <span
                              className={`text-sm font-bold ${c.marge_prevue >= 0 ? "text-succes" : "text-danger"}`}
                            >
                              {formaterDA(c.marge_prevue)}
                            </span>
                          </div>
                        )}
                      </div>
                      {peutVendre && !modeBundle && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => ouvrirRetrait(g)}
                            className="btn btn-secondaire flex-1 justify-center px-1 text-xs min-h-[44px]"
                            title="Retirer de la vente"
                          >
                            Retirer
                          </button>
                          <button
                            type="button"
                            onClick={() => ouvrirVente(g)}
                            className="btn btn-primaire flex-[2] justify-center min-h-[44px]"
                          >
                            <IconeBillet taille={15} />
                            Vendre
                          </button>
                        </div>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          </div>

          {modeBundle && (
            <>
              {/* Desktop Panier (hidden on mobile) */}
              <div className="hidden lg:flex w-[450px] shrink-0 flex-col gap-3 h-full overflow-y-auto pb-24 pr-2">
              {paniersEnAttente.length > 0 && (
                <div className="carte p-3 bg-brand-orange/10 border-brand-orange/30">
                  <h4 className="font-bold text-sm text-brand-orange mb-2">{t("caisse.paniersEnAttente", { n: paniersEnAttente.length })}</h4>
                  <div className="space-y-2">
                    {paniersEnAttente.map((p) => {
                      const nbArticles = Array.from(p.selection.values()).reduce((a,b)=>a+b.size,0);
                      const heure = p.date.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });
                      return (
                        <div key={p.id} className="flex items-center justify-between bg-brand-white p-2 rounded border border-brand-orange/20 text-sm">
                          <div>
                            <span className="font-semibold text-brand-black">{t("caisse.panierDe", { heure })}</span>
                            <div className="text-xs text-brand-warm-grey">{nbArticles} article(s)</div>
                          </div>
                          <button onClick={() => restaurerPanier(p.id)} className="btn btn-primaire py-1 px-3 text-xs">
                            Reprendre
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="carte flex flex-col p-4 shadow-lg border-brand-orange/20 ring-1 ring-brand-orange/10 bg-brand-white">
                <div className="flex items-center justify-between border-b border-brand-light-grey pb-3 mb-3">
                  <h3 className="font-bold text-lg flex items-center gap-2 text-brand-black">
                    <IconePaquet taille={20} className="text-brand-orange" />
                    {t("factures.ticketCaisse")}
                  </h3>
                  <div className="flex items-center gap-3">
                    <button onClick={mettreEnAttente} disabled={cartItems.length === 0} title="Mettre en attente" className="flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:text-brand-orange/70 transition disabled:opacity-30 disabled:cursor-not-allowed">
                      <IconePause taille={14} /> {t("caisse.attente")}
                    </button>
                    <button onClick={quitterModeBundle} className="flex items-center gap-1.5 text-sm font-semibold text-brand-warm-grey hover:text-brand-black transition">
                      <IconeCorbeille taille={14} /> {t("caisse.vider")}
                    </button>
                  </div>
                </div>
                
                {cartItems.length === 0 ? (
                   <div className="flex flex-col items-center justify-center gap-2 py-8 border-dashed border-2 rounded-lg border-brand-light-grey/50">
                     <IconeRecherche taille={32} className="text-brand-light-grey" />
                     <p className="text-sm text-brand-grey text-center">
                       {t("caisse.panierVideDesc")}
                     </p>
                   </div>
                ) : (
                   <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 min-h-[150px]">
                     {cartItems.map(item => (
                       <div key={item.groupe.cle} className="flex justify-between items-start gap-3 border-b border-brand-light-grey/30 pb-3 last:border-0">
                         <div className="flex flex-col min-w-0 flex-1">
                           <span className="font-semibold text-sm line-clamp-2 leading-snug" title={item.groupe.reference}>{item.groupe.reference}</span>
                           <span className="text-xs text-brand-warm-grey mt-0.5">{item.qty} x {formaterDA(item.prix)}</span>
                         </div>
                         <div className="text-right flex flex-col items-end shrink-0">
                           <span className="font-bold text-brand-black text-sm">{formaterDA(item.prix * item.qty)}</span>
                           <div className="flex items-center gap-2 mt-2 bg-brand-light-grey/20 rounded-md p-1">
                             <button onClick={() => retirerDeSelection(item.groupe.cle)} className="h-11 w-11 bg-brand-white shadow-sm rounded flex items-center justify-center transition hover:text-brand-orange hover:bg-brand-orange/10 active-scale"><IconeMoins taille={18} /></button>
                             <span className="w-8 text-center font-bold text-lg">{item.qty}</span>
                             <button onClick={() => ajouterASelection(item.groupe.cle)} disabled={item.qty >= item.groupe.unites.length} className="h-11 w-11 bg-brand-white shadow-sm rounded flex items-center justify-center transition hover:text-brand-orange hover:bg-brand-orange/10 active-scale disabled:opacity-40 disabled:hover:text-brand-black disabled:hover:bg-brand-white"><IconePlus taille={18} /></button>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                )}
                
                <div className="mt-4 pt-4 border-t-2 border-dashed border-brand-light-grey space-y-3">
                  <div className="flex justify-between items-center text-sm text-brand-warm-grey">
                    <span>{t("caisse.sousTotal")}</span>
                    <span className="font-medium text-brand-black">{formaterDA(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-brand-black font-semibold">{t("caisse.remise")}</span>
                    <div className="relative">
                      <input 
                        type="number" 
                        value={remiseBundle} 
                        onChange={(e) => setRemiseBundle(e.target.value)} 
                        placeholder="0" 
                        className="champ w-28 py-1.5 pl-2 pr-7 text-right font-bold text-brand-black focus:ring-brand-orange focus:border-brand-orange" 
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-warm-grey pointer-events-none">DA</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-1 mt-1">
                    <button type="button" onClick={() => setRemiseBundle(Math.floor(cartTotal * 0.05).toString())} className="px-2 py-0.5 text-[10px] bg-brand-light-grey/30 rounded font-bold hover:bg-brand-orange/20 text-brand-black">-5%</button>
                    <button type="button" onClick={() => setRemiseBundle(Math.floor(cartTotal * 0.10).toString())} className="px-2 py-0.5 text-[10px] bg-brand-light-grey/30 rounded font-bold hover:bg-brand-orange/20 text-brand-black">-10%</button>
                    <button type="button" onClick={() => setRemiseBundle(Math.floor(cartTotal * 0.15).toString())} className="px-2 py-0.5 text-[10px] bg-brand-light-grey/30 rounded font-bold hover:bg-brand-orange/20 text-brand-black">-15%</button>
                    <button type="button" onClick={() => setRemiseBundle("")} className="px-2 py-0.5 bg-brand-light-grey/30 rounded flex items-center justify-center hover:bg-danger/20 text-brand-black" title="Retirer la remise"><IconeFermer taille={12} /></button>
                  </div>
                  <div className="flex justify-between items-center pt-2 mt-2 border-t border-brand-light-grey/30">
                    <span className="font-black text-lg text-brand-black uppercase">{t("caisse.totalNet")}</span>
                    <span className="font-black text-2xl tracking-tight text-brand-orange">{formaterDA(totalApresRemise)}</span>
                  </div>
                </div>
                
                <button
                  type="button"
                  disabled={cartItems.length === 0}
                  onClick={() => {
                    if (cartItems.length === 1 && cartItems[0]) {
                      setModalVente(cartItems[0].groupe);
                      setQuantiteVente(cartItems[0].qty);
                    } else {
                      ouvrirBundle();
                    }
                  }}
                  className="btn btn-primaire mt-5 w-full justify-center py-3.5 text-base shadow-md disabled:opacity-50 disabled:cursor-not-allowed min-h-[56px]"
                >
                  <IconeBillet taille={18} />
                  Encaisser {cartItems.length > 0 && `(${totalSelectionnees} article${totalSelectionnees > 1 ? 's' : ''})`}
                </button>
              </div>
            </div>

              {/* Mobile Bottom Bar for Panier summary */}
              <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-light-grey shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.1)] z-40 pb-[max(env(safe-area-inset-bottom),12px)] px-4 pt-3 rounded-t-2xl">
                 <div className="flex items-center justify-between mb-3">
                   <button onClick={() => setPanierMobileOuvert(true)} className="flex items-center gap-3">
                     <div className="relative">
                       <IconePaquet taille={28} className="text-brand-orange" />
                       <span className="absolute -top-2 -right-2 bg-danger text-white text-[11px] font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm">{cartItems.length}</span>
                     </div>
                     <span className="font-bold text-sm text-brand-black underline decoration-brand-light-grey underline-offset-4">Voir le panier</span>
                   </button>
                   <div className="text-right">
                     <span className="block text-[10px] font-semibold text-brand-grey uppercase">{t("caisse.totalNet")}</span>
                     <span className="font-black text-xl text-brand-orange leading-none">{formaterDA(totalApresRemise)}</span>
                   </div>
                 </div>
                 <button
                   type="button"
                   disabled={cartItems.length === 0}
                   onClick={() => {
                     if (panierMobileOuvert) setPanierMobileOuvert(false);
                     if (cartItems.length === 1 && cartItems[0]) {
                       setModalVente(cartItems[0].groupe);
                       setQuantiteVente(cartItems[0].qty);
                     } else {
                       ouvrirBundle();
                     }
                   }}
                   className="btn btn-primaire w-full justify-center py-3.5 text-base shadow-md disabled:opacity-50 min-h-[56px] rounded-xl"
                 >
                   <IconeBillet taille={20} /> Encaisser {cartItems.length > 0 && `(${totalSelectionnees})`}
                 </button>
              </div>
            </>
          )}
        </div>
      )}
      <Modale
        titre="Panier de Vente"
        ouverte={panierMobileOuvert}
        onFermer={() => setPanierMobileOuvert(false)}
      >
        <div className="flex flex-col gap-3 h-[75vh] overflow-y-auto pb-4">
          {paniersEnAttente.length > 0 && (
            <div className="carte p-3 bg-brand-orange/10 border-brand-orange/30 shrink-0">
              <h4 className="font-bold text-sm text-brand-orange mb-2">{t("caisse.paniersEnAttente", { n: paniersEnAttente.length })}</h4>
              <div className="space-y-2">
                {paniersEnAttente.map((p) => {
                  const nbArticles = Array.from(p.selection.values()).reduce((a,b)=>a+b.size,0);
                  const heure = p.date.toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' });
                  return (
                    <div key={p.id} className="flex items-center justify-between bg-brand-white p-2 rounded border border-brand-orange/20 text-sm">
                      <div>
                        <span className="font-semibold text-brand-black">{t("caisse.panierDe", { heure })}</span>
                        <div className="text-xs text-brand-warm-grey">{nbArticles} article(s)</div>
                      </div>
                      <button onClick={() => restaurerPanier(p.id)} className="btn btn-primaire py-1 px-3 text-xs">
                        Reprendre
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <div className="flex items-center justify-between border-b border-brand-light-grey pb-3 mb-3 shrink-0">
            <h3 className="font-bold text-lg flex items-center gap-2 text-brand-black">
              <IconePaquet taille={20} className="text-brand-orange" />
              {t("factures.ticketCaisse")}
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={mettreEnAttente} disabled={cartItems.length === 0} title="Mettre en attente" className="flex items-center gap-1.5 text-sm font-semibold text-brand-orange hover:text-brand-orange/70 transition disabled:opacity-30 disabled:cursor-not-allowed">
                <IconePause taille={14} /> {t("caisse.attente")}
              </button>
              <button onClick={quitterModeBundle} className="flex items-center gap-1.5 text-sm font-semibold text-brand-warm-grey hover:text-brand-black transition">
                <IconeCorbeille taille={14} /> {t("caisse.vider")}
              </button>
            </div>
          </div>
          
          {cartItems.length === 0 ? (
             <div className="flex flex-col items-center justify-center gap-2 py-8 border-dashed border-2 rounded-lg border-brand-light-grey/50 shrink-0">
               <IconeRecherche taille={32} className="text-brand-light-grey" />
               <p className="text-sm text-brand-grey text-center">
                 {t("caisse.panierVideDesc")}
               </p>
             </div>
          ) : (
             <div className="flex flex-col gap-3 flex-1 overflow-y-auto pr-1 min-h-[150px]">
               {cartItems.map(item => (
                 <div key={item.groupe.cle} className="flex justify-between items-start gap-3 border-b border-brand-light-grey/30 pb-3 last:border-0">
                   <div className="flex flex-col min-w-0 flex-1">
                     <span className="font-semibold text-sm line-clamp-2 leading-snug" title={item.groupe.reference}>{item.groupe.reference}</span>
                     <span className="text-xs text-brand-warm-grey mt-0.5">{item.qty} x {formaterDA(item.prix)}</span>
                   </div>
                   <div className="text-right flex flex-col items-end shrink-0">
                     <span className="font-bold text-brand-black text-sm">{formaterDA(item.prix * item.qty)}</span>
                     <div className="flex items-center gap-2 mt-2 bg-brand-light-grey/20 rounded-md p-1">
                       <button onClick={() => retirerDeSelection(item.groupe.cle)} className="h-11 w-11 bg-brand-white shadow-sm rounded flex items-center justify-center transition hover:text-brand-orange hover:bg-brand-orange/10 active-scale"><IconeMoins taille={18} /></button>
                       <span className="w-8 text-center font-bold text-lg">{item.qty}</span>
                       <button onClick={() => ajouterASelection(item.groupe.cle)} disabled={item.qty >= item.groupe.unites.length} className="h-11 w-11 bg-brand-white shadow-sm rounded flex items-center justify-center transition hover:text-brand-orange hover:bg-brand-orange/10 active-scale disabled:opacity-40 disabled:hover:text-brand-black disabled:hover:bg-brand-white"><IconePlus taille={18} /></button>
                     </div>
                   </div>
                 </div>
               ))}
             </div>
          )}
          
          <div className="mt-4 pt-4 border-t-2 border-dashed border-brand-light-grey space-y-3 shrink-0">
            <div className="flex justify-between items-center text-sm text-brand-warm-grey">
              <span>{t("caisse.sousTotal")}</span>
              <span className="font-medium text-brand-black">{formaterDA(cartTotal)}</span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-brand-black font-semibold">{t("caisse.remise")}</span>
              <div className="relative">
                <input 
                  type="number" 
                  value={remiseBundle} 
                  onChange={(e) => setRemiseBundle(e.target.value)} 
                  placeholder="0" 
                  className="champ w-28 py-1.5 pl-2 pr-7 text-right font-bold text-brand-black focus:ring-brand-orange focus:border-brand-orange" 
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-bold text-brand-warm-grey pointer-events-none">DA</span>
              </div>
            </div>
            <div className="flex justify-end gap-1 mt-1">
              <button type="button" onClick={() => setRemiseBundle(Math.floor(cartTotal * 0.05).toString())} className="px-2 py-0.5 text-[10px] bg-brand-light-grey/30 rounded font-bold hover:bg-brand-orange/20 text-brand-black">-5%</button>
              <button type="button" onClick={() => setRemiseBundle(Math.floor(cartTotal * 0.10).toString())} className="px-2 py-0.5 text-[10px] bg-brand-light-grey/30 rounded font-bold hover:bg-brand-orange/20 text-brand-black">-10%</button>
              <button type="button" onClick={() => setRemiseBundle(Math.floor(cartTotal * 0.15).toString())} className="px-2 py-0.5 text-[10px] bg-brand-light-grey/30 rounded font-bold hover:bg-brand-orange/20 text-brand-black">-15%</button>
              <button type="button" onClick={() => setRemiseBundle("")} className="px-2 py-0.5 bg-brand-light-grey/30 rounded flex items-center justify-center hover:bg-danger/20 text-brand-black" title="Retirer la remise"><IconeFermer taille={12} /></button>
            </div>
            <div className="flex justify-between items-center pt-2 mt-2 border-t border-brand-light-grey/30">
              <span className="font-black text-lg text-brand-black uppercase">{t("caisse.totalNet")}</span>
              <span className="font-black text-2xl tracking-tight text-brand-orange">{formaterDA(totalApresRemise)}</span>
            </div>
          </div>
        </div>
      </Modale>

      {onglet === "historique" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="month"
              value={filtreMois}
              onChange={(e) => setFiltreMois(e.target.value)}
              className="champ w-auto"
            />
            <select
              value={filtreVendeur}
              onChange={(e) => setFiltreVendeur(e.target.value)}
              className="champ w-auto"
            >
              <option value="">{t("caisse.tousVendeurs")}</option>
              {(historique?.vendeurs ?? []).map((v) => (
                <option key={v.id} value={v.id}>
                  {v.username}
                </option>
              ))}
            </select>
            {(filtreMois || filtreVendeur) && (
              <button
                type="button"
                onClick={() => {
                  setFiltreMois("");
                  setFiltreVendeur("");
                }}
                className="text-sm text-brand-warm-grey hover:underline"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {historique && (
            <p className="text-sm text-brand-warm-grey">
              <strong className="text-brand-black">{historique.totaux.nombre}</strong> vente
              {historique.totaux.nombre > 1 ? "s" : ""} valide
              {historique.totaux.nombre > 1 ? "s" : ""} · CA{" "}
              <strong className="text-brand-black">
                {formaterDA(historique.totaux.chiffre_affaires)}
              </strong>{" "}
              {!estSocial && (
                <>
                  {" "}· marge totale{" "}
                  <strong
                    className={historique.totaux.marge >= 0 ? "text-succes" : "text-danger"}
                  >
                    {formaterDA(historique.totaux.marge)}
                  </strong>
                </>
              )}
            </p>
          )}

          {erreurHistorique && (
            <div className="alerte-erreur" role="alert">
              {erreurHistorique}
            </div>
          )}
          {!erreurHistorique && historique === null && (
            <p className="text-sm text-brand-warm-grey">{t("commun.chargement")}</p>
          )}
          {historique && historique.ventes.length === 0 && (
            <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
              Aucune vente pour ces filtres.
            </p>
          )}

          {historique && historique.ventes.length > 0 && (
            <div className="space-y-4">
              {/* Vue Mobile: Cartes */}
              <div className="flex flex-col gap-3 md:hidden">
                {historique.ventes.map((v) => (
                  <div key={v.id} className={`flex flex-col gap-3 rounded-xl border bg-brand-white p-4 shadow-sm ${v.annulee ? "opacity-75 border-brand-light-grey/50" : "border-brand-light-grey"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        {v.image_url ? (
                          <button
                            type="button"
                            onClick={() =>
                              setApercuPhotos({
                                photos: [v.image_url!],
                                index: 0,
                                titre: v.code_interne,
                              })
                            }
                            className="shrink-0 cursor-zoom-in"
                          >
                            <img src={v.image_url} alt="" loading="lazy" className="h-12 w-12 rounded-lg border border-brand-light-grey object-cover" />
                          </button>
                        ) : (
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-dashed border-brand-light-grey text-brand-grey">
                            <IconeImage taille={16} />
                          </span>
                        )}
                        <div className="flex flex-col">
                          <Link href={`/produits/${v.produit_id}`} className={`font-semibold hover:underline ${v.annulee ? "line-through" : ""}`}>
                            <span className="font-mono text-xs text-brand-grey mr-1">{v.code_interne}</span>
                            {v.reference}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {v.groupe_vente && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-brand-glow/40 px-1.5 py-0.5 text-xs font-semibold text-brand-smooth">
                                <IconePaquet taille={11} /> {t("caisse.bundle")}
                              </span>
                            )}
                            {v.annulee && (
                              <span className="rounded bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger">annulée</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-brand-black">{formaterDA(v.prix_vente_reel)}</div>
                        <div className="text-xs text-brand-warm-grey">{new Date(v.date_vente).toLocaleDateString("fr-FR")}</div>
                      </div>
                    </div>

                    <div className="mt-1 flex flex-col gap-1 text-sm border-t border-brand-light-grey/50 pt-2">
                      {!estSocial && (
                        <div className="flex justify-between">
                          <span className="text-brand-warm-grey">{t("caisse.margeLabel")}</span>
                          <span className={`font-semibold ${v.annulee ? "text-brand-grey" : v.marge >= 0 ? "text-succes" : "text-danger"}`}>
                            {formaterDA(v.marge)}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-brand-warm-grey">{t("caisse.canalLabel")}</span>
                        <span className="font-semibold text-brand-black">{v.canal ?? "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-brand-warm-grey">{t("caisse.vendeurLabel")}</span>
                        <span className="font-semibold text-brand-black">{v.vendeur}</span>
                      </div>
                    </div>
                    {estGerant && !v.annulee && (
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => {
                            setMotif("");
                            setModalAnnulation(v);
                          }}
                          className="btn btn-secondaire text-xs text-danger hover:bg-danger/10"
                        >
                          Annuler la vente
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Vue Bureau: Tableau */}
              <div className="hidden overflow-x-auto rounded-xl border border-brand-light-grey bg-brand-white md:block">
                <table className="w-full min-w-[720px] text-sm">
                  <thead className="bg-brand-light-grey/25">
                    <tr>
                      <th className="entete-table">{t("caisse.colProduit")}</th>
                      <th className="entete-table text-right">{t("caisse.colPrix")}</th>
                      {!estSocial && <th className="entete-table text-right">{t("caisse.colMarge")}</th>}
                      <th className="entete-table">{t("caisse.colCanal")}</th>
                      <th className="entete-table">{t("caisse.colVendeur")}</th>
                      <th className="entete-table text-right">{t("caisse.colDate")}</th>
                      {estGerant && <th className="entete-table" />}
                    </tr>
                  </thead>
                  <tbody className="">
                    {historique.ventes.map((v) => (
                      <tr key={v.id} className={`ligne-table border-b border-brand-light-grey/30 last:border-0 ${v.annulee ? "text-brand-grey" : ""}`}>
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            {v.image_url ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setApercuPhotos({
                                    photos: [v.image_url!],
                                    index: 0,
                                    titre: v.code_interne,
                                  })
                                }
                                title="Voir la photo en grand"
                                aria-label={`Photo de ${v.reference}`}
                                className="shrink-0 cursor-zoom-in"
                              >
                                <img
                                  src={v.image_url}
                                  alt=""
                                  loading="lazy"
                                  className="h-9 w-9 rounded-md border border-brand-light-grey object-cover"
                                />
                              </button>
                            ) : (
                              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-brand-light-grey text-brand-grey">
                                <IconeImage taille={14} />
                              </span>
                            )}
                            <span className="min-w-0">
                          <Link
                            href={`/produits/${v.produit_id}`}
                            className={`hover:underline ${v.annulee ? "line-through" : ""}`}
                          >
                            <span className="font-mono text-xs text-brand-grey">
                              {v.code_interne}
                            </span>{" "}
                            {v.reference}
                          </Link>
                          {v.groupe_vente && (
                            <span
                              className="ml-1 inline-flex items-center gap-0.5 rounded bg-brand-glow/40 px-1 py-0.5 text-xs font-semibold text-brand-smooth"
                              title={`Vente groupée ${v.groupe_vente.slice(0, 8)}`}
                            >
                              <IconePaquet taille={11} />
                              Bundle
                            </span>
                          )}
                          {v.annulee && (
                            <span
                              className="ml-1 rounded bg-danger/10 px-1 py-0.5 text-xs font-semibold text-danger"
                              title={v.motif_annulation ?? undefined}
                            >
                              annulée
                            </span>
                          )}
                            </span>
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">{formaterDA(v.prix_vente_reel)}</td>
                        {!estSocial && (
                          <td
                            className={`px-3 py-2 text-right font-semibold ${
                              v.annulee ? "" : v.marge >= 0 ? "text-succes" : "text-danger"
                            }`}
                          >
                            {formaterDA(v.marge)}
                          </td>
                        )}
                        <td className="px-3 py-2">{v.canal ?? "—"}</td>
                        <td className="px-3 py-2">{v.vendeur}</td>
                        <td className="px-3 py-2 text-right">
                          {new Date(v.date_vente).toLocaleDateString("fr-FR")}
                        </td>
                        {estGerant && (
                          <td className="px-3 py-2 text-right">
                            {!v.annulee && (
                              <button
                                type="button"
                                onClick={() => {
                                  setMotif("");
                                  setModalAnnulation(v);
                                }}
                                className="text-xs font-semibold text-danger hover:underline"
                              >
                                Annuler
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      <Modale
        titre={modalVente ? `Vendre — ${modalVente.unites[0]!.code_interne}` : ""}
        ouverte={modalVente !== null}
        onFermer={() => setModalVente(null)}
      >
        {modalVente && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {modalVente.image_url && (
                <button
                  type="button"
                  onClick={() =>
                    setApercuPhotos({
                      photos: modalVente.images,
                      index: 0,
                      titre: modalVente.unites[0]!.code_interne,
                    })
                  }
                  title="Voir les photos en grand"
                  aria-label={`Photos de ${modalVente.reference}`}
                  className="shrink-0 cursor-zoom-in"
                >
                  <img
                    src={modalVente.image_url}
                    alt=""
                    className="h-14 w-14 rounded-lg border border-brand-light-grey object-cover"
                  />
                </button>
              )}
              <p className="text-sm text-brand-warm-grey">{modalVente.reference}</p>
            </div>
            <div className="flex gap-3">
              <div className="w-1/3">
                <label className="libelle mb-1.5" htmlFor="quantite">
                  Quantité (max {modalVente.unites.length})
                </label>
                <input
                  id="quantite"
                  type="number"
                  min={1}
                  max={modalVente.unites.length}
                  value={quantiteVente}
                  onChange={(e) => {
                     const max = modalVente.unites.length;
                     let val = parseInt(e.target.value, 10);
                     if (isNaN(val) || val < 1) val = 1;
                     if (val > max) val = max;
                     setQuantiteVente(val);
                     if (modalVente.prix_vente_fixe !== null) {
                       setPrixReel(String(modalVente.prix_vente_fixe * val));
                     }
                     setAvertissement(null);
                  }}
                  className="champ min-h-[44px]"
                />
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="prix-reel">
                  Prix de vente total (DA) *
                </label>
                <input
                  id="prix-reel"
                  type="number"
                  min={1}
                  step={1}
                  value={prixReel}
                  onChange={(e) => {
                    setPrixReel(e.target.value.replace(/[^\d]/g, ""));
                    setAvertissement(null);
                  }}
                  autoFocus
                  className="champ min-h-[44px] text-lg font-bold"
                />
                {!estSocial && Number(prixReel) > 0 && (() => {
                   const coutTotal = modalVente.unites.slice(0, quantiteVente).reduce((s, u) => s + u.prix_achat + u.cout_reparations, 0);
                   const marge = Number(prixReel) - coutTotal;
                   return (
                    <p className="mt-1 text-xs">
                      Marge totale :{" "}
                      <strong className={marge >= 0 ? "text-succes" : "text-danger"}>
                        {formaterDA(marge)}
                      </strong>
                    </p>
                   );
                })()}
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="date-vente">
                  Date
                </label>
                <input
                  id="date-vente"
                  type="date"
                  value={dateVente}
                  max={aujourdhuiIso()}
                  onChange={(e) => setDateVente(e.target.value)}
                  className="champ"
                />
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="canal">
                  Canal
                </label>
                <input
                  id="canal"
                  type="text"
                  list="canaux"
                  value={canal}
                  onChange={(e) => setCanal(e.target.value)}
                  placeholder="Ouedkniss…"
                  className="champ"
                />
                <datalist id="canaux">
                  {CANAUX.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="mode-paiement">
                  Paiement
                </label>
                <select
                  id="mode-paiement"
                  value={modePaiement}
                  onChange={(e) => setModePaiement(e.target.value)}
                  className="champ"
                >
                  <option value="especes">{t("caisse.especes")}</option>
                  <option value="virement">{t("caisse.virementCCP")}</option>
                  <option value="cheque">{t("caisse.cheque")}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="client-nom-vente">
                  Nom du client
                </label>
                <input
                  id="client-nom-vente"
                  type="text"
                  value={clientNom}
                  onChange={(e) => setClientNom(e.target.value)}
                  placeholder="Ex. Ahmed B."
                  className="champ"
                />
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="client-tel-vente">
                  Téléphone
                </label>
                <input
                  id="client-tel-vente"
                  type="tel"
                  value={clientTel}
                  onChange={(e) => setClientTel(e.target.value)}
                  placeholder="0X XX XX XX XX"
                  className="champ"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="type-facture">
                  Type de facture
                </label>
                <select
                  id="type-facture"
                  value={typeFacture}
                  onChange={(e) => setTypeFacture(e.target.value)}
                  className="champ"
                >
                  <option value="normale">{t("caisse.factureNormale")}</option>
                  <option value="tva">{t("caisse.factureTVA")}</option>
                  <option value="proforma">{t("caisse.factureProforma")}</option>
                </select>
              </div>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-brand-orange hover:underline outline-none">
                Informations légales de l&apos;entreprise (Optionnel)
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-brand-light-grey/20 rounded-lg">
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-adresse">{t("caisse.adresse")}</label>
                  <input id="client-adresse" type="text" value={clientAdresse} onChange={e => setClientAdresse(e.target.value)} className="champ" />
                </div>
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-rc">RC</label>
                  <input id="client-rc" type="text" value={clientRc} onChange={e => setClientRc(e.target.value)} className="champ" />
                </div>
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-nif">NIF</label>
                  <input id="client-nif" type="text" value={clientNif} onChange={e => setClientNif(e.target.value)} className="champ" />
                </div>
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-nis">NIS</label>
                  <input id="client-nis" type="text" value={clientNis} onChange={e => setClientNis(e.target.value)} className="champ" />
                </div>
                <div className="sm:col-span-2">
                  <label className="libelle mb-1.5" htmlFor="client-ai">{t("caisse.artImposition")}</label>
                  <input id="client-ai" type="text" value={clientAi} onChange={e => setClientAi(e.target.value)} className="champ" />
                </div>
              </div>
            </details>

            {avertissement && (
              <div className="flex items-start gap-2 rounded-lg bg-brand-glow/40 px-3 py-2 text-sm text-brand-smooth">
                <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
                {avertissement}
              </div>
            )}

            <div className="flex justify-end gap-2">
              {avertissement ? (
                <>
                  <button
                    type="button"
                    onClick={() => setAvertissement(null)}
                    className="btn btn-secondaire"
                  >
                    Revoir le prix
                  </button>
                  <button
                    type="button"
                    disabled={envoi}
                    onClick={() => void enregistrerVente(true)}
                    className="btn btn-primaire"
                  >
                    Vendre quand même
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={envoi || !prixReel.trim()}
                  onClick={() => void enregistrerVente(false)}
                  className="btn btn-primaire min-h-[44px]"
                >
                  Enregistrer la vente
                </button>
              )}
            </div>
          </div>
        )}
      </Modale>

      <Modale
        titre={modalAnnulation ? `Annuler la vente — ${modalAnnulation.code_interne}` : ""}
        ouverte={modalAnnulation !== null}
        onFermer={() => setModalAnnulation(null)}
      >
        <p className="text-sm text-brand-warm-grey">
          La caisse sera contre-passée et le produit remis en vente. La ligne de vente reste dans
          l'historique (rien ne se supprime).
        </p>
        <textarea
          value={motif}
          onChange={(e) => setMotif(e.target.value)}
          rows={2}
          autoFocus
          placeholder="Motif de l'annulation (obligatoire)"
          className="champ mt-3"
        />
        <div className="mt-3 text-right">
          <button
            type="button"
            disabled={envoi || !motif.trim()}
            onClick={() => void annulerVente()}
            className="btn btn-danger"
          >
            Annuler la vente
          </button>
        </div>
      </Modale>

      <Modale
        titre={`Vente groupée — ${selectionnees.length} produits`}
        ouverte={modalBundle}
        onFermer={() => setModalBundle(false)}
      >
        <div className="space-y-3">
          <p className="text-sm text-brand-black font-semibold bg-brand-orange/10 p-3 rounded-lg border border-brand-orange/20">
            Montant total à encaisser : {formaterDA(Number(prixTotalBundle))}
          </p>

          {!estSocial && Number(prixTotalBundle) > 0 && (
            <p className="text-xs">
              Marge totale estimée :{" "}
              <strong
                className={
                  Number(prixTotalBundle) -
                    selectionnees.reduce((s, c) => s + c.prix_achat + c.cout_reparations, 0) >=
                  0
                    ? "text-succes"
                    : "text-danger"
                }
              >
                {formaterDA(
                  Number(prixTotalBundle) -
                    selectionnees.reduce((s, c) => s + c.prix_achat + c.cout_reparations, 0)
                )}
              </strong>
            </p>
          )}

          <div className="flex gap-3">
            <div className="flex-1">
              <label className="libelle mb-1.5" htmlFor="date-bundle">
                Date
              </label>
              <input
                id="date-bundle"
                type="date"
                value={dateBundle}
                max={aujourdhuiIso()}
                onChange={(e) => setDateBundle(e.target.value)}
                className="champ"
              />
            </div>
            <div className="flex-1">
              <label className="libelle mb-1.5" htmlFor="canal-bundle">
                Canal
              </label>
              <input
                id="canal-bundle"
                type="text"
                list="canaux"
                value={canalBundle}
                onChange={(e) => setCanalBundle(e.target.value)}
                placeholder="Ouedkniss…"
                className="champ"
              />
            </div>
            <div className="flex-1">
              <label className="libelle mb-1.5" htmlFor="mode-paiement-bundle">
                Paiement
              </label>
              <select
                id="mode-paiement-bundle"
                value={modePaiementBundle}
                onChange={(e) => setModePaiementBundle(e.target.value)}
                className="champ"
              >
                <option value="especes">{t("caisse.especes")}</option>
                <option value="virement">{t("caisse.virementCCP")}</option>
                <option value="cheque">{t("caisse.cheque")}</option>
                <option value="credit">{t("caisse.credit")}</option>
              </select>
            </div>
          </div>

          {modePaiementBundle === "especes" && (
            <div className="flex gap-3 pt-2 pb-1">
              <div className="flex-1 bg-brand-light-grey/20 p-3 rounded-lg border border-brand-light-grey/50">
                <label className="libelle mb-1.5 text-brand-black" htmlFor="especes-recues">
                  Espèces reçues (DA)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    id="especes-recues"
                    type="number"
                    value={especesRecues}
                    onChange={(e) => setEspecesRecues(e.target.value)}
                    placeholder="Montant donné par le client"
                    className="champ flex-1 font-bold text-lg min-h-[44px]"
                  />
                  {Number(especesRecues) > 0 && (
                    <div className="flex flex-col whitespace-nowrap min-w-[120px]">
                      <span className="text-[10px] uppercase font-bold text-brand-grey">{t("caisse.monnaieARendre")}</span>
                      <span className={`text-lg font-black ${Number(especesRecues) - Number(prixTotalBundle) >= 0 ? "text-succes" : "text-danger"}`}>
                        {formaterDA(Number(especesRecues) - Number(prixTotalBundle))}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mt-3">
                  <button type="button" onClick={() => setEspecesRecues("1000")} className="flex-1 py-1 min-h-[44px] bg-brand-white border border-brand-light-grey rounded shadow-sm text-sm font-bold hover:bg-brand-orange hover:text-white transition active-scale">1000 DA</button>
                  <button type="button" onClick={() => setEspecesRecues("2000")} className="flex-1 py-1 min-h-[44px] bg-brand-white border border-brand-light-grey rounded shadow-sm text-sm font-bold hover:bg-brand-orange hover:text-white transition active-scale">2000 DA</button>
                  <button type="button" onClick={() => setEspecesRecues("5000")} className="flex-1 py-1 min-h-[44px] bg-brand-white border border-brand-light-grey rounded shadow-sm text-sm font-bold hover:bg-brand-orange hover:text-white transition active-scale">5000 DA</button>
                  <button type="button" onClick={() => setEspecesRecues(prixTotalBundle)} className="flex-1 py-1 min-h-[44px] bg-brand-orange text-white border border-brand-orange rounded shadow-sm text-sm font-bold hover:bg-brand-orange/90 transition active-scale">{t("caisse.exact")}</button>
                </div>
              </div>
            </div>
          )}

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="client-nom-bundle">
                  Nom du client
                </label>
                <input
                  id="client-nom-bundle"
                  type="text"
                  value={clientNomBundle}
                  onChange={(e) => setClientNomBundle(e.target.value)}
                  placeholder="Ex. Ahmed B."
                  className="champ"
                />
              </div>
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="client-tel-bundle">
                  Téléphone
                </label>
                <input
                  id="client-tel-bundle"
                  type="tel"
                  value={clientTelBundle}
                  onChange={(e) => setClientTelBundle(e.target.value)}
                  placeholder="0X XX XX XX XX"
                  className="champ"
                />
              </div>
            </div>

            <div className="flex gap-3">
              <div className="flex-1">
                <label className="libelle mb-1.5" htmlFor="type-facture-bundle">
                  Type de facture
                </label>
                <select
                  id="type-facture-bundle"
                  value={typeFactureBundle}
                  onChange={(e) => setTypeFactureBundle(e.target.value)}
                  className="champ"
                >
                  <option value="normale">{t("caisse.factureNormale")}</option>
                  <option value="tva">{t("caisse.factureTVA")}</option>
                  <option value="proforma">{t("caisse.factureProforma")}</option>
                </select>
              </div>
            </div>

            <details className="group">
              <summary className="cursor-pointer text-sm font-semibold text-brand-orange hover:underline outline-none">
                Informations légales de l&apos;entreprise (Optionnel)
              </summary>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-brand-light-grey/20 rounded-lg">
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-adresse-bundle">{t("caisse.adresse")}</label>
                  <input id="client-adresse-bundle" type="text" value={clientAdresseBundle} onChange={e => setClientAdresseBundle(e.target.value)} className="champ" />
                </div>
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-rc-bundle">RC</label>
                  <input id="client-rc-bundle" type="text" value={clientRcBundle} onChange={e => setClientRcBundle(e.target.value)} className="champ" />
                </div>
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-nif-bundle">NIF</label>
                  <input id="client-nif-bundle" type="text" value={clientNifBundle} onChange={e => setClientNifBundle(e.target.value)} className="champ" />
                </div>
                <div>
                  <label className="libelle mb-1.5" htmlFor="client-nis-bundle">NIS</label>
                  <input id="client-nis-bundle" type="text" value={clientNisBundle} onChange={e => setClientNisBundle(e.target.value)} className="champ" />
                </div>
                <div className="sm:col-span-2">
                  <label className="libelle mb-1.5" htmlFor="client-ai-bundle">{t("caisse.artImposition")}</label>
                  <input id="client-ai-bundle" type="text" value={clientAiBundle} onChange={e => setClientAiBundle(e.target.value)} className="champ" />
                </div>
              </div>
            </details>
          {avertissementBundle && (
            <div className="flex items-start gap-2 rounded-lg bg-brand-glow/40 px-3 py-2 text-sm text-brand-smooth">
              <IconeAlerte taille={16} className="mt-0.5 shrink-0 text-brand-orange" />
              {avertissementBundle}
            </div>
          )}

          <div className="flex items-center justify-between mt-4">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-brand-black">
              <input type="checkbox" checked={impressionAuto} onChange={(e) => { setImpressionAuto(e.target.checked); localStorage.setItem("impressionAuto", e.target.checked.toString()); }} className="rounded text-brand-orange focus:ring-brand-orange h-4 w-4" />
              Impression auto & Tiroir-caisse
            </label>
            <div className="flex justify-end gap-2">
            {avertissementBundle ? (
              <>
                <button
                  type="button"
                  onClick={() => setAvertissementBundle(null)}
                  className="btn btn-secondaire"
                >
                  Revoir le prix
                </button>
                <button
                  type="button"
                  disabled={envoi}
                  onClick={() => void enregistrerVenteGroupee(true)}
                  className="btn btn-primaire"
                >
                  Vendre quand même
                </button>
              </>
            ) : (
              <button
                type="button"
                disabled={envoi || !prixTotalBundle.trim()}
                onClick={() => void enregistrerVenteGroupee(false)}
                className="btn btn-primaire min-h-[44px]"
              >
                <IconePaquet taille={15} />
                Enregistrer la vente groupée
              </button>
            )}
          </div>
          </div>
        </div>
      </Modale>

      {apercuPhotos && (
        <VisionneusePhotos
          photos={apercuPhotos.photos}
          index={apercuPhotos.index}
          onFermer={() => setApercuPhotos(null)}
          onNaviguer={(i) => setApercuPhotos((a) => (a ? { ...a, index: i } : a))}
          lienTelechargement={(i) => `${apercuPhotos.photos[i]}?download=1`}
          titre={apercuPhotos.titre}
        />
      )}

      <Modale
        titre={modalRetrait ? `Retirer — ${modalRetrait.unites[0]!.code_interne}` : ""}
        ouverte={modalRetrait !== null}
        onFermer={() => setModalRetrait(null)}
      >
        {modalRetrait && (
          <div className="space-y-3">
            <p className="text-sm">
              Vous êtes sur le point de retirer <strong>{modalRetrait.reference}</strong> de la vente (retour en stock).
            </p>
            <div>
              <label className="libelle mb-1.5" htmlFor="quantite-retrait">
                Quantité à retirer (max {modalRetrait.unites.length})
              </label>
              <input
                id="quantite-retrait"
                type="number"
                min={1}
                max={modalRetrait.unites.length}
                value={quantiteRetrait}
                onChange={(e) => {
                   const max = modalRetrait.unites.length;
                   let val = parseInt(e.target.value, 10);
                   if (isNaN(val) || val < 1) val = 1;
                   if (val > max) val = max;
                   setQuantiteRetrait(val);
                }}
                autoFocus
                className="champ"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalRetrait(null)}
                className="btn btn-secondaire"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={envoi}
                onClick={() => void enregistrerRetrait()}
                className="btn btn-primaire"
              >
                Confirmer
              </button>
            </div>
          </div>
        )}
      </Modale>
    </div>
    </div>
  );
}
