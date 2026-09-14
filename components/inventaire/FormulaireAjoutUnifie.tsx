"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Plus,
  X,
  Check,
  Scan,
  Archive,
  Eye,
  AlertCircle,
  Layers,
  Search,
  Trash2,
  Boxes,
} from "lucide-react";
import type { CategorieNoeud } from "./types";
import Modale from "@/components/Modale";
import ChampPhotos from "@/components/ChampPhotos";
import { useToast } from "@/components/toast";

/* ═══════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════ */

interface LotDisponible {
  id: number;
  libelle: string;
}

interface FormulaireAjoutUnifieProps {
  ouvert: boolean;
  onFermer: () => void;
  onSucces: () => void;
  categoriesTree: CategorieNoeud[];
  lotsDisponibles?: LotDisponible[];
}

type EmplacementType = "reserve" | "vitrine";
type BomRoleType = "component" | "finished" | "both";

/** Composant disponible en stock, prêt a etre integre dans une BOM */
interface ComposantStock {
  id: number;
  code_interne: string;
  reference: string;
  categorie: string;
  numero_serie: string | null;
  grade: string | null;
  prix_achat: number;
  image_url: string | null;
  modele?: { id: number; nom: string } | null;
}

/** Composant selectionne pour la BOM (avec quantite) */
interface ComposantBom extends ComposantStock {
  quantite: number;
}

/** Etat complet du formulaire */
interface FormulaireState {
  /* Identite */
  reference: string;
  categorie_id: string;
  marque: string;
  prix_vente_conseille: string;

  /* Stock */
  quantite: string;
  prix_achat: string;
  grade: string;
  emplacement: EmplacementType;
  lot_id: string;

  /* S/N */
  numeros_serie: string[];
  snInput: string;

  /* BOM */
  est_compose: boolean;
  bom_role: BomRoleType;
  composantsBom: ComposantBom[];

  /* UI */
  garderOuvert: boolean;
}

const ETAT_VIDE: FormulaireState = {
  reference: "",
  categorie_id: "",
  marque: "",
  prix_vente_conseille: "",
  quantite: "1",
  prix_achat: "",
  grade: "",
  emplacement: "reserve",
  lot_id: "",
  numeros_serie: [],
  snInput: "",
  est_compose: false,
  bom_role: "finished",
  composantsBom: [],
  garderOuvert: false,
};

/* ═══════════════════════════════════════════════════════════════
   CONSTANTES
   ═══════════════════════════════════════════════════════════════ */

const MARQUES_POPULAIRES = [
  "Lenovo", "HP", "Dell", "Apple", "Samsung", "ASUS", "Acer", "MSI",
  "Toshiba", "Sony", "LG", "Huawei", "Xiaomi", "Canon", "Epson", "Brother",
];

const GRADES = [
  { valeur: "Neuf", label: "Neuf" },
  { valeur: "Très bon état", label: "Tres bon etat" },
  { valeur: "Bon état", label: "Bon etat" },
  { valeur: "Usé", label: "Use" },
  { valeur: "Pour pièces", label: "Pour pieces" },
];

const BOM_ROLES: { valeur: BomRoleType; label: string; desc: string }[] = [
  { valeur: "finished", label: "Produit fini", desc: "Vendu seul" },
  { valeur: "component", label: "Composant", desc: "Integre a un autre" },
  { valeur: "both", label: "Les deux", desc: "Composant + vente" },
];

/* ═══════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════ */

interface CategoriePlat {
  id: number;
  nom: string;
  chemin: string;
}

/** Aplatit l'arborescence Famille > Categorie > Sous-categorie en liste plane */
function aplatirCategories(tree: CategorieNoeud[]): CategoriePlat[] {
  const result: CategoriePlat[] = [];
  for (const famille of tree) {
    for (const categorie of famille.enfants ?? []) {
      for (const sous of categorie.enfants ?? []) {
        result.push({
          id: sous.id,
          nom: sous.nom,
          chemin: `${famille.nom} > ${categorie.nom} > ${sous.nom}`,
        });
      }
      if ((categorie.enfants ?? []).length === 0) {
        result.push({
          id: categorie.id,
          nom: categorie.nom,
          chemin: `${famille.nom} > ${categorie.nom}`,
        });
      }
    }
    if ((famille.enfants ?? []).length === 0) {
      result.push({ id: famille.id, nom: famille.nom, chemin: famille.nom });
    }
  }
  return result;
}

/** Formate un nombre en devise DA sans decimales */
function formaterDA(valeur: number): string {
  return new Intl.NumberFormat("fr-DZ", {
    maximumFractionDigits: 0,
  }).format(valeur);
}

/* ═══════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ═══════════════════════════════════════════════════════════════ */

export default function FormulaireAjoutUnifie({
  ouvert,
  onFermer,
  onSucces,
  categoriesTree,
  lotsDisponibles = [],
}: FormulaireAjoutUnifieProps) {
  const { afficher } = useToast();
  const refReference = useRef<HTMLInputElement>(null);
  const refScan = useRef<HTMLInputElement>(null);

  /* ── Etat du formulaire ── */
  const [etat, setEtat] = useState<FormulaireState>(ETAT_VIDE);
  const [photos, setPhotos] = useState<string[]>([]);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  /* ── BOM : composants disponibles en stock ── */
  const [stockComposants, setStockComposants] = useState<ComposantStock[]>([]);
  const [chargementStock, setChargementStock] = useState(false);
  const [filtreComposant, setFiltreComposant] = useState("");

  const categories = useMemo(() => aplatirCategories(categoriesTree), [categoriesTree]);

  /* ═══════════════════════════════════════════════════════════════
     MISE A JOUR GENERIQUE DE L'ETAT
     ═══════════════════════════════════════════════════════════════ */

  const maj = useCallback(
    <K extends keyof FormulaireState>(cle: K, valeur: FormulaireState[K]) => {
      setEtat((e) => ({ ...e, [cle]: valeur }));
      if (erreur) setErreur(null);
    },
    [erreur],
  );

  /* ═══════════════════════════════════════════════════════════════
     NUMEROS DE SERIE
     ═══════════════════════════════════════════════════════════════ */

  const ajouterNumeroSerie = useCallback(
    (sn?: string) => {
      const texte = (sn ?? etat.snInput).trim();
      if (!texte) return;
      if (etat.numeros_serie.includes(texte)) {
        setErreur(`"${texte}" est deja dans la liste.`);
        return;
      }
      setErreur(null);
      setEtat((e) => {
        const nouveaux = [...e.numeros_serie, texte];
        const quantiteNum = Number(e.quantite) || 0;
        return {
          ...e,
          numeros_serie: nouveaux,
          snInput: "",
          quantite: String(Math.max(quantiteNum, nouveaux.length)),
        };
      });
      setTimeout(() => refScan.current?.focus(), 0);
    },
    [etat.snInput, etat.numeros_serie, etat.quantite],
  );

  const supprimerNumeroSerie = useCallback((index: number) => {
    setEtat((e) => {
      const nouveaux = e.numeros_serie.filter((_, i) => i !== index);
      const quantiteNum = Number(e.quantite) || 0;
      return {
        ...e,
        numeros_serie: nouveaux,
        quantite: String(Math.max(1, Math.min(quantiteNum, nouveaux.length || 1))),
      };
    });
  }, []);

  /* ═══════════════════════════════════════════════════════════════
     COMPOSANTS BOM — CHARGEMENT
     ═══════════════════════════════════════════════════════════════ */

  useEffect(() => {
    if (!etat.est_compose) {
      setStockComposants([]);
      setFiltreComposant("");
      return;
    }
    let annule = false;
    (async () => {
      setChargementStock(true);
      try {
        const res = await fetch("/api/produits/composants/disponibles?limit=300");
        if (res.ok && !annule) {
          const data = await res.json();
          setStockComposants(data.produits ?? []);
        }
      } catch {
        // Erreur reseau silencieuse — le tech peut reessayer
      } finally {
        if (!annule) setChargementStock(false);
      }
    })();
    return () => { annule = true; };
  }, [etat.est_compose]);

  /* ═══════════════════════════════════════════════════════════════
     COMPOSANTS BOM — FILTRAGE LOCAL
     ═══════════════════════════════════════════════════════════════ */

  const idsSelectionnes = useMemo(
    () => new Set(etat.composantsBom.map((c) => c.id)),
    [etat.composantsBom],
  );

  const composantsFiltres = useMemo(() => {
    const dejExclu = stockComposants.filter((c) => !idsSelectionnes.has(c.id));
    if (!filtreComposant.trim()) return dejExclu;
    const q = filtreComposant.toLowerCase();
    return dejExclu.filter(
      (c) =>
        c.reference.toLowerCase().includes(q) ||
        c.code_interne.toLowerCase().includes(q) ||
        c.categorie.toLowerCase().includes(q) ||
        (c.numero_serie || "").toLowerCase().includes(q) ||
        (c.modele?.nom || "").toLowerCase().includes(q),
    );
  }, [stockComposants, idsSelectionnes, filtreComposant]);

  /* ═══════════════════════════════════════════════════════════════
     COMPOSANTS BOM — AJOUT / RETIRER / QUANTITE
     ═══════════════════════════════════════════════════════════════ */

  const ajouterComposant = useCallback((c: ComposantStock) => {
    setEtat((e) => {
      const existant = e.composantsBom.find((x) => x.id === c.id);
      if (existant) {
        // Deduplication : incrementer la quantite
        return {
          ...e,
          composantsBom: e.composantsBom.map((x) =>
            x.id === c.id ? { ...x, quantite: x.quantite + 1 } : x,
          ),
        };
      }
      return {
        ...e,
        composantsBom: [...e.composantsBom, { ...c, quantite: 1 }],
      };
    });
  }, []);

  const retirerComposant = useCallback((id: number) => {
    setEtat((e) => ({
      ...e,
      composantsBom: e.composantsBom.filter((c) => c.id !== id),
    }));
  }, []);

  const majQuantiteComposant = useCallback((id: number, qte: number) => {
    const q = Math.max(1, Math.floor(qte));
    setEtat((e) => ({
      ...e,
      composantsBom: e.composantsBom.map((c) =>
        c.id === id ? { ...c, quantite: q } : c,
      ),
    }));
  }, []);

  /* ═══════════════════════════════════════════════════════════════
     REINITIALISATION
     ═══════════════════════════════════════════════════════════════ */

  const reinitialiser = useCallback(() => {
    const garder = etat.garderOuvert;
    setEtat({ ...ETAT_VIDE, garderOuvert: garder });
    setPhotos([]);
    setErreur(null);
    setFiltreComposant("");
    setStockComposants([]);
    setTimeout(() => refReference.current?.focus(), 100);
  }, [etat.garderOuvert]);

  /* ═══════════════════════════════════════════════════════════════
     SOUMISSION
     ═══════════════════════════════════════════════════════════════ */

  const validerEtSoumettre = useCallback(async () => {
    setErreur(null);

    // --- Validations cote client ---
    if (!etat.reference.trim()) {
      setErreur("La reference / designation est obligatoire.");
      return;
    }
    if (!etat.categorie_id) {
      setErreur("Veuillez selectionner une categorie.");
      return;
    }
    if (!etat.prix_achat) {
      setErreur("Le prix d'achat est obligatoire.");
      return;
    }
    const prixAchat = Number(etat.prix_achat);
    if (!Number.isFinite(prixAchat) || prixAchat < 0) {
      setErreur("Le prix d'achat doit etre un nombre positif.");
      return;
    }
    if (etat.est_compose && etat.composantsBom.length === 0) {
      setErreur("Le mode compose est active mais aucun composant n'a ete selectionne.");
      return;
    }

    setEnvoi(true);

    try {
      // ─── ETAPE 1 : Creer le modele ───
      const modeleId = await creerOuRetrouverModele(etat.reference, etat.categorie_id, etat.marque, etat.prix_vente_conseille, photos[0] ?? null);
      if (modeleId === null) return; // erreur deja affichee

      // ─── ETAPE 2 : Creer les exemplaires physiques ───
      const resExemplaires = await fetch(`/api/modeles/${modeleId}/exemplaires`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantite: Number(etat.quantite) || 1,
          prix_achat: prixAchat,
          prix_vente_fixe: Number(etat.prix_vente_conseille) || null,
          lot_id: etat.lot_id ? Number(etat.lot_id) : null,
          grade: etat.grade || null,
          emplacement: etat.emplacement,
          numeros_serie: etat.numeros_serie,
          en_vitrine: etat.emplacement === "vitrine",
          bom_role: etat.bom_role,
          est_compose: etat.est_compose,
        }),
      });

      if (!resExemplaires.ok) {
        const errData = await resExemplaires.json();
        throw new Error(errData.error || "Erreur creation exemplaires.");
      }

      const exemplairesData = await resExemplaires.json();
      const tousLesCodes: string[] = exemplairesData?.codes ?? [];

      // ─── ETAPE 3 : Attacher la BOM a CHAQUE exemplaire ───
      if (etat.est_compose && etat.composantsBom.length > 0 && tousLesCodes.length > 0) {
        const erreurs = await attacherBomAuxExemplaires(tousLesCodes, etat.composantsBom);
        if (erreurs.length > 0) {
          const apercus = erreurs.slice(0, 5).join(" | ");
          const reste = erreurs.length > 5 ? ` (+${erreurs.length - 5} autres)` : "";
          afficher(`Produit cree mais ${erreurs.length} erreur(s) BOM : ${apercus}${reste}`, "erreur");
          if (etat.garderOuvert) {
            reinitialiser();
          } else {
            onFermer();
            onSucces();
          }
          return;
        }
      }

      // ─── SUCCES ───
      afficher("Produit ajoute avec succes !", "succes");

      if (etat.garderOuvert) {
        reinitialiser();
      } else {
        onFermer();
        onSucces();
      }
    } catch (err: any) {
      setErreur(err.message || "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setEnvoi(false);
    }
  }, [etat, photos, onFermer, onSucces, afficher, reinitialiser]);

  /* ── Rendu ── */
  if (!ouvert) return null;

  const submitDisabled =
    envoi ||
    !etat.reference.trim() ||
    !etat.categorie_id ||
    !etat.prix_achat;

  const nbPiecesTotal = etat.composantsBom.reduce((s, c) => s + c.quantite, 0);
  const coutTotalBom = etat.composantsBom.reduce((s, c) => s + c.prix_achat * c.quantite, 0);

  return (
    <Modale titre="Ajouter un produit" ouverte={ouvert} onFermer={onFermer} large="2xl">
      <div className="space-y-6">

        {/* ═══════════ ERREUR ═══════════ */}
        {erreur && (
          <div className="rounded-2xl bg-danger/10 border border-danger/30 text-danger text-xs font-bold p-3 flex items-center gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{erreur}</span>
          </div>
        )}

        {/* ═══════════ COLONNES 2 — IDENTITE + STOCK ═══════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">

          {/* ── COLONNE GAUCHE : IDENTITE ── */}
          <div className="space-y-4">
            <SectionTitre label="Identite" />

            {/* Reference / Designation */}
            <ChampTexte
              ref={refReference}
              label="Reference / Designation"
              valeur={etat.reference}
              onChange={(v) => maj("reference", v)}
              placeholder="Ex. ThinkPad T480 i5 8Go 256Go SSD"
              requis
            />

            {/* Categorie */}
            <ChampSelect
              label="Categorie"
              valeur={etat.categorie_id}
              onChange={(v) => maj("categorie_id", v)}
              options={categories.map((c) => ({ valeur: String(c.id), label: c.chemin }))}
              placeholder="Selectionner..."
              requis
            />

            {/* Marque */}
            <div>
              <ChampTexte
                label="Marque"
                valeur={etat.marque}
                onChange={(v) => maj("marque", v)}
                placeholder="Saisissez ou choisissez..."
              />
              <div className="flex flex-wrap gap-1.5 mt-2">
                {MARQUES_POPULAIRES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => maj("marque", etat.marque === m ? "" : m)}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                      etat.marque === m
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-orange/60"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Role BOM */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
                Utilisation du produit
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {BOM_ROLES.map((opt) => (
                  <button
                    key={opt.valeur}
                    type="button"
                    onClick={() => maj("bom_role", opt.valeur)}
                    className={`py-2 px-2 rounded-xl text-center border transition-all ${
                      etat.bom_role === opt.valeur
                        ? "bg-brand-orange text-white border-brand-orange shadow-xs"
                        : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey hover:border-brand-orange/60"
                    }`}
                  >
                    <span className="text-[11px] font-black block">{opt.label}</span>
                    <span className="text-[9px] opacity-70 block">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Prix de vente */}
            <ChampPrix
              label="Prix de vente (DA)"
              valeur={etat.prix_vente_conseille}
              onChange={(v) => maj("prix_vente_conseille", v)}
              placeholder="ex: 45 000"
            />
          </div>

          {/* ── COLONNE DROITE : STOCK ── */}
          <div className="space-y-4">
            <SectionTitre label="Stock" />

            {/* Quantite */}
            <ChampTexte
              label="Quantite"
              valeur={etat.quantite}
              onChange={(v) => maj("quantite", String(Math.max(1, Number(v) || 1)))}
              type="number"
              alignDroit
              styleNoir
            />

            {/* Prix d'achat */}
            <ChampPrix
              label="Prix d'achat (DA)"
              valeur={etat.prix_achat}
              onChange={(v) => maj("prix_achat", v)}
              placeholder="ex: 15 000"
              requis
            />

            {/* Grade */}
            <ChampSelect
              label="Grade / Etat"
              valeur={etat.grade}
              onChange={(v) => maj("grade", v)}
              options={GRADES.map((g) => ({ valeur: g.valeur, label: g.label }))}
              placeholder="Selectionner..."
            />

            {/* Emplacement — Toggle pill */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
                Emplacement
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => maj("emplacement", "reserve")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    etat.emplacement === "reserve"
                      ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-transparent shadow-xs"
                      : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                  }`}
                >
                  <Archive className="w-3.5 h-3.5" /> Reserve
                </button>
                <button
                  type="button"
                  onClick={() => maj("emplacement", "vitrine")}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    etat.emplacement === "vitrine"
                      ? "bg-purple-600 text-white border-purple-600 shadow-xs"
                      : "bg-white dark:bg-brand-paper border-brand-light-grey dark:border-white/10 text-brand-warm-grey"
                  }`}
                >
                  <Eye className="w-3.5 h-3.5" /> Vitrine
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════════ PLEINE LARGEUR — OPTIONS ═══════════ */}
        <div className="space-y-5">
          <SectionTitre label="Options" />

          {/* ── Scan S/N ── */}
          <SectionScanSn
            numerosSerie={etat.numeros_serie}
            snInput={etat.snInput}
            onSnInputChange={(v) => maj("snInput", v)}
            onAjouterSn={ajouterNumeroSerie}
            onSupprimerSn={supprimerNumeroSerie}
            refScan={refScan}
          />

          {/* ── Produit Compose (BOM) ── */}
          <SectionBom
            estCompose={etat.est_compose}
            onToggleCompose={(v) => maj("est_compose", v)}
            composantsSelectionnes={etat.composantsBom}
            stockComposants={composantsFiltres}
            chargement={chargementStock}
            filtre={filtreComposant}
            onFiltreChange={setFiltreComposant}
            onAjouterComposant={ajouterComposant}
            onRetirerComposant={retirerComposant}
            onMajQuantite={majQuantiteComposant}
            nbPiecesTotal={nbPiecesTotal}
            coutTotal={coutTotalBom}
            nbStockTotal={stockComposants.length}
          />

          {/* ── Photos ── */}
          <div>
            <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
              Photos
            </label>
            <ChampPhotos photos={photos} onChange={setPhotos} />
          </div>

          {/* ── Lot d'arrivage ── */}
          {lotsDisponibles.length > 0 && (
            <ChampSelect
              label="Lot d'arrivage"
              valeur={etat.lot_id}
              onChange={(v) => maj("lot_id", v)}
              options={lotsDisponibles.map((l) => ({ valeur: String(l.id), label: l.libelle }))}
              placeholder="Hors-lot (Arrivage direct)"
            />
          )}
        </div>

        {/* ═══════════ FOOTER ═══════════ */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-brand-light-grey/40 dark:border-white/10">
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={etat.garderOuvert}
              onChange={(e) => maj("garderOuvert", e.target.checked)}
              className="checkbox checkbox-sm checkbox-primary rounded-md"
            />
            <span className="text-xs font-bold text-brand-black dark:text-white">
              Garder ouvert
            </span>
          </label>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onFermer}
              disabled={envoi}
              className="btn btn-secondaire text-xs py-2.5 px-5 rounded-2xl font-bold"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={validerEtSoumettre}
              disabled={submitDisabled}
              className="btn btn-primaire text-xs py-2.5 px-6 rounded-2xl font-black shadow-xs flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {envoi ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Enregistrement...
                </span>
              ) : (
                <>
                  <Check className="w-4 h-4" /> Ajouter le produit
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modale>
  );
}

/* ═══════════════════════════════════════════════════════════════
   FONCTIONS ASYNCHRONES HORS COMPOSANT
   ═══════════════════════════════════════════════════════════════ */

/**
 * Cree un modele ou en retrouve un existant. Retourne l'ID ou null en cas d'erreur.
 */
async function creerOuRetrouverModele(
  reference: string,
  categorieId: string,
  marque: string,
  prixVente: string,
  imageUrl: string | null,
): Promise<number | null> {
  const resModele = await fetch("/api/modeles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      nom: reference.trim(),
      categorie_id: Number(categorieId),
      attributs: { marque: marque || undefined },
      prix_vente_conseille: Number(prixVente) || null,
      image_url: imageUrl || null,
    }),
  });

  if (resModele.ok) {
    const data = await resModele.json();
    return data.id;
  }

  // Modele existe deja → recherche
  const errData = await resModele.json();
  if (errData.error?.includes("existe deja")) {
    const resSearch = await fetch(
      `/api/modeles?q=${encodeURIComponent(reference.trim())}&categorie_id=${categorieId}`,
    );
    const dataSearch = await resSearch.json();
    if (Array.isArray(dataSearch) && dataSearch.length > 0) {
      return dataSearch[0].id;
    }
  }

  throw new Error(errData.error || "Erreur creation modele.");
  return null;
}

/**
 * Attache les composants BOM a chaque exemplaire cree.
 * Retourne un tableau d'erreurs (vide si tout est OK).
 *
 * CORRECTIONS BOM APPLIQUEES :
 * - Attache a TOUS les exemplaires (pas seulement le premier)
 * - Envoie est_compose via PATCH avant d'attacher
 * - Verifie chaque reponse HTTP
 * - Gere les erreurs individuellement sans bloquer
 */
async function attacherBomAuxExemplaires(
  codes: string[],
  composants: ComposantBom[],
): Promise<string[]> {
  const erreurs: string[] = [];

  for (const code of codes) {
    // Retrouver le produit par code_interne
    const resSearch = await fetch(`/api/produits?code_exact=${encodeURIComponent(code)}`);
    if (!resSearch.ok) {
      erreurs.push(`${code}: impossible de retrouver le produit`);
      continue;
    }
    const searchData = await resSearch.json();
    const produit = searchData?.produits?.[0];
    if (!produit?.id) {
      erreurs.push(`${code}: produit non trouve apres creation`);
      continue;
    }

    // Marquer comme compose (PATCH verifie)
    const resPatch = await fetch(`/api/produits/${produit.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ est_compose: true }),
    });
    if (!resPatch.ok) {
      erreurs.push(`${code}: impossible de marquer comme compose`);
    }

    // Attacher chaque composant avec sa quantite
    for (const comp of composants) {
      try {
        const resComp = await fetch(`/api/produits/${produit.id}/composants`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ composant_id: comp.id, quantite: comp.quantite }),
        });
        if (!resComp.ok) {
          const errData = await resComp.json().catch(() => null);
          erreurs.push(`[${code}] ${comp.reference}: ${errData?.error || "Erreur"}`);
        }
      } catch {
        erreurs.push(`[${code}] ${comp.reference}: Erreur reseau`);
      }
    }
  }

  return erreurs;
}

/* ═══════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS — CHAMPS DE FORMULAIRE
   ═══════════════════════════════════════════════════════════════ */

/** Titre de section avec ligne decorative */
function SectionTitre({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full bg-brand-orange shrink-0" />
      <span className="text-xs font-extrabold uppercase tracking-wider text-brand-orange">
        {label}
      </span>
      <div className="flex-1 h-px bg-brand-light-grey dark:bg-white/10" />
    </div>
  );
}

/** Champ texte avec label */
const ChampTexte = React.forwardRef<
  HTMLInputElement,
  {
    label: string;
    valeur: string;
    onChange: (v: string) => void;
    placeholder?: string;
    requis?: boolean;
    type?: string;
    alignDroit?: boolean;
    styleNoir?: boolean;
    monospace?: boolean;
  }
>(
  (
    { label, valeur, onChange, placeholder, requis, type = "text", alignDroit, styleNoir, monospace },
    ref,
  ) => (
    <div>
      <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
        {label} {requis && <span className="text-brand-orange">*</span>}
      </label>
      <input
        ref={ref}
        type={type}
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`champ ${alignDroit ? "text-right" : ""} ${styleNoir ? "font-black" : ""} ${monospace ? "font-mono" : ""}`}
        autoComplete="off"
      />
    </div>
  ),
);
ChampTexte.displayName = "ChampTexte";

/** Champ select avec label */
function ChampSelect({
  label,
  valeur,
  onChange,
  options,
  placeholder,
  requis,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  options: { valeur: string; label: string }[];
  placeholder?: string;
  requis?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
        {label} {requis && <span className="text-brand-orange">*</span>}
      </label>
      <select
        value={valeur}
        onChange={(e) => onChange(e.target.value)}
        className="champ"
      >
        <option value="">{placeholder || "Selectionner..."}</option>
        {options.map((o) => (
          <option key={o.valeur} value={o.valeur}>
            {o.label}
          </option>
        ))}
        {options.length === 0 && (
          <option value="" disabled>
            Aucune option disponible
          </option>
        )}
      </select>
    </div>
  );
}

/** Champ prix avec suffixe DA */
function ChampPrix({
  label,
  valeur,
  onChange,
  placeholder,
  requis,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  placeholder?: string;
  requis?: boolean;
}) {
  return (
    <div>
      <label className="text-xs font-extrabold uppercase tracking-wider text-brand-warm-grey mb-1.5 block">
        {label} {requis && <span className="text-brand-orange">*</span>}
      </label>
      <div className="relative">
        <input
          type="number"
          min={0}
          value={valeur}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="champ pr-12"
        />
        <span className="absolute right-4 top-3 text-xs font-black text-brand-warm-grey pointer-events-none">
          DA
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS — SECTION SCAN S/N
   ═══════════════════════════════════════════════════════════════ */

function SectionScanSn({
  numerosSerie,
  snInput,
  onSnInputChange,
  onAjouterSn,
  onSupprimerSn,
  refScan,
}: {
  numerosSerie: string[];
  snInput: string;
  onSnInputChange: (v: string) => void;
  onAjouterSn: (sn?: string) => void;
  onSupprimerSn: (index: number) => void;
  refScan: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="p-4 rounded-2xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Scan className="w-4 h-4 text-brand-orange" />
          <span className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white">
            Numeros de serie (S/N)
          </span>
        </div>
        {numerosSerie.length > 0 && (
          <span className="text-xs font-black text-brand-orange">
            {numerosSerie.length} scanne{numerosSerie.length > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <input
          ref={refScan}
          type="text"
          value={snInput}
          onChange={(e) => onSnInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onAjouterSn();
            }
          }}
          placeholder="Scanner ou saisir un N de serie"
          className="champ flex-1 font-mono"
        />
        <button
          type="button"
          onClick={() => onAjouterSn()}
          className="btn btn-primaire px-4 rounded-xl text-xs font-bold shrink-0"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {numerosSerie.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1 max-h-32 overflow-y-auto">
          {numerosSerie.map((sn, i) => (
            <span
              key={`${sn}-${i}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white dark:bg-brand-paper border border-brand-light-grey/80 dark:border-white/10 shadow-xs"
            >
              <span className="text-brand-warm-grey">#{i + 1}</span>
              <span>{sn}</span>
              <button
                type="button"
                onClick={() => onSupprimerSn(i)}
                className="text-brand-warm-grey hover:text-danger ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      <p className="text-[11px] text-brand-warm-grey">
        Si aucun S/N n est scanne, les produits seront crees sans numero de serie.
      </p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════
   SOUS-COMPOSANTS — SECTION BOM
   ═══════════════════════════════════════════════════════════════ */

function SectionBom({
  estCompose,
  onToggleCompose,
  composantsSelectionnes,
  stockComposants,
  chargement,
  filtre,
  onFiltreChange,
  onAjouterComposant,
  onRetirerComposant,
  onMajQuantite,
  nbPiecesTotal,
  coutTotal,
  nbStockTotal,
}: {
  estCompose: boolean;
  onToggleCompose: (v: boolean) => void;
  composantsSelectionnes: ComposantBom[];
  stockComposants: ComposantStock[];
  chargement: boolean;
  filtre: string;
  onFiltreChange: (v: string) => void;
  onAjouterComposant: (c: ComposantStock) => void;
  onRetirerComposant: (id: number) => void;
  onMajQuantite: (id: number, qte: number) => void;
  nbPiecesTotal: number;
  coutTotal: number;
  nbStockTotal: number;
}) {
  return (
    <div className="p-4 rounded-2xl bg-brand-paper dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10 space-y-3">
      {/* En-tete + toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-brand-orange" />
          <span className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white">
            Produit Compose (BOM)
          </span>
          {composantsSelectionnes.length > 0 && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-brand-orange text-white">
              {composantsSelectionnes.length}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleCompose(!estCompose)}
          className={`relative w-11 h-6 rounded-full transition-colors ${
            estCompose ? "bg-brand-orange" : "bg-brand-light-grey dark:bg-white/20"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              estCompose ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {estCompose && (
        <div className="space-y-3 animate-entree">
          <p className="text-[11px] text-brand-warm-grey">
            Activez ce mode pour assembler ce produit avec des composants du stock.
          </p>

          {/* Recherche / filtre */}
          <div className="relative">
            <Search className="w-4 h-4 text-brand-warm-grey absolute left-3 top-2.5" />
            <input
              type="text"
              value={filtre}
              onChange={(e) => onFiltreChange(e.target.value)}
              placeholder="Filtrer par reference, categorie, code..."
              className="champ pl-9 text-xs"
            />
            {filtre && (
              <button
                type="button"
                onClick={() => onFiltreChange("")}
                className="absolute right-3 top-2.5 text-brand-warm-grey hover:text-brand-black"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Indicateur de stock */}
          {!chargement && nbStockTotal > 0 && (
            <p className="text-[10px] text-brand-warm-grey font-bold">
              {nbStockTotal} composant{nbStockTotal > 1 ? "s" : ""} disponible{nbStockTotal > 1 ? "s" : ""} en stock
            </p>
          )}

          {/* Chargement */}
          {chargement && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-brand-warm-grey">
              <span className="w-4 h-4 border-2 border-brand-orange/30 border-t-brand-orange rounded-full animate-spin" />
              Chargement du stock disponible...
            </div>
          )}

          {/* Liste vide */}
          {!chargement && stockComposants.length === 0 && (
            <div className="py-6 text-center border border-dashed border-brand-light-grey/60 rounded-xl">
              <Boxes className="w-6 h-6 text-brand-warm-grey/40 mx-auto mb-1.5" />
              <p className="text-[11px] text-brand-warm-grey font-bold">
                {nbStockTotal === 0
                  ? "Aucun composant compatible en stock."
                  : "Aucun resultat pour ce filtre."}
              </p>
            </div>
          )}

          {/* Liste des composants disponibles */}
          {!chargement && stockComposants.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {stockComposants.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onAjouterComposant(c)}
                  className="w-full flex items-center justify-between gap-2 p-2.5 rounded-xl border border-brand-light-grey/50 dark:border-white/10 bg-white dark:bg-brand-paper hover:border-brand-orange/60 hover:bg-brand-orange/5 transition text-left"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-brand-orange">
                        {c.code_interne}
                      </span>
                      <span className="text-[11px] font-extrabold text-brand-black dark:text-white truncate">
                        {c.reference}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-brand-warm-grey mt-0.5">
                      <span className="px-1.5 py-0.5 rounded bg-brand-light-grey/30 dark:bg-white/5 font-bold">
                        {c.categorie}
                      </span>
                      {c.grade && <span>. {c.grade}</span>}
                      {c.numero_serie && <span>. S/N: {c.numero_serie}</span>}
                      {c.prix_achat > 0 && (
                        <span className="text-brand-orange font-bold">
                          . {formaterDA(c.prix_achat)} DA
                        </span>
                      )}
                    </div>
                  </div>
                  <Plus className="w-4 h-4 text-brand-orange shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* Composants selectionnes */}
          {composantsSelectionnes.length > 0 && (
            <div className="space-y-1.5">
              {/* Recapitulatif */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase text-brand-warm-grey">
                  Integres ({nbPiecesTotal} piece{nbPiecesTotal > 1 ? "s" : ""})
                </span>
                {coutTotal > 0 && (
                  <span className="text-[10px] font-bold text-brand-orange">
                    {formaterDA(coutTotal)} DA au cout
                  </span>
                )}
              </div>

              {/* Liste des composants integres */}
              {composantsSelectionnes.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-brand-orange/5 dark:bg-brand-orange/10 border border-brand-orange/20"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <Layers className="w-3 h-3 text-brand-orange shrink-0" />
                    <span className="font-mono text-[10px] font-bold text-brand-orange">
                      {c.code_interne}
                    </span>
                    <span className="text-[11px] font-bold text-brand-black dark:text-white truncate">
                      {c.reference}
                    </span>
                    <span className="text-[10px] text-brand-warm-grey hidden sm:inline">
                      {c.categorie}
                    </span>
                  </div>

                  {/* Controles quantite */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => onMajQuantite(c.id, c.quantite - 1)}
                      disabled={c.quantite <= 1}
                      className="w-6 h-6 rounded-lg bg-white dark:bg-white/10 border border-brand-light-grey dark:border-white/10 flex items-center justify-center text-xs font-bold text-brand-black dark:text-white hover:bg-brand-light-grey/40 disabled:opacity-30 transition"
                    >
                      -
                    </button>
                    <span className="w-7 text-center text-[11px] font-mono font-black text-brand-orange">
                      {c.quantite}
                    </span>
                    <button
                      type="button"
                      onClick={() => onMajQuantite(c.id, c.quantite + 1)}
                      className="w-6 h-6 rounded-lg bg-brand-orange text-white flex items-center justify-center text-xs font-bold hover:bg-brand-orange/90 transition"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => onRetirerComposant(c.id)}
                      className="ml-1 p-1 rounded-lg text-brand-warm-grey hover:text-danger hover:bg-danger/10 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
