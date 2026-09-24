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
  COLONNE_FILTRE_VITRINE,
  COLONNES_DISPONIBLES,
  MAX_IDS_SELECTION,
  PARAM_COMPTE,
  PARAM_EXEMPLAIRES,
  PARAM_FORMAT_FICHIER,
  PARAM_IDS,
  PARAM_SCOPE,
  PARAM_VITRINE,
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

/**
 * Les périmètres dont la modale annonce le nombre de lignes.
 *
 * Tous : chacun est un `where` que le serveur sait compter, et chacun peut
 * mentir à sa façon si on se contente du nombre de cases cochées ou d'une
 * description figée. L'ordre suit celui de l'écran.
 */
const SCOPES_COMPTABLES: ScopeExport[] = ["filtres", "stock", "selection"];

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

  /**
   * « Et les exemplaires des modèles exposés aussi ».
   *
   * Le choix est conservé même quand le filtre vitrine n'est pas actif : la case
   * « Exposé en Vitrine » peut être décochée puis recochée, et l'utilisateur ne
   * doit pas avoir à refaire son choix. `modeExemplaires` est le SEUL
   * interrupteur lu par le reste de la modale, donc un état conservé mais
   * inactif ne peut rien changer ni à l'écran ni à la requête.
   */
  const [exemplairesAussi, setExemplairesAussi] = useState(false);
  const [telechargementEnCours, setTelechargementEnCours] = useState(false);

  const nbSelection = selection.length;

  /**
   * Les ids cochés en une CHAÎNE stable.
   *
   * `selection` est un tableau : le mettre en dépendance d'un `useCallback` ou
   * d'un `useEffect` relancerait le comptage à chaque rendu, y compris quand
   * rien n'a changé — la chaîne, elle, ne change que si les cases changent.
   */
  const idsSelection = selection.join(",");

  /**
   * La sélection peut changer pendant que la modale est ouverte (une action
   * groupée la consomme, ou l'utilisateur coche plus de lignes). Rester sur
   * « sélection » enverrait alors une requête vide ou trop longue, que la route
   * refuse — autant revenir d'office sur les filtres.
   */
  const selectionHorsLimite = nbSelection === 0 || nbSelection > MAX_IDS_SELECTION;

  /**
   * La case « Exposé en Vitrine » ne choisit pas qu'une colonne : elle restreint
   * aussi l'export aux produits réellement exposés (voir
   * `COLONNE_FILTRE_VITRINE`). Sans elle, la carte « Filtres actuels uniquement »
   * annonçait 1616 articles — tout le stock non vendu — pour une vitrine qui en
   * compte 181. La règle vaut pour tous les périmètres (voir
   * `construireFiltresExport`), et la modale l'affiche pour ne pas surprendre.
   */
  const filtreVitrine = colonnesSelectionnees.includes(COLONNE_FILTRE_VITRINE);

  /**
   * Le choix « exemplaires » n'a de sens qu'avec le filtre vitrine : sans lui,
   * aucun modèle n'est exposé et il n'y a pas d'exemplaires à ajouter. La route
   * applique la même règle de son côté, donc les deux ne peuvent pas diverger.
   */
  const modeExemplaires = filtreVitrine && exemplairesAussi;

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
   * Les paramètres que reçoivent le COMPTAGE et le TÉLÉCHARGEMENT.
   *
   * Une seule source pour les deux : le nombre affiché et le fichier ne peuvent
   * donc pas diverger — c'est exactement le défaut réparé ici (une carte
   * annonçant 1616 articles pour un fichier qui en contenait 181).
   *
   * Le filtre « Exposé en vitrine » est reposé EXPLICITEMENT : `stock` et
   * `sélection` écartent volontairement les filtres de l'écran, si bien qu'il ne
   * peut pas compter sur eux pour voyager jusqu'au serveur.
   */
  const parametresAvecFiltres = useCallback(
    (scope: ScopeExport, exemplaires: boolean): URLSearchParams => {
      const params = parametresDePerimetre(scope);
      if (scope === "selection") params.set(PARAM_IDS, idsSelection);
      if (filtreVitrine) {
        params.set(PARAM_VITRINE, "1");
        // Le COMPTAGE et le TÉLÉCHARGEMENT bâtissent leurs paramètres ici, tous
        // les deux : le nombre annoncé ne peut pas décrire un autre fichier que
        // celui qui sera écrit.
        if (exemplaires) params.set(PARAM_EXEMPLAIRES, "1");
      }
      return params;
    },
    [parametresDePerimetre, idsSelection, filtreVitrine]
  );

  /**
   * Combien de lignes CHAQUE périmètre contiendrait.
   *
   * La carte lisait auparavant le total de `donnees` — la dernière liste chargée
   * par l'écran. Ce n'est pas le périmètre de l'export, et cette liste n'est même
   * pas chargée dans les vues famille et catégorie, où elle reste donc figée sur
   * la vue précédente. Mesuré sur
   * `?vue=famille&famille_id=16&en_vitrine=1` : la carte annonçait 1616
   * articles, le fichier en aurait contenu 57. Seul le serveur construit le
   * `where` du fichier : c'est donc lui qui répond.
   *
   * Les trois périmètres sont comptés, pas seulement « filtres » : la sélection
   * peut perdre des lignes (le filtre vitrine, mais aussi une ligne supprimée
   * ailleurs), et « Tout le stock » ne dit plus rien de vrai dès que la case
   * « Exposé en Vitrine » est cochée. `null` = le calcul est en cours ; une clé
   * absente = le serveur n'a pas répondu, la carte le dira.
   */
  const [comptes, setComptes] = useState<Partial<Record<ScopeExport, number>> | null>(null);

  /**
   * Les mêmes périmètres, comptés avec TOUS les exemplaires des modèles exposés.
   *
   * La modale doit pouvoir montrer les deux nombres EN MÊME TEMPS : sinon
   * l'utilisateur choisit à l'aveugle, ne découvre le vrai chiffre qu'après
   * avoir coché, et « 181 » face à « 325 » devient une devinette. D'où ce second
   * comptage, demandé seulement quand le filtre vitrine est actif.
   */
  const [comptesExemplaires, setComptesExemplaires] = useState<
    Partial<Record<ScopeExport, number>> | null
  >(null);

  useEffect(() => {
    if (!ouverte) return;
    const controleur = new AbortController();
    // Revenir au calcul en cours plutôt que de garder les chiffres précédents :
    // entre deux filtres, un ancien total est un mensonge, pas une
    // approximation.
    setComptes(null);
    setComptesExemplaires(null);

    const compter = async (params: URLSearchParams): Promise<number | null> => {
      const res = await fetch(`/api/produits/export?${params.toString()}`, {
        cache: "no-store",
        signal: controleur.signal,
      });
      if (!res.ok) return null;
      const corps = (await res.json()) as { total?: unknown };
      return typeof corps.total === "number" ? corps.total : null;
    };

    void (async () => {
      try {
        const resultats = await Promise.all(
          SCOPES_COMPTABLES.map(async (scope) => {
            if (scope === "selection" && selectionHorsLimite) return null;

            // Les deux lectures ne diffèrent que par `exemplaires` : les
            // paramètres du périmètre sont bâtis par la même fonction, donc le
            // chiffre affiché et le fichier téléchargé ne peuvent pas décrire
            // deux ensembles différents.
            const communs = (exemplaires: boolean) => {
              const params = parametresAvecFiltres(scope, exemplaires);
              params.set(PARAM_SCOPE, scope);
              params.set(PARAM_COMPTE, "1");
              return params;
            };

            const base = await compter(communs(false));
            const etendu = filtreVitrine ? await compter(communs(true)) : null;
            return [scope, base, etendu] as const;
          })
        );

        const connus: Partial<Record<ScopeExport, number>> = {};
        const connusEtendus: Partial<Record<ScopeExport, number>> = {};
        for (const resultat of resultats) {
          if (!resultat) continue;
          const [scope, base, etendu] = resultat;
          if (typeof base === "number") connus[scope] = base;
          if (typeof etendu === "number") connusEtendus[scope] = etendu;
        }
        setComptes(connus);
        setComptesExemplaires(connusEtendus);
      } catch {
        // Silence volontaire : on reste sur « Calcul en cours… ». Un comptage
        // qui échoue ne doit pas se transformer en un chiffre inventé.
      }
    })();

    return () => controleur.abort();
  }, [ouverte, parametresAvecFiltres, selectionHorsLimite, filtreVitrine]);

  /**
   * L'état du comptage d'un périmètre, en trois états distincts.
   *
   * « indisponible » n'est pas « en cours » : afficher « Calcul en cours… »
   * indéfiniment pour un comptage qui a échoué ferait attendre l'utilisateur
   * pour rien.
   */
  const etatCompte = (
    scope: ScopeExport,
    exemplaires: boolean
  ): { etat: "attente" } | { etat: "indisponible" } | { etat: "connu"; total: number } => {
    const source = exemplaires ? comptesExemplaires : comptes;
    if (source === null) return { etat: "attente" };
    const total = source[scope];
    return typeof total === "number" ? { etat: "connu", total } : { etat: "indisponible" };
  };

  /** L'état du comptage tel que le périmètre CHOISI le lit. */
  const compteDe = (scope: ScopeExport) => etatCompte(scope, modeExemplaires);

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
  // groupée la consomme, ou l'utilisateur coche plus de lignes) : `selectionHorsLimite`
  // est déclaré plus haut, avec le comptage qui en dépend. Rester sur
  // « sélection » enverrait alors une requête vide ou trop longue, que la route
  // refuse — autant revenir d'office sur les filtres.
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
    // Les filtres de l'écran, transmis tels quels, plus le filtre vitrine porté
    // par la case « Exposé en Vitrine » : ce que la liste honore, le fichier
    // l'honore — les deux lisent le même constructeur côté serveur. Et le
    // comptage lit la même source (`parametresAvecFiltres`), donc il ne peut pas
    // annoncer autre chose que ce que le fichier contiendra.
    const params = parametresAvecFiltres(scopeExport, modeExemplaires);

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

  /** « 1 ligne », « 181 articles » : le pluriel ne se décide pas à la main. */
  const mot = (n: number, nom: "article" | "ligne") => `${n} ${nom}${n > 1 ? "s" : ""}`;

  /**
   * La phrase de comptage d'un périmètre, en trois états.
   *
   * « indisponible » n'est pas « en cours » : laisser « Calcul en cours… »
   * indéfiniment sur un comptage qui a échoué ferait attendre pour rien.
   */
  const phraseComptage = (
    scope: ScopeExport,
    exemplaires: boolean,
    nom: "article" | "ligne",
    suite = ""
  ): string => {
    const compte = etatCompte(scope, exemplaires);
    if (compte.etat === "attente") return "Calcul en cours…";
    if (compte.etat === "indisponible") return "Comptage indisponible";
    const nombre = mot(compte.total, nom);
    return suite ? `${nombre} ${suite}` : nombre;
  };

  /** La phrase du périmètre, dans la lecture que l'utilisateur a choisie. */
  const phraseCompte = (scope: ScopeExport, nom: "article" | "ligne", suite = ""): string =>
    phraseComptage(scope, modeExemplaires, nom, suite);

  /**
   * Ce que la carte « sélection » peut annoncer.
   *
   * Le nombre de lignes du fichier vient du même comptage serveur que les autres
   * périmètres : lui seul sait combien des cases cochées passent le filtre
   * « Exposé en vitrine ». Annoncer les cases cochées quand une partie est
   * écartée serait le même mensonge qu'annoncer 1616 pour une vitrine de 181,
   * en plus discret.
   */
  const detailSelection = (() => {
    if (nbSelection === 0) return "Aucune ligne cochée dans l'inventaire";
    if (nbSelection > MAX_IDS_SELECTION) {
      return `${nbSelection} lignes : au-delà du plafond de ${MAX_IDS_SELECTION}. Filtrez plutôt l'inventaire.`;
    }
    const compte = compteDe("selection");
    if (compte.etat === "attente") return `${mot(nbSelection, "ligne")} cochée${nbSelection > 1 ? "s" : ""} — comptage…`;
    if (compte.etat === "indisponible") {
      return `${mot(nbSelection, "ligne")} cochée${nbSelection > 1 ? "s" : ""} — comptage indisponible`;
    }
    if (compte.total === nbSelection) return `${mot(nbSelection, "ligne")} cochée${nbSelection > 1 ? "s" : ""}`;
    if (compte.total < nbSelection) {
      return `${mot(compte.total, "ligne")} sur ${nbSelection} cochée${nbSelection > 1 ? "s" : ""} : le reste est écarté par le filtre`;
    }
    // Le compte peut aussi DÉPASSER les cases cochées : avec « tous les
    // exemplaires », les unités des modèles cochés s'ajoutent à la sélection.
    // « X sur N cochées » se lirait alors comme un sous-ensemble, ce qu'il n'est
    // plus.
    return `${mot(compte.total, "ligne")} : les exemplaires des modèles cochés, en plus des ${nbSelection} cochée${nbSelection > 1 ? "s" : ""}`;
  })();

  const perimetres: { id: ScopeExport; titre: string; detail: string; desactive: boolean }[] = [
    {
      id: "filtres",
      titre: "Filtres actuels uniquement",
      // Le nombre est celui du périmètre, mesuré par le serveur avec le `where`
      // du fichier — jamais celui de la liste affichée, qui peut être plus
      // vieille, paginée, ou pas chargée du tout. Il inclut le filtre « Exposé
      // en vitrine » quand la case est cochée : c'est ce que le fichier contient.
      detail: phraseCompte("filtres", "article", "à exporter"),
      desactive: false,
    },
    {
      id: "stock",
      titre: "Tout le stock",
      detail: `${phraseCompte("stock", "article", "à exporter")} — ${
        filtreVitrine
          ? modeExemplaires
            ? "les exemplaires des modèles exposés"
            : "le stock exposé en vitrine"
          : "tout le stock"
      }, vendus, HS et assemblés exclus`,
      desactive: false,
    },
    {
      id: "selection",
      titre: "La sélection cochée",
      detail: detailSelection,
      desactive: selectionHorsLimite,
    },
  ];

  /** Le périmètre actif, nommé là où ses deux comptages sont proposés. */
  const titrePerimetre = perimetres.find((p) => p.id === scopeExport)?.titre ?? "";

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
                Cette option ignore volontairement vos filtres d'écran : le fichier contient
                tout le stock. Elle conserve en revanche le tri de l'écran
                {filtreVitrine ? ", et le filtre « Exposé en vitrine » coché plus bas" : ""}.
              </p>
            )}

            {filtreVitrine && (
              <div className="space-y-2 pt-1">
                <p className="flex items-start gap-1.5 text-[11px] text-brand-warm-grey font-medium">
                  <Filter className="w-3.5 h-3.5 shrink-0 mt-0.5 text-brand-orange" />
                  Filtre « Exposé en vitrine » actif : la case cochée dans les colonnes ci-dessous
                  restreint le fichier aux produits exposés, sur <b>tous</b> les périmètres. Décochez-la
                  pour exporter les produits non exposés.
                </p>

                {/* Le choix, avec ses deux nombres. La vitrine expose un MODÈLE,
                    pas chaque unité : les exemplaires identiques encore en stock
                    mais non cochés « en vitrine » n'apparaissaient donc dans
                    aucun export. Les deux comptes viennent du serveur, qui bâtit
                    le `where` du fichier — le nombre lu ici est celui du fichier
                    qu'on téléchargera, sur le périmètre choisi. */}
                <div className="rounded-2xl border border-brand-light-grey/60 dark:border-white/10 bg-brand-light-grey/10 dark:bg-white/3 p-3 space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-brand-warm-grey">
                    Exemplaires inclus — {titrePerimetre}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setExemplairesAussi(false)}
                      aria-pressed={!modeExemplaires}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        !modeExemplaires
                          ? "border-brand-orange bg-brand-orange/10"
                          : "border-brand-light-grey/60 dark:border-white/10 bg-white/40 dark:bg-white/3 hover:border-brand-light-grey dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-brand-black dark:text-white">
                            Unités exposées seulement
                          </div>
                          <div className="text-[11px] text-brand-warm-grey mt-0.5">
                            {phraseComptage(scopeExport, false, "article")}
                          </div>
                        </div>
                        {!modeExemplaires && <Check className="w-4 h-4 text-brand-orange shrink-0" />}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setExemplairesAussi(true)}
                      aria-pressed={modeExemplaires}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        modeExemplaires
                          ? "border-brand-orange bg-brand-orange/10"
                          : "border-brand-light-grey/60 dark:border-white/10 bg-white/40 dark:bg-white/3 hover:border-brand-light-grey dark:hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-xs font-bold text-brand-black dark:text-white">
                            Tous les exemplaires des modèles exposés
                          </div>
                          <div className="text-[11px] text-brand-warm-grey mt-0.5">
                            {phraseComptage(scopeExport, true, "article")}
                          </div>
                        </div>
                        {modeExemplaires && <Check className="w-4 h-4 text-brand-orange shrink-0" />}
                      </div>
                    </button>
                  </div>

                  <p className="text-[11px] font-medium text-brand-warm-grey leading-snug">
                    La vitrine expose un modèle entier, pas une unité : les exemplaires identiques
                    encore en stock mais non cochés « en vitrine » ne figurent que dans la seconde
                    option. Les vendus sont exclus dans les deux cas ; le hors-service et les
                    assemblés restent soumis au masquage habituel de l'export.
                  </p>
                </div>
              </div>
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
                          {col.id === COLONNE_FILTRE_VITRINE && (
                            <span
                              title="Cette case ne fait pas que remplir une colonne : elle restreint l'export aux produits exposés en vitrine."
                              className="ml-auto shrink-0 rounded-md bg-brand-orange/15 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-brand-orange"
                            >
                              filtre
                            </span>
                          )}
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
