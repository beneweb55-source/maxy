"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Download,
  X,
  CheckSquare,
  Square,
  FileSpreadsheet,
  FileText,
  Filter,
  Sparkles,
  Check,
  AlertTriangle,
} from "lucide-react";
import { useToast } from "@/components/toast";
import {
  COLONNES_DISPONIBLES,
  MAX_IDS_SELECTION,
  PARAM_COMPTE,
  PARAM_FORMAT_FICHIER,
  PARAM_IDS,
  PARAM_SCOPE,
  PRESETS_COLONNES,
  type CategorieColonneExport,
  type ScopeExport,
} from "@/lib/export-inventaire";

/**
 * Clés de l'URL de l'inventaire qui n'ont aucun sens dans un fichier exporté.
 * `page` désigne une page de l'écran, pas un filtre : la laisser passer donnait
 * un paramètre que rien ne lit, et un lecteur pressé pouvait croire que
 * l'export n'exportait qu'une page.
 */
const CLES_URL_SANS_OBJET_A_L_EXPORT = ["page"] as const;

/** L'ordre d'affichage des groupes, pour que la grille se lise comme la donnée. */
const ORDRE_CATEGORIES: CategorieColonneExport[] = [
  "identification",
  "technique",
  "financier",
  "logistique",
];

const TITRES_CATEGORIES: Record<CategorieColonneExport, string> = {
  identification: "Identification",
  technique: "Technique",
  financier: "Financier",
  logistique: "Logistique",
};

interface ModaleExportProps {
  ouverte: boolean;
  onFermer: () => void;
  searchParamsString: string;
  /** Les unités cochées dans l'inventaire, pour le périmètre « sélection ». */
  selection?: number[];
}

export default function ModaleExport({
  ouverte,
  onFermer,
  searchParamsString,
  selection = [],
}: ModaleExportProps) {
  const { afficher } = useToast();

  const [colonnesSelectionnees, setColonnesSelectionnees] = useState<string[]>(
    COLONNES_DISPONIBLES.filter((c) => c.defaut).map((c) => c.id)
  );
  const [formatFichier, setFormatFichier] = useState<"csv_excel" | "csv_standard" | "xlsx">("csv_excel");
  const [scopeExport, setScopeExport] = useState<ScopeExport>("filtres");
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);

  const nbSelection = selection.length;

  /**
   * Les paramètres de l'écran qui définissent chaque périmètre.
   *
   * Extrait de `construireRequete` pour que le COMPTAGE et le TÉLÉCHARGEMENT
   * soient bâtis sur la même source : la carte « Filtres actuels » ne peut
   * alors annoncer qu'un nombre que la route calcule avec le `where` exact du
   * fichier. `page` désigne une page de l'écran, pas un filtre : il est retiré
   * ici, donc pour les deux.
   */
  const parametresDePerimetre = useCallback(
    (scope: ScopeExport): URLSearchParams => {
      const source = new URLSearchParams(searchParamsString);
      for (const cle of CLES_URL_SANS_OBJET_A_L_EXPORT) source.delete(cle);

      if (scope === "filtres") return source;

      // « stock » et « sélection » ignorent les filtres de l'écran ; `tri` et
      // `ordre` voyagent quand même, pour que le fichier se lise dans le même
      // ordre que l'écran.
      const params = new URLSearchParams();
      for (const cle of ["tri", "ordre"]) {
        const valeur = source.get(cle);
        if (valeur !== null) params.set(cle, valeur);
      }
      return params;
    },
    [searchParamsString]
  );

  /**
   * Combien de lignes le fichier contiendrait, pour le périmètre « filtres ».
   *
   * La carte lisait auparavant le total de `donnees` — la dernière liste
   * chargée par l'écran. Ce n'est pas le périmètre de l'export, et cette liste
   * n'est même pas chargée dans les vues famille et catégorie, où elle reste
   * donc figée sur la vue précédente. Mesuré sur
   * `?vue=famille&famille_id=16&en_vitrine=1` : la carte annonçait 1616
   * articles, le fichier en aurait contenu 57. Seul le serveur construit le
   * `where` du fichier : c'est donc lui qui répond.
   */
  const [nbFiltres, setNbFiltres] = useState<number | null>(null);
  useEffect(() => {
    if (!ouverte) return;
    const controleur = new AbortController();
    // Revenir au calcul en cours plutôt que de garder le chiffre précédent :
    // entre deux filtres, un ancien total est un mensonge, pas une
    // approximation.
    setNbFiltres(null);

    const params = parametresDePerimetre("filtres");
    params.set(PARAM_SCOPE, "filtres");
    params.set(PARAM_COMPTE, "1");

    void (async () => {
      try {
        const res = await fetch(`/api/produits/export?${params.toString()}`, {
          cache: "no-store",
          signal: controleur.signal,
        });
        if (!res.ok) return;
        const corps = (await res.json()) as { total?: unknown };
        if (typeof corps.total === "number") setNbFiltres(corps.total);
      } catch {
        // Silence volontaire : on reste sur « Calcul en cours… ». Un comptage
        // qui échoue ne doit pas se transformer en un chiffre inventé.
      }
    })();

    return () => controleur.abort();
  }, [ouverte, parametresDePerimetre]);

  useEffect(() => {
    if (ouverte) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [ouverte]);

  // La sélection peut changer pendant que la modale est ouverte (une action
  // groupée la consomme, ou l'utilisateur coche plus de lignes). Rester sur
  // « sélection » enverrait alors une requête vide ou trop longue, que la route
  // refuse — autant revenir d'office sur les filtres.
  const selectionHorsLimite = nbSelection === 0 || nbSelection > MAX_IDS_SELECTION;
  useEffect(() => {
    if (selectionHorsLimite && scopeExport === "selection") setScopeExport("filtres");
  }, [selectionHorsLimite, scopeExport]);

  if (!ouverte) return null;

  const toggleColonne = (id: string) => {
    setColonnesSelectionnees((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  /**
   * La requête que reçoit la route d'export.
   *
   * `tri` et `ordre` voyagent dans TOUS les périmètres. L'ancienne carte
   * « tout le catalogue » jetait la chaîne de requête entière : le fichier
   * sortait dans un ordre différent de l'écran sans que rien ne le dise.
   */
  const construireRequete = (): URLSearchParams => {
    // Les filtres de l'écran, transmis tels quels : ce que la liste honore, le
    // fichier l'honore — les deux lisent le même constructeur côté serveur. Et
    // le comptage lit la même source, donc il ne peut pas annoncer autre chose.
    const params = parametresDePerimetre(scopeExport);

    if (scopeExport === "selection") params.set(PARAM_IDS, selection.join(","));

    params.set("colonnes", colonnesSelectionnees.join(","));
    params.set(PARAM_FORMAT_FICHIER, formatFichier);
    params.set(PARAM_SCOPE, scopeExport);
    return params;
  };

  const lancerExport = async () => {
    if (colonnesSelectionnees.length === 0) {
      afficher("Veuillez sélectionner au moins une colonne à exporter.", "erreur");
      return;
    }

    setTelechargementEnCours(true);

    try {
      const params = construireRequete();
      const response = await fetch(`/api/produits/export?${params.toString()}`);

      if (!response.ok) {
        // La route explique précisément ce qui manque (« Aucune ligne
        // sélectionnée… ») : le message générique l'écrasait.
        const corps = await response.json().catch(() => null);
        throw new Error(corps?.error || "Erreur lors de la génération du fichier d'export.");
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;

      // Le serveur nomme déjà le fichier d'après le périmètre et le format
      // réels. Le refabriquer ici pouvait mentir sur l'un comme sur l'autre.
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const nomServeur = /filename="([^"]+)"/.exec(disposition)?.[1];
      const extension = formatFichier === "xlsx" ? "xlsx" : "csv";
      a.download =
        nomServeur ??
        `inventaire_${scopeExport === "filtres" ? "filtre" : scopeExport}_${new Date()
          .toISOString()
          .slice(0, 10)}.${extension}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      afficher("Fichier d'inventaire exporté avec succès !", "succes");
      onFermer();
    } catch (err: any) {
      afficher(err.message || "Erreur lors de l'exportation.", "erreur");
    } finally {
      setTelechargementEnCours(false);
    }
  };

  const perimetres: { id: ScopeExport; titre: string; detail: string; desactive: boolean }[] = [
    {
      id: "filtres",
      titre: "Filtres actuels uniquement",
      // Le nombre est celui du périmètre, mesuré par le serveur avec le `where`
      // du fichier — jamais celui de la liste affichée, qui peut être plus
      // vieille, paginée, ou pas chargée du tout.
      detail:
        nbFiltres === null
          ? "Calcul en cours…"
          : `${nbFiltres} article${nbFiltres > 1 ? "s" : ""} à exporter`,
      desactive: false,
    },
    {
      id: "stock",
      titre: "Tout le stock",
      detail: "Tous les articles en stock — vendus, HS et assemblés exclus",
      desactive: false,
    },
    {
      id: "selection",
      titre: "La sélection cochée",
      detail:
        nbSelection === 0
          ? "Aucune ligne cochée dans l'inventaire"
          : nbSelection > MAX_IDS_SELECTION
            ? `${nbSelection} lignes : au-delà du plafond de ${MAX_IDS_SELECTION}. Filtrez plutôt l'inventaire.`
            : `${nbSelection} ligne${nbSelection > 1 ? "s" : ""} cochée${nbSelection > 1 ? "s" : ""}`,
      desactive: selectionHorsLimite,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/20 backdrop-blur-sm animate-entree">
      <div className="relative w-11/12 max-w-3xl max-h-[85vh] flex flex-col bg-white dark:bg-brand-paper rounded-3xl border border-brand-light-grey dark:border-white/10 shadow-2xl overflow-hidden">

        {/* En-tête */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-brand-orange/15 text-brand-orange">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black font-outfit text-brand-black dark:text-white">
                Exporter l'Inventaire
              </h2>
              <p className="text-xs text-brand-warm-grey font-medium">
                Personnalisez les colonnes, le format et le périmètre d'export
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onFermer}
            className="p-2 rounded-xl text-brand-warm-grey hover:text-brand-black dark:hover:text-white hover:bg-brand-light-grey/40 dark:hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* 1. Périmètre de l'export */}
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
              <Filter className="w-4 h-4 text-brand-orange" />
              1. Périmètre des produits à exporter
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {perimetres.map((p) => {
                const actif = scopeExport === p.id;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      if (p.desactive) return;
                      setScopeExport(p.id);
                    }}
                    aria-disabled={p.desactive}
                    className={`p-3.5 rounded-2xl border transition-all flex items-start justify-between gap-2 ${
                      p.desactive
                        ? "border-brand-light-grey/40 dark:border-white/5 bg-brand-light-grey/10 dark:bg-white/2 opacity-50 cursor-not-allowed"
                        : actif
                          ? "border-brand-orange bg-brand-orange/10 shadow-xs cursor-pointer"
                          : "border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/3 hover:border-brand-light-grey dark:hover:border-white/20 cursor-pointer"
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold text-brand-black dark:text-white">
                        {p.titre}
                      </div>
                      <div className="text-[11px] text-brand-warm-grey mt-0.5 leading-snug">
                        {p.detail}
                      </div>
                    </div>
                    {actif && <Check className="w-4 h-4 text-brand-orange shrink-0" />}
                  </div>
                );
              })}
            </div>

            {scopeExport === "stock" && (
              <p className="flex items-start gap-1.5 text-[11px] text-brand-warm-grey font-medium pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-orange" />
                Cette option ignore volontairement vos filtres : le fichier contient tout
                le stock. Elle conserve en revanche le tri de l'écran.
              </p>
            )}
          </div>

          {/* 2. Modèles de colonnes prêts à l'emploi */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-brand-orange" />
                2. Modèles de colonnes prêts à l'emploi
              </label>
              <span className="text-[11px] font-bold text-brand-orange">
                {colonnesSelectionnees.length} / {COLONNES_DISPONIBLES.length} sélectionnée
                {colonnesSelectionnees.length > 1 ? "s" : ""}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESETS_COLONNES.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setColonnesSelectionnees(preset.colonnes)}
                  className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10 hover:border-brand-orange hover:text-brand-orange"
                >
                  {preset.emoji} {preset.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setColonnesSelectionnees(COLONNES_DISPONIBLES.map((c) => c.id))}
                className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/30"
              >
                ✓ Tout cocher
              </button>
              <button
                type="button"
                onClick={() => setColonnesSelectionnees([])}
                className="btn btn-secondaire text-xs py-1.5 px-3 rounded-xl font-bold bg-brand-light-grey/15 dark:bg-white/5 border border-brand-light-grey/60 dark:border-white/10 hover:border-danger hover:text-danger"
              >
                Aucune
              </button>
            </div>
          </div>

          {/* 3. Choix des colonnes, groupées comme le catalogue */}
          <div className="space-y-3">
            {ORDRE_CATEGORIES.map((categorie) => {
              const colonnes = COLONNES_DISPONIBLES.filter((c) => c.categorie === categorie);
              if (colonnes.length === 0) return null;
              return (
                <div key={categorie} className="space-y-1.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-brand-warm-grey">
                    {TITRES_CATEGORIES[categorie]}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                    {colonnes.map((col) => {
                      const estCoche = colonnesSelectionnees.includes(col.id);
                      return (
                        <div
                          key={col.id}
                          onClick={() => toggleColonne(col.id)}
                          className={`p-3 rounded-xl border text-xs font-bold flex items-center gap-2.5 cursor-pointer transition-all ${
                            estCoche
                              ? "bg-brand-black text-white dark:bg-white dark:text-brand-black border-brand-black dark:border-white shadow-xs"
                              : "bg-brand-light-grey/15 dark:bg-white/3 border-brand-light-grey/60 dark:border-white/10 text-brand-warm-grey hover:border-brand-light-grey dark:hover:border-white/20"
                          }`}
                        >
                          <div className="shrink-0">
                            {estCoche ? (
                              <CheckSquare className="w-4 h-4 text-brand-orange" />
                            ) : (
                              <Square className="w-4 h-4 text-brand-warm-grey" />
                            )}
                          </div>
                          <span className="truncate">{col.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 4. Format du fichier */}
          <div className="space-y-2 pt-2 border-t border-brand-light-grey dark:border-white/10">
            <label className="text-xs font-black uppercase tracking-wider text-brand-black dark:text-white flex items-center gap-1.5">
              <FileSpreadsheet className="w-4 h-4 text-brand-orange" />
              3. Format du fichier de sortie
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                onClick={() => setFormatFichier("csv_excel")}
                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold flex items-center gap-2 transition-all ${
                  formatFichier === "csv_excel"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/3 text-brand-warm-grey hover:border-brand-light-grey dark:hover:border-white/20"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <div>CSV Excel (Point-virgule)</div>
                  <div className="text-[10px] font-medium opacity-70">Idéal Excel FR / DZ</div>
                </div>
              </div>

              <div
                onClick={() => setFormatFichier("xlsx")}
                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold flex items-center gap-2 transition-all ${
                  formatFichier === "xlsx"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/3 text-brand-warm-grey hover:border-brand-light-grey dark:hover:border-white/20"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <div>
                  <div>Classeur Excel (.xlsx)</div>
                  <div className="text-[10px] font-medium opacity-70">
                    Largeurs, filtres et montants en DA
                  </div>
                </div>
              </div>

              <div
                onClick={() => setFormatFichier("csv_standard")}
                className={`p-3 rounded-xl border cursor-pointer text-xs font-bold flex items-center gap-2 transition-all ${
                  formatFichier === "csv_standard"
                    ? "border-brand-orange bg-brand-orange/10 text-brand-orange"
                    : "border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/15 dark:bg-white/3 text-brand-warm-grey hover:border-brand-light-grey dark:hover:border-white/20"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <div>
                  <div>CSV Standard (Virgule)</div>
                  <div className="text-[10px] font-medium opacity-70">Compatibilité ERP/US</div>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Pied : actions */}
        <div className="flex justify-between items-center px-6 py-4 border-t border-brand-light-grey/40 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/3">
          <button
            type="button"
            onClick={onFermer}
            className="btn btn-secondaire text-xs font-bold"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={lancerExport}
            disabled={telechargementEnCours || colonnesSelectionnees.length === 0}
            className="btn btn-primaire text-xs font-black shadow-md shadow-brand-orange/20 flex items-center gap-2"
          >
            {telechargementEnCours ? (
              <span>Génération du fichier...</span>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Télécharger l'Export ({colonnesSelectionnees.length} colonnes)
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
