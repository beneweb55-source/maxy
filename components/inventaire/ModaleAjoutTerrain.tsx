"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Barcode, 
  Scan, 
  Plus, 
  X, 
  Check, 
  Layers, 
  Tag, 
  Printer, 
  Package, 
  Eye, 
  Archive, 
  Cpu, 
  HardDrive, 
  Monitor, 
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import type { StatutProduit } from "@prisma/client";
import { formaterDA } from "@/lib/caisse";

interface SousCategorieOption {
  id: number;
  nom: string;
  parent_nom?: string;
  parent_id?: number | null;
}

interface ModeleSearchResult {
  id: number;
  nom: string;
  categorie_id: number;
  prix_vente_conseille: number | null;
  categorie: { id: number; nom: string };
  attributs: any;
}

interface ModaleAjoutTerrainProps {
  ouverte: boolean;
  onFermer: () => void;
  onSucces: (res: { codes: string[]; ajoutes: number }) => void;
  lotsDisponibles?: { id: number; libelle: string }[];
}

export default function ModaleAjoutTerrain({
  ouverte,
  onFermer,
  onSucces,
  lotsDisponibles = []
}: ModaleAjoutTerrainProps) {
  // Mode de saisie : "modele" (sélection/création de modèle) ou "direct"
  const [onglet, setOnglet] = useState<"modele_existant" | "nouveau_modele">("nouveau_modele");

  // Recherche modèle
  const [rechercheModele, setRechercheModele] = useState("");
  const [modelesTrouves, setModelesTrouves] = useState<ModeleSearchResult[]>([]);
  const [modeleSelectionne, setModeleSelectionne] = useState<ModeleSearchResult | null>(null);

  // Arborescence sous-catégories
  const [sousCategories, setSousCategories] = useState<SousCategorieOption[]>([]);
  const [sousCatId, setSousCatId] = useState<number | "">("");

  // Champs de base
  const [nomReference, setNomReference] = useState("");
  const [quantite, setQuantite] = useState<number>(1);
  const [prixAchat, setPrixAchat] = useState<string>("");
  const [prixVente, setPrixVente] = useState<string>("");
  const [lotId, setLotId] = useState<string>("");
  const [grade, setGrade] = useState<string>("Grade A");
  const [emplacement, setEmplacement] = useState<"reserve" | "vitrine">("reserve");
  const [imprimerDirect, setImprimerDirect] = useState<boolean>(true);

  // Saisie des numéros de série individuels
  const [numerosSerie, setNumerosSerie] = useState<string[]>([]);
  const [scanDouchette, setScanDouchette] = useState<string>("");

  // Spécifications dynamiques selon le type de matériel
  const [specs, setSpecs] = useState({
    // PC / Laptops
    cpu: "",
    ram: "",
    stockage: "",
    gpu: "",
    ecranTaille: "",
    // Disques
    disqueType: "",
    disqueCapacite: "",
    disqueFormat: "",
    // Ecrans
    resolution: "",
    connectique: "",
    // Câbles & accessoires
    longueur: "",
    typeConnecteur: "",
  });

  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const scanInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Charger les sous-catégories plates pour sélection rapide
  useEffect(() => {
    if (!ouverte) return;
    fetch("/api/categories?tree=1")
      .then((r) => r.json())
      .then((data: any[]) => {
        const plates: SousCategorieOption[] = [];
        data.forEach((f) => {
          (f.enfants || []).forEach((c: any) => {
            (c.enfants || []).forEach((sc: any) => {
              plates.push({
                id: sc.id,
                nom: sc.nom,
                parent_nom: `${f.nom} › ${c.nom}`,
                parent_id: c.id,
              });
            });
          });
        });
        setSousCategories(plates);
        if (plates && plates.length > 0 && plates[0] && sousCatId === "") {
          setSousCatId(plates[0].id);
        }
      })
      .catch(console.error);
  }, [ouverte]);

  // Focus automatique au scan de douchette à l'ouverture
  useEffect(() => {
    if (ouverte) {
      setTimeout(() => {
        scanInputRef.current?.focus();
      }, 100);
    }
  }, [ouverte]);

  // Recherche de modèle par mot-clé
  useEffect(() => {
    if (!rechercheModele.trim()) {
      setModelesTrouves([]);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`/api/modeles?q=${encodeURIComponent(rechercheModele.trim())}`)
        .then((r) => r.json())
        .then((data) => setModelesTrouves(Array.isArray(data) ? data : []))
        .catch(console.error);
    }, 250);
    return () => clearTimeout(timer);
  }, [rechercheModele]);

  // Ajuster le tableau des numéros de série selon la quantité
  useEffect(() => {
    setNumerosSerie((prev) => {
      const next = [...prev];
      if (next.length < quantite) {
        while (next.length < quantite) next.push("");
      } else if (next.length > quantite) {
        return next.slice(0, quantite);
      }
      return next;
    });
  }, [quantite]);

  // Gestion du scan douchette
  const gererScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && scanDouchette.trim()) {
      e.preventDefault();
      const code = scanDouchette.trim();
      
      // Chercher si le code correspond à un modèle
      fetch(`/api/modeles?q=${encodeURIComponent(code)}`)
        .then((r) => r.json())
        .then((res: any[]) => {
          if (Array.isArray(res) && res.length > 0) {
            setModeleSelectionne(res[0]);
            setOnglet("modele_existant");
            setNomReference(res[0].nom);
            setSousCatId(res[0].categorie_id);
            if (res[0].prix_vente_conseille) {
              setPrixVente(String(res[0].prix_vente_conseille));
            }
          } else {
            // Remplir le premier numéro de série vide ou la référence
            const premierIndexVide = numerosSerie.findIndex((sn) => !sn);
            if (premierIndexVide !== -1) {
              const majSN = [...numerosSerie];
              majSN[premierIndexVide] = code;
              setNumerosSerie(majSN);
            } else {
              setNomReference(code);
            }
          }
          setScanDouchette("");
        });
    }
  };

  // Détection du type de matériel pour adapter les champs
  const sousCatSelectionnee = sousCategories.find((sc) => sc.id === Number(sousCatId));
  const nomSousCat = (sousCatSelectionnee?.nom || "").toLowerCase();
  const parentNom = (sousCatSelectionnee?.parent_nom || "").toLowerCase();

  const estPC = nomSousCat.includes("pc") || nomSousCat.includes("portable") || nomSousCat.includes("tour") || nomSousCat.includes("mini") || nomSousCat.includes("station") || nomSousCat.includes("gaming") || parentNom.includes("ordinateur");
  const estDisque = nomSousCat.includes("ssd") || nomSousCat.includes("disque") || nomSousCat.includes("hdd") || nomSousCat.includes("nvme") || parentNom.includes("stockage");
  const estEcran = nomSousCat.includes("écran") || nomSousCat.includes("moniteur") || parentNom.includes("écran");
  const estMemoire = nomSousCat.includes("ram") || nomSousCat.includes("mémoire") || nomSousCat.includes("processeur") || parentNom.includes("mémoire");

  // Construction automatique de la référence à partir des specs
  const genererNomReferenceAuto = () => {
    let titre = nomReference.trim();
    if (estPC) {
      const parts = [titre, specs.cpu, specs.ram ? `${specs.ram} RAM` : "", specs.stockage, specs.gpu].filter(Boolean);
      return parts.join(" - ");
    }
    if (estDisque) {
      const parts = [titre, specs.disqueType, specs.disqueCapacite, specs.disqueFormat].filter(Boolean);
      return parts.join(" ");
    }
    if (estEcran) {
      const parts = [titre, specs.ecranTaille ? `${specs.ecranTaille}"` : "", specs.resolution].filter(Boolean);
      return parts.join(" ");
    }
    return titre;
  };

  const sauvegarder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (envoi) return;
    setErreur(null);

    const refFinale = onglet === "modele_existant" && modeleSelectionne 
      ? modeleSelectionne.nom 
      : (genererNomReferenceAuto() || nomReference.trim());

    if (!refFinale) {
      setErreur("Le nom ou modèle du matériel est obligatoire.");
      return;
    }

    if (!sousCatId) {
      setErreur("Veuillez sélectionner une sous-catégorie.");
      return;
    }

    setEnvoi(true);

    try {
      let targetModeleId = modeleSelectionne?.id;

      // 1. Si nouveau modèle, le créer d'abord dans le catalogue
      if (!targetModeleId) {
        const resModele = await fetch("/api/modeles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nom: refFinale,
            categorie_id: Number(sousCatId),
            prix_vente_conseille: prixVente ? Number(prixVente) : null,
            attributs: specs,
          }),
        });

        if (!resModele.ok) {
          const b = await resModele.json();
          throw new Error(b.error || "Erreur lors de la création du modèle.");
        }
        const modeleCree = await resModele.json();
        targetModeleId = modeleCree.id;
      }

      // 2. Générer les N exemplaires physiques rattachés à ce modèle
      const resExemplaires = await fetch(`/api/modeles/${targetModeleId}/exemplaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantite: Number(quantite) || 1,
          prix_achat: Number(prixAchat) || 0,
          prix_vente_fixe: prixVente ? Number(prixVente) : null,
          lot_id: lotId ? Number(lotId) : null,
          grade,
          emplacement,
          numeros_serie: numerosSerie,
          en_vitrine: emplacement === "vitrine",
        }),
      });

      if (!resExemplaires.ok) {
        const b = await resExemplaires.json();
        throw new Error(b.error || "Erreur lors de la génération des exemplaires.");
      }

      const donneesExemplaires = await resExemplaires.json();
      onSucces({ codes: donneesExemplaires.codes, ajoutes: donneesExemplaires.ajoutes });
      onFermer();
    } catch (err: any) {
      console.error(err);
      setErreur(err.message || "Erreur lors de l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  };

  if (!ouverte) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-y-auto animate-entree-rapide">
      <div className="bg-white dark:bg-brand-paper w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden border border-brand-light-grey/60 dark:border-white/10 my-auto flex flex-col max-h-[90vh]">
        
        {/* Header avec Scan Douchette Rapide */}
        <div className="p-4 border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-brand-orange/15 text-brand-orange flex items-center justify-center font-bold">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-extrabold text-base sm:text-lg font-outfit text-brand-black dark:text-white">
                Réception & Ajout de Matériel
              </h2>
              <p className="text-xs text-brand-warm-grey">
                Saisie rapide au comptoir · Génération d'exemplaires & codes-barres
              </p>
            </div>
          </div>

          {/* Barcode scanner rapid input */}
          <div className="relative w-full sm:w-64">
            <Scan className="w-4 h-4 text-brand-orange absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              ref={scanInputRef}
              type="text"
              value={scanDouchette}
              onChange={(e) => setScanDouchette(e.target.value)}
              onKeyDown={gererScan}
              placeholder="Scanner douchette (S/N, code)..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-brand-paper border border-brand-orange/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange font-mono"
            />
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="p-1.5 text-brand-warm-grey hover:text-brand-black dark:hover:text-white rounded-lg hover:bg-brand-light-grey/30 self-end sm:self-auto"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {erreur && (
          <div className="bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300 border-b border-red-200 dark:border-red-800 px-4 py-2.5 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" /> {erreur}
          </div>
        )}

        <form onSubmit={sauvegarder} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Onglets : Nouveau Modèle vs Modèle Existant */}
          <div className="flex bg-brand-light-grey/25 dark:bg-white/5 p-1 rounded-xl border border-brand-light-grey/50 dark:border-white/10">
            <button
              type="button"
              onClick={() => {
                setOnglet("nouveau_modele");
                setModeleSelectionne(null);
              }}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                onglet === "nouveau_modele"
                  ? "bg-white dark:bg-brand-paper shadow-xs text-brand-black dark:text-white"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              <Plus className="w-3.5 h-3.5" /> Créer une Fiche Matériel
            </button>
            <button
              type="button"
              onClick={() => setOnglet("modele_existant")}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                onglet === "modele_existant"
                  ? "bg-white dark:bg-brand-paper shadow-xs text-brand-black dark:text-white"
                  : "text-brand-warm-grey hover:text-brand-black dark:hover:text-white"
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Sélectionner un Modèle Existant
            </button>
          </div>

          {/* MODE 1 : Modèle Existant */}
          {onglet === "modele_existant" && (
            <div className="space-y-3 bg-brand-light-grey/10 dark:bg-white/5 p-4 rounded-xl border border-brand-light-grey/40 dark:border-white/5">
              <label className="block text-xs font-bold text-brand-black dark:text-white">
                Rechercher dans le catalogue de modèles :
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-brand-warm-grey absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={rechercheModele}
                  onChange={(e) => setRechercheModele(e.target.value)}
                  placeholder="Ex: ThinkPad T480, Dell 5480, SSD Samsung 500Go..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-brand-paper border border-brand-light-grey rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              {modelesTrouves.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 bg-white dark:bg-brand-paper rounded-xl p-2 border border-brand-light-grey shadow-xs">
                  {modelesTrouves.map((m) => (
                    <div
                      key={m.id}
                      onClick={() => {
                        setModeleSelectionne(m);
                        setNomReference(m.nom);
                        setSousCatId(m.categorie_id);
                        if (m.prix_vente_conseille) setPrixVente(String(m.prix_vente_conseille));
                      }}
                      className={`p-2 rounded-lg text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        modeleSelectionne?.id === m.id
                          ? "bg-brand-orange/15 text-brand-orange font-bold"
                          : "hover:bg-brand-light-grey/30 text-brand-black dark:text-white"
                      }`}
                    >
                      <span>{m.nom}</span>
                      <span className="text-[11px] text-brand-warm-grey font-mono">
                        {m.categorie?.nom} · {m.prix_vente_conseille ? formaterDA(m.prix_vente_conseille) : "Sans prix conseillé"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {modeleSelectionne && (
                <div className="p-3 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl text-xs flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Modèle sélectionné : <strong>{modeleSelectionne.nom}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setModeleSelectionne(null)}
                    className="text-[11px] underline font-bold"
                  >
                    Changer
                  </button>
                </div>
              )}
            </div>
          )}

          {/* MODE 2 : Nouveau Modèle & Saisie Directe */}
          {onglet === "nouveau_modele" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                    Sous-Catégorie du Matériel *
                  </label>
                  <select
                    value={sousCatId}
                    onChange={(e) => setSousCatId(Number(e.target.value))}
                    required
                    className="w-full px-3 py-2 text-xs bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange font-medium"
                  >
                    {sousCategories.map((sc) => (
                      <option key={sc.id} value={sc.id}>
                        {sc.parent_nom ? `${sc.parent_nom} › ` : ""}{sc.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                    Nom / Modèle principal *
                  </label>
                  <input
                    ref={refInputRef}
                    type="text"
                    value={nomReference}
                    onChange={(e) => setNomReference(e.target.value)}
                    placeholder="Ex: Dell Latitude 5480, HP ProDesk 600..."
                    required
                    className="w-full px-3.5 py-2 text-sm bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange font-medium"
                  />
                </div>
              </div>

              {/* Spécifications Adaptatives selon la sous-catégorie */}
              {estPC && (
                <div className="p-3.5 bg-blue-50/50 dark:bg-blue-950/20 rounded-xl border border-blue-200/60 dark:border-blue-900/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300">
                    <Cpu className="w-3.5 h-3.5" /> Spécifications PC / Ordinateur
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <input
                      type="text"
                      placeholder="Processeur (ex: i5-8350U)"
                      value={specs.cpu}
                      onChange={(e) => setSpecs({ ...specs, cpu: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="RAM (ex: 16Go DDR4)"
                      value={specs.ram}
                      onChange={(e) => setSpecs({ ...specs, ram: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Stockage (ex: 256Go SSD)"
                      value={specs.stockage}
                      onChange={(e) => setSpecs({ ...specs, stockage: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="GPU (ex: Intel UHD, GTX)"
                      value={specs.gpu}
                      onChange={(e) => setSpecs({ ...specs, gpu: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {estDisque && (
                <div className="p-3.5 bg-cyan-50/50 dark:bg-cyan-950/20 rounded-xl border border-cyan-200/60 dark:border-cyan-900/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-700 dark:text-cyan-300">
                    <HardDrive className="w-3.5 h-3.5" /> Caractéristiques Stockage / Disque
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    <select
                      value={specs.disqueType}
                      onChange={(e) => setSpecs({ ...specs, disqueType: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    >
                      <option value="">Type de disque...</option>
                      <option value="SSD NVMe M.2">SSD NVMe M.2</option>
                      <option value="SSD SATA 2.5">SSD SATA 2.5"</option>
                      <option value="HDD 3.5">HDD 3.5" (Tour/Serveur)</option>
                      <option value="HDD 2.5">HDD 2.5" (Portable)</option>
                      <option value="SAS">Disque Serveur SAS</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Capacité (ex: 512Go, 1To)"
                      value={specs.disqueCapacite}
                      onChange={(e) => setSpecs({ ...specs, disqueCapacite: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Format / Vitesse"
                      value={specs.disqueFormat}
                      onChange={(e) => setSpecs({ ...specs, disqueFormat: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                  </div>
                </div>
              )}

              {estEcran && (
                <div className="p-3.5 bg-sky-50/50 dark:bg-sky-950/20 rounded-xl border border-sky-200/60 dark:border-sky-900/40 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300">
                    <Monitor className="w-3.5 h-3.5" /> Spécifications Écran / Moniteur
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      placeholder="Taille diagonale (ex: 24, 27)"
                      value={specs.ecranTaille}
                      onChange={(e) => setSpecs({ ...specs, ecranTaille: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                    <input
                      type="text"
                      placeholder="Résolution (ex: FHD 1080p, 2K, 4K)"
                      value={specs.resolution}
                      onChange={(e) => setSpecs({ ...specs, resolution: e.target.value })}
                      className="px-2.5 py-1.5 text-xs bg-white dark:bg-brand-paper border rounded-lg"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PARAMÈTRES DU LOT / EXEMPLAIRES */}
          <div className="border-t border-brand-light-grey/40 dark:border-white/5 pt-4 space-y-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-brand-warm-grey">
              Paramètres des Exemplaires Reçus
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                  Quantité d'unités *
                </label>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={quantite}
                  onChange={(e) => setQuantite(Math.max(1, Number(e.target.value) || 1))}
                  required
                  className="w-full px-3 py-2 text-sm font-bold text-right bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                  Prix d'achat unitaire (DA) *
                </label>
                <input
                  type="number"
                  min={0}
                  value={prixAchat}
                  onChange={(e) => setPrixAchat(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="0"
                  required
                  className="w-full px-3 py-2 text-sm font-bold text-right bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-orange mb-1">
                  Prix de vente fixé (DA)
                </label>
                <input
                  type="number"
                  min={0}
                  value={prixVente}
                  onChange={(e) => setPrixVente(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="Optionnel"
                  className="w-full px-3 py-2 text-sm font-bold text-right bg-brand-orange/10 border border-brand-orange/30 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange text-brand-orange"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                  État / Grade
                </label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-2.5 py-2 text-xs font-semibold bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange"
                >
                  <option value="Neuf">Neuf / Emballé</option>
                  <option value="Grade A">Grade A (Excellent état)</option>
                  <option value="Grade B">Grade B (Traces d'usage)</option>
                  <option value="À réparer">À réparer / Tester</option>
                  <option value="Pour pièces">Pour pièces détachées</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Emplacement physique */}
              <div>
                <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                  Emplacement physique initial
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEmplacement("reserve")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      emplacement === "reserve"
                        ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey hover:border-brand-black"
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" /> Réserve (Carton)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEmplacement("vitrine")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 transition-all ${
                      emplacement === "vitrine"
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey text-brand-warm-grey hover:border-brand-orange"
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" /> Vitrine (Comptoir)
                  </button>
                </div>
              </div>

              {/* Rattachement Lot */}
              {lotsDisponibles.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-brand-black dark:text-white mb-1">
                    Rattachement à un Lot
                  </label>
                  <select
                    value={lotId}
                    onChange={(e) => setLotId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey dark:border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-orange font-medium"
                  >
                    <option value="">Stock indépendant (Sans lot)</option>
                    {lotsDisponibles.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.libelle}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Saisie des S/N individuels si quantité <= 10 */}
            {quantite > 0 && quantite <= 10 && (
              <div className="bg-brand-light-grey/15 dark:bg-white/5 p-3 rounded-xl border border-brand-light-grey/40 dark:border-white/5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-brand-black dark:text-white flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5" /> Numéros de série (S/N) constructeur (Optionnel)
                  </span>
                  <span className="text-[11px] text-brand-warm-grey">
                    Scannez à la douchette ou saisissez
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {numerosSerie.map((sn, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-brand-warm-grey w-6 text-right">
                        #{idx + 1}
                      </span>
                      <input
                        type="text"
                        value={sn}
                        onChange={(e) => {
                          const maj = [...numerosSerie];
                          maj[idx] = e.target.value;
                          setNumerosSerie(maj);
                        }}
                        placeholder={`S/N unité #${idx + 1}`}
                        className="flex-1 px-3 py-1 text-xs bg-white dark:bg-brand-paper border border-brand-light-grey rounded-lg font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer & Actions */}
          <div className="pt-3 border-t border-brand-light-grey/40 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs font-semibold text-brand-warm-grey cursor-pointer select-none">
              <input
                type="checkbox"
                checked={imprimerDirect}
                onChange={(e) => setImprimerDirect(e.target.checked)}
                className="w-4 h-4 rounded border-brand-light-grey text-brand-orange focus:ring-brand-orange"
              />
              <Printer className="w-3.5 h-3.5" /> Imprimer les étiquettes code-barres après validation
            </label>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onFermer}
                className="btn btn-secondaire text-xs py-2 px-4 rounded-xl flex-1 sm:flex-none"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={envoi}
                className="btn btn-primaire text-xs py-2 px-6 rounded-xl font-bold shadow-md flex items-center justify-center gap-2 flex-1 sm:flex-none"
              >
                <Check className="w-4 h-4" />
                {envoi ? "Génération en cours..." : `Enregistrer ${quantite} exemplaire${quantite > 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
