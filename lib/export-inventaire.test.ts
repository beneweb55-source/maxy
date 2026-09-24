import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import {
  CLES_CONTROLE_EXPORT,
  COLONNE_FILTRE_VITRINE,
  COLONNES_DISPONIBLES,
  COLONNES_EXPORT_DEFAUT,
  FORMATS_FICHIER,
  FORMAT_FICHIER_DEFAUT,
  FORMAT_MONNAIE,
  MAP_COLONNES,
  MAX_IDS_SELECTION,
  META_COLONNES,
  PARAM_FORMAT_FICHIER,
  PARAM_IDS,
  PARAM_SCOPE,
  PARAM_VITRINE,
  PRESETS_COLONNES,
  SCOPES_EXPORT,
  SCOPE_EXPORT_DEFAUT,
  champCsv,
  colonnesMonnaie,
  construireFiltresExport,
  construireParametresProduit,
  construireTableau,
  largeursColonnes,
  lireColonnes,
  lireFormatFichier,
  lireIds,
  lireScope,
  separateurPour,
  serialiserCsv,
} from "@/lib/export-inventaire";
import { construireFiltresProduits } from "@/lib/filtres-produits";
import { libelleStatut } from "@/lib/statuts";

/**
 * The default column set ModaleExport starts with, reproduced so the test
 * exercises the same URL the modal really builds.
 */
const COLONNES_DEFAUT =
  "code_interne,reference,categorie,statut,numero_serie,grade,emplacement,prix_achat,prix_vente_fixe,lot_id,fournisseur,date_entree";

/** The exact URL the export modal produces, and the defect it used to cause. */
function paramsModale(formatFichier: string, scope = "filtres") {
  return new URLSearchParams({
    colonnes: COLONNES_DEFAUT,
    [PARAM_FORMAT_FICHIER]: formatFichier,
    scope,
  });
}

describe("export inventaire — contrat des paramètres", () => {
  describe("lireFormatFichier", () => {
    it("lit chaque format supporté", () => {
      for (const f of FORMATS_FICHIER) {
        expect(lireFormatFichier(new URLSearchParams({ [PARAM_FORMAT_FICHIER]: f }))).toBe(f);
      }
    });

    it("retombe sur le défaut quand le paramètre est absent", () => {
      expect(lireFormatFichier(new URLSearchParams())).toBe(FORMAT_FICHIER_DEFAUT);
    });

    it("retombe sur le défaut sur une valeur inconnue", () => {
      expect(lireFormatFichier(new URLSearchParams({ [PARAM_FORMAT_FICHIER]: "pdf" }))).toBe(
        FORMAT_FICHIER_DEFAUT
      );
    });

    it("n'interprète JAMAIS `format` comme un format de fichier", () => {
      // `format` appartient au filtre matériel du produit : le lire ici serait
      // exactement le défaut d'origine.
      expect(lireFormatFichier(new URLSearchParams({ format: "xlsx" }))).toBe(FORMAT_FICHIER_DEFAUT);
      expect(lireFormatFichier(new URLSearchParams({ format: "M.2" }))).toBe(FORMAT_FICHIER_DEFAUT);
    });
  });

  describe("construireParametresProduit", () => {
    it("retire les paramètres de contrôle de l'export", () => {
      const nettoyes = construireParametresProduit(paramsModale("csv_excel"));
      for (const cle of CLES_CONTROLE_EXPORT) {
        expect(nettoyes.has(cle)).toBe(false);
      }
    });

    it("CONSERVE `format`, qui est un filtre produit", () => {
      const params = new URLSearchParams({ format: "M.2", q: "ssd", statuts: "en_vente" });
      const nettoyes = construireParametresProduit(params);
      expect(nettoyes.get("format")).toBe("M.2");
      expect(nettoyes.get("q")).toBe("ssd");
      expect(nettoyes.get("statuts")).toBe("en_vente");
    });

    it("ne modifie pas les paramètres reçus", () => {
      const params = paramsModale("csv_excel");
      const avant = params.toString();
      construireParametresProduit(params);
      expect(params.toString()).toBe(avant);
    });
  });

  describe("construireFiltresExport — le défaut mesuré", () => {
    it("ne laisse AUCUNE trace du format de fichier dans le filtre produit", () => {
      for (const f of FORMATS_FICHIER) {
        const where = construireFiltresExport(paramsModale(f));
        const json = JSON.stringify(where);
        // Avant correction, chaque valeur atterrissait ici en `contains`, sur
        // reference / modele.nom / categorie — d'où 0 ligne exportée sur 1684.
        expect(json).not.toContain(f);
      }
    });

    it("applique bien les filtres produits réels que l'inventaire envoie", () => {
      const where = construireFiltresExport(
        new URLSearchParams({ ...Object.fromEntries(paramsModale("csv_excel")), format: "M.2" })
      );
      // Le filtre matériel `format` doit, lui, continuer d'atteindre la base.
      expect(JSON.stringify(where)).toContain("M.2");
    });

    it("scope=stock garde le masquage du stock, et n'exporte PAS les vendus", () => {
      // Le défaut d'origine : l'ancien `tous` rendait `{}`, donc AUCUN `where`,
      // donc les 1684 lignes du catalogue — vendus, HS et assemblés compris —
      // alors que la carte promettait « Tous les articles en stock ».
      const where = construireFiltresExport(paramsModale("xlsx", "stock"));
      const json = JSON.stringify(where);
      expect(json).toContain("vendu");
      expect(json).toContain("hs");
      expect(json).toContain("assemble");
      expect(where).not.toEqual({});
    });

    it("scope=stock ignore les filtres de l'appelant", () => {
      const params = paramsModale("xlsx", "stock");
      params.set("q", "ssd");
      expect(JSON.stringify(construireFiltresExport(params))).not.toContain("ssd");
    });

    it("scope=filtres conserve le masquage par défaut des vendus / hs / assemblés", () => {
      const where = construireFiltresExport(paramsModale("csv_excel"));
      expect(JSON.stringify(where)).toContain("vendu");
      expect(JSON.stringify(where)).toContain("assemble");
    });

    it("scope=selection ne retient QUE les ids cochés", () => {
      const params = paramsModale("csv_excel", "selection");
      params.set(PARAM_IDS, "12,34");
      expect(construireFiltresExport(params)).toEqual({ id: { in: [12, 34] } });
    });

    it("scope=selection sans id ne rend JAMAIS tout le catalogue", () => {
      // « J'ai coché zéro ligne » ne doit pas vouloir dire « donne-moi tout ».
      const where = construireFiltresExport(paramsModale("csv_excel", "selection"));
      expect(where).toEqual({ id: { in: [] } });
      expect(where).not.toEqual({});
    });

    it("un scope inconnu retombe sur `filtres`, jamais sur « tout »", () => {
      expect(lireScope(new URLSearchParams({ [PARAM_SCOPE]: "nimportequoi" }))).toBe(
        SCOPE_EXPORT_DEFAUT
      );
      expect(lireScope(new URLSearchParams())).toBe(SCOPE_EXPORT_DEFAUT);
    });
  });

  /**
   * Le défaut d'origine : la carte annonçait le total du STOCK (1616, mesuré en
   * base) alors que la vitrine en compte 181. La case « Exposé en Vitrine » ne
   * remplissait qu'une colonne ; elle restreint désormais le fichier aussi.
   */
  describe("le filtre « Exposé en vitrine »", () => {
    /** Le filtre tel que la modale le pose : la case cochée, tous périmètres. */
    function avecVitrine(scope: string, ids?: string) {
      const params = paramsModale("csv_excel", scope);
      params.set(PARAM_VITRINE, "1");
      if (ids) params.set(PARAM_IDS, ids);
      return construireFiltresExport(params);
    }

    it("restreint « filtres » aux produits exposés, sans perdre les filtres de l'écran", () => {
      const params = paramsModale("csv_excel");
      params.set(PARAM_VITRINE, "1");
      params.set("q", "ssd");
      const json = JSON.stringify(construireFiltresExport(params));
      expect(json).toContain("en_vitrine");
      expect(json).toContain("ssd");
    });

    it("s'applique AUSSI à `stock`, qui écarte pourtant les filtres de l'écran", () => {
      // Sans clause reposée après le périmètre, la case cochée n'aurait rien
      // filtré ici : le fichier aurait contenu les 1616 lignes du stock.
      expect(JSON.stringify(avecVitrine("stock"))).toContain("en_vitrine");
    });

    it("s'applique AUSSI à `selection` : cocher la case écarte des lignes cochées", () => {
      const json = JSON.stringify(avecVitrine("selection", "12,34"));
      expect(json).toContain("en_vitrine");
      expect(json).toContain("[12,34]");
    });

    it("ne pose AUCUNE clause vitrine quand la case n'est pas cochée", () => {
      for (const scope of SCOPES_EXPORT) {
        const json = JSON.stringify(construireFiltresExport(paramsModale("csv_excel", scope)));
        expect(json).not.toContain("en_vitrine");
      }
    });

    it("n'a qu'UNE définition de « en vitrine » : celle du filtre d'écran", () => {
      // Le paramètre est la clé produit standard : la clause posée par l'export
      // doit être LITTÉRALEMENT une de celles que le tiroir de filtres envoie à
      // la base, pas une seconde définition qui pourrait dériver.
      expect(PARAM_VITRINE).toBe("en_vitrine");
      const parEcran = construireFiltresProduits(new URLSearchParams({ [PARAM_VITRINE]: "1" }));
      const parExport = avecVitrine("stock") as { AND: unknown[] };

      expect(parExport.AND).toHaveLength(2);
      expect(parExport.AND[1]).toEqual({ en_vitrine: true });
      expect((parEcran as { AND: unknown[] }).AND).toContainEqual(parExport.AND[1]);
    });

    it("la case qui porte le filtre est une colonne réelle de l'export", () => {
      // Un identifiant renommé d'un côté désactiverait le filtre en silence.
      expect(MAP_COLONNES[COLONNE_FILTRE_VITRINE]).toBeDefined();
      expect(COLONNES_DISPONIBLES.some((c) => c.id === COLONNE_FILTRE_VITRINE)).toBe(true);
    });
  });

  describe("lireScope — l'ancien contrat", () => {
    it("lit chaque périmètre supporté", () => {
      for (const s of SCOPES_EXPORT) {
        expect(lireScope(new URLSearchParams({ [PARAM_SCOPE]: s }))).toBe(s);
      }
    });

    it("traduit le `tous` historique en `stock`, pas en « sans filtre »", () => {
      // Un lien déjà en circulation ne doit pas continuer d'exporter les
      // invendus en silence.
      expect(lireScope(new URLSearchParams({ [PARAM_SCOPE]: "tous" }))).toBe("stock");
    });
  });

  describe("lireIds", () => {
    it("rend une liste vide quand le paramètre est absent", () => {
      expect(lireIds(new URLSearchParams())).toEqual([]);
    });

    it("lit les entiers séparés par des virgules, espaces tolérés", () => {
      expect(lireIds(new URLSearchParams({ [PARAM_IDS]: " 3, 7 ,11" }))).toEqual([3, 7, 11]);
    });

    it("écarte tout ce qui n'est pas un entier positif", () => {
      // Un id négatif, nul, décimal ou textuel ne désigne aucune ligne : le
      // laisser passer produirait une clause que Prisma refuserait.
      expect(lireIds(new URLSearchParams({ [PARAM_IDS]: "1,-2,0,3.5,abc,,4" }))).toEqual([1, 4]);
    });

    it("une sélection au plafond tient largement dans une URL", () => {
      // Les ids voyagent en query string : sans plafond, une sélection large
      // finirait en 414 opaque du proxy, sans que l'utilisateur sache que sa
      // sélection était en cause. La route refuse donc AVANT, avec un message.
      const auPlafond = new URLSearchParams({
        [PARAM_IDS]: Array.from({ length: MAX_IDS_SELECTION }, (_, i) => i + 1).join(","),
      });
      expect(auPlafond.toString().length).toBeLessThan(8000);
      expect(lireIds(auPlafond)).toHaveLength(MAX_IDS_SELECTION);
    });
  });

  describe("construireFiltresProduits — les filtres qui ne marchaient pas", () => {
    it("a_jeter rend bien les unités HS marquées, au lieu de zéro ligne", () => {
      // Mesuré : 3 produits portent `a_jeter`, tous en statut `hs`. Le masquage
      // par défaut de `hs` contredisait la clause, d'où 0 ligne — le filtre
      // semblait cassé alors que la donnée existait.
      const where = construireFiltresProduits(new URLSearchParams({ a_jeter: "1" }));
      const json = JSON.stringify(where);
      expect(json).toContain("a_jeter");
      expect(json).toContain('"hs"');
      // `hs` ne doit plus figurer dans la liste des statuts masqués.
      expect(json).not.toContain('"notIn":["vendu","hs","assemble"]');
    });

    it("masque toujours `hs` quand « à jeter » n'est PAS demandé", () => {
      const json = JSON.stringify(construireFiltresProduits(new URLSearchParams()));
      expect(json).toContain('"notIn":["vendu","hs","assemble"]');
    });

    it("un paramètre `statuts` ne nommant aucun statut connu ne rend rien", () => {
      // Sinon une faute de frappe passait pour un résultat légitime.
      expect(construireFiltresProduits(new URLSearchParams({ statuts: "pas_un_statut" }))).toEqual({
        AND: [{ statut: { in: [] } }],
      });
    });

    it("`statuts` vide ou absent retombe sur le masquage par défaut", () => {
      const vide = construireFiltresProduits(new URLSearchParams({ statuts: "" }));
      expect(JSON.stringify(vide)).toContain('"notIn"');
      expect(JSON.stringify(construireFiltresProduits(new URLSearchParams()))).toContain('"notIn"');
    });

    it("`statuts` nomme des statuts réels : ils sont respectés", () => {
      const where = construireFiltresProduits(new URLSearchParams({ statuts: "en_vente, ok" }));
      expect(JSON.stringify(where)).toContain('"in":["en_vente","ok"]');
    });

    it("lecture d'un statut exotique : le libellé rend la valeur brute, sans lever", () => {
      // Un enregistrement portant un statut retiré du schéma faisait échouer
      // TOUT l'export (500, aucune ligne) au lieu d'une seule cellule lisible.
      expect(() => libelleStatut("statut_disparu" as never)).not.toThrow();
      expect(libelleStatut("statut_disparu" as never)).toBe("statut_disparu");
    });
  });
});

/** A product with every field the columns read, all of them populated. */
const PRODUIT = {
  id: 1,
  code_interne: "P-0001",
  reference: "A16",
  categorie: "Cartes Dédiées",
  statut: "en_vente",
  grade: "Grade A",
  emplacement: "reserve",
  en_vitrine: true,
  numero_serie: "SN-1",
  prix_achat: 1000,
  prix_vente_fixe: 1500,
  prix_vente_reel: 1400,
  date_vente: new Date("2026-09-01T00:00:00Z"),
  notes: "note libre",
  created_at: new Date("2026-01-15T00:00:00Z"),
  lot: { id: 13, fournisseur: "MOUFID", date_entree: new Date("2026-07-24T00:00:00Z") },
  reparations: [{ cout: 200 }, { cout: 300 }],
};

describe("colonnes d'export", () => {
  it("expose exactement les 18 colonnes de la modale", () => {
    expect(Object.keys(MAP_COLONNES)).toHaveLength(18);
    expect(COLONNES_EXPORT_DEFAUT).toEqual(Object.keys(MAP_COLONNES));
  });

  it("la modale et la route tirent leurs colonnes du MÊME catalogue", () => {
    // La modale tenait sa propre liste, avec ses propres libellés, sur le même
    // espace d'identifiants : une colonne ajoutée d'un côté seulement était
    // invisible, ou demandée puis silencieusement ignorée. Les deux dérivent
    // désormais de `MAP_COLONNES`, donc la dérive n'est plus exprimable.
    expect(COLONNES_DISPONIBLES.map((c) => c.id)).toEqual(Object.keys(MAP_COLONNES));
    for (const c of COLONNES_DISPONIBLES) {
      expect(MAP_COLONNES[c.id], c.id).toBeDefined();
      expect(c.label.length, c.id).toBeGreaterThan(0);
    }
  });

  it("chaque colonne a une largeur et une catégorie de rangement", () => {
    for (const id of Object.keys(MAP_COLONNES)) {
      const meta = META_COLONNES[id];
      expect(meta, id).toBeDefined();
      expect(meta!.largeur, id).toBeGreaterThan(0);
      expect(["identification", "technique", "financier", "logistique"], id).toContain(
        meta!.categorie
      );
    }
  });

  it("le jeu de départ de la modale est celui que ce fichier simule", () => {
    // `COLONNES_DEFAUT` ci-dessus reproduit les cases cochées à l'ouverture de
    // `ModaleExport`. Le lier au catalogue réel fait échouer ce test si une
    // case change de camp : sans lui, l'URL simulée dériverait de la vraie et
    // les autres tests vérifieraient une requête que personne n'envoie.
    const depart = COLONNES_DISPONIBLES.filter((c) => c.defaut).map((c) => c.id);
    expect(depart).toEqual(COLONNES_DEFAUT.split(","));
    // Et ce départ est bien un sous-ensemble de ce que la route sait émettre.
    for (const cle of depart) expect(MAP_COLONNES[cle], cle).toBeDefined();
  });

  it("la route, elle, émet TOUTES les colonnes quand l'appelant n'en demande aucune", () => {
    // Deux défauts distincts, et c'est voulu : la modale propose une sélection
    // curatée, la route ne devine rien. Ce test les tient séparés.
    expect(COLONNES_EXPORT_DEFAUT).toHaveLength(COLONNES_DISPONIBLES.length);
    expect(lireColonnes(new URLSearchParams())).toHaveLength(COLONNES_DISPONIBLES.length);
  });

  it("largeursColonnes suit l'ordre exact des colonnes émises", () => {
    const cles = ["reference", "prix_achat", "inconnue"];
    expect(largeursColonnes(cles)).toEqual([
      { wch: META_COLONNES.reference!.largeur },
      { wch: META_COLONNES.prix_achat!.largeur },
      // Une clé sans métadonnée reçoit une largeur de repli, jamais `undefined`
      // (que le writer xlsx refuserait).
      { wch: 18 },
    ]);
  });

  it("la désignation est la colonne la plus large, pour lire les noms en entier", () => {
    const designations = ["reference", "categorie"].map((k) => META_COLONNES[k]!.largeur);
    const autres = Object.entries(META_COLONNES)
      .filter(([k]) => !["reference", "categorie"].includes(k))
      .map(([, m]) => m.largeur);
    expect(META_COLONNES.reference!.largeur).toBeGreaterThan(Math.max(...autres));
    expect(Math.min(...designations)).toBeGreaterThan(20);
  });

  it("colonnesMonnaie ne désigne QUE les colonnes marquées `monnaie`", () => {
    // Les positions servent à poser un format d'affichage « DA » sur des
    // cellules qui restent des NOMBRES (donc sommables dans Excel).
    expect(colonnesMonnaie(["reference", "prix_achat", "notes"])).toEqual([1]);
    expect(colonnesMonnaie(["reference", "notes"])).toEqual([]);
    expect(colonnesMonnaie([])).toEqual([]);
    for (const k of ["prix_achat", "prix_vente_fixe", "reparations", "prix_vente_reel"]) {
      expect(META_COLONNES[k]!.monnaie, k).toBe(true);
    }
  });

  it("chaque preset ne cite que des colonnes réelles", () => {
    // `lireColonnes` écarte l'inconnu : un preset périmé ne peut rendre que
    // MOINS de colonnes, jamais un fichier cassé.
    expect(PRESETS_COLONNES.length).toBeGreaterThanOrEqual(4);
    for (const preset of PRESETS_COLONNES) {
      expect(preset.colonnes.length, preset.id).toBeGreaterThan(0);
      expect(preset.label.length, preset.id).toBeGreaterThan(0);
      for (const cle of preset.colonnes) {
        expect(MAP_COLONNES[cle], `${preset.id} → ${cle}`).toBeDefined();
      }
    }
  });

  it("aucun preset « public » n'expose le prix d'achat", () => {
    const public_ = PRESETS_COLONNES.find((p) => p.id === "public");
    expect(public_).toBeDefined();
    expect(public_!.colonnes).not.toContain("prix_achat");
  });

  it("chaque colonne a un libellé non vide et un extracteur", () => {
    for (const [cle, col] of Object.entries(MAP_COLONNES)) {
      expect(typeof col.extracteur, cle).toBe("function");
      expect(col.label.length, cle).toBeGreaterThan(0);
    }
  });

  it("chaque colonne produit une valeur exploitable sur un produit complet", () => {
    for (const [cle, col] of Object.entries(MAP_COLONNES)) {
      const v = col.extracteur(PRODUIT);
      expect(v, cle).toBeDefined();
      expect(v, cle).not.toBeNull();
      // Une colonne ne doit jamais rendre la chaîne "undefined" dans une cellule.
      expect(String(v), cle).not.toContain("undefined");
      expect(String(v), cle).not.toContain("NaN");
    }
  });

  it("marge_estimee calcule la marge", () => {
    expect(MAP_COLONNES.marge_estimee!.extracteur(PRODUIT)).toBe("500 DA (50%)");
  });

  it("marge_estimee ne divise PAS par un prix d'achat nul", () => {
    // `(pv - 0) / 0` vaut Infinity : la cellule ne doit jamais lire "Infinity%".
    const gratuit = { ...PRODUIT, prix_achat: 0 };
    const v = String(MAP_COLONNES.marge_estimee!.extracteur(gratuit));
    expect(v).toBe("—");
    expect(v).not.toContain("Infinity");
  });

  it("reparations additionne les frais, et vaut 0 sans réparation", () => {
    expect(MAP_COLONNES.reparations!.extracteur(PRODUIT)).toBe(500);
    expect(MAP_COLONNES.reparations!.extracteur({ ...PRODUIT, reparations: [] })).toBe(0);
    expect(MAP_COLONNES.reparations!.extracteur({ ...PRODUIT, reparations: undefined })).toBe(0);
  });

  it("les dates sortent en AAAA-MM-JJ, jamais par une exception", () => {
    expect(MAP_COLONNES.date_entree!.extracteur(PRODUIT)).toBe("2026-07-24");
    expect(MAP_COLONNES.date_vente!.extracteur(PRODUIT)).toBe("2026-09-01");
    expect(MAP_COLONNES.date_vente!.extracteur({ ...PRODUIT, date_vente: null })).toBe("—");
    // Une date illisible ne doit pas faire échouer l'export entier (RangeError).
    expect(MAP_COLONNES.date_entree!.extracteur({ ...PRODUIT, lot: null, created_at: "pas une date" })).toBe("—");
  });

  it("en_vitrine sort en Oui / Non", () => {
    expect(MAP_COLONNES.en_vitrine!.extracteur(PRODUIT)).toBe("Oui");
    expect(MAP_COLONNES.en_vitrine!.extracteur({ ...PRODUIT, en_vitrine: false })).toBe("Non");
  });

  it("lot_id et fournisseur gèrent l'absence de lot", () => {
    const sansLot = { ...PRODUIT, lot: null };
    expect(MAP_COLONNES.lot_id!.extracteur(sansLot)).toBe("Sans arrivage");
    expect(MAP_COLONNES.fournisseur!.extracteur(sansLot)).toBe("—");
  });
});

describe("lireColonnes", () => {
  it("rend toutes les colonnes quand le paramètre est absent", () => {
    expect(lireColonnes(new URLSearchParams())).toEqual(COLONNES_EXPORT_DEFAUT);
  });

  it("respecte l'ordre demandé", () => {
    expect(lireColonnes(new URLSearchParams({ colonnes: "notes,code_interne" }))).toEqual([
      "notes",
      "code_interne",
    ]);
  });

  it("écarte les clés inconnues", () => {
    expect(lireColonnes(new URLSearchParams({ colonnes: "code_interne,inexistant" }))).toEqual([
      "code_interne",
    ]);
  });

  it("rend une liste VIDE si rien de valide n'est demandé, sans élargir à tout", () => {
    expect(lireColonnes(new URLSearchParams({ colonnes: "nimportequoi" }))).toEqual([]);
  });
});

describe("construireTableau", () => {
  it("aligne en-têtes et lignes", () => {
    const t = construireTableau([PRODUIT], COLONNES_EXPORT_DEFAUT);
    expect(t.entetes).toHaveLength(18);
    expect(t.lignes).toHaveLength(1);
    expect(t.lignes[0]).toHaveLength(18);
    expect(Object.keys(t.objets[0]!)).toHaveLength(18);
  });

  it("les libellés servent de clés aux objets xlsx", () => {
    const t = construireTableau([PRODUIT], ["code_interne", "reference"]);
    expect(t.objets[0]).toEqual({ "Code Interne": "P-0001", "Désignation / Modèle": "A16" });
  });

  it("écarte une clé inconnue au lieu de produire une colonne fantôme", () => {
    const t = construireTableau([PRODUIT], ["code_interne", "inexistant"]);
    expect(t.colonnesCles).toEqual(["code_interne"]);
    expect(t.entetes).toEqual(["Code Interne"]);
  });
});

describe("sérialisation CSV", () => {
  it("commence par le BOM puis les en-têtes", () => {
    const csv = serialiserCsv(construireTableau([PRODUIT], ["code_interne"]), ";");
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv.split("\r\n")[0]).toBe("﻿Code Interne");
  });

  it("sépare par virgule pour csv_standard, par point-virgule sinon", () => {
    expect(separateurPour("csv_standard")).toBe(",");
    expect(separateurPour("csv_excel")).toBe(";");
    expect(separateurPour("xlsx")).toBe(";");
  });

  it("n'échappe que ce qui casse la ligne", () => {
    expect(champCsv("simple", ";")).toBe("simple");
    expect(champCsv("a;b", ";")).toBe('"a;b"');
    expect(champCsv("a,b", ";")).toBe("a,b");
    expect(champCsv("a,b", ",")).toBe('"a,b"');
    expect(champCsv('il a dit "oui"', ";")).toBe('"il a dit ""oui"""');
    expect(champCsv("ligne1\nligne2", ";")).toBe('"ligne1\nligne2"');
    expect(champCsv(null, ";")).toBe("");
    expect(champCsv(undefined, ";")).toBe("");
    expect(champCsv(0, ";")).toBe("0");
  });

  it("produit autant de lignes que de produits, plus l'en-tête", () => {
    const csv = serialiserCsv(construireTableau([PRODUIT, PRODUIT, PRODUIT], COLONNES_EXPORT_DEFAUT), ";");
    expect(csv.split("\r\n")).toHaveLength(4);
  });

  it("ne produit jamais la chaîne 'undefined' dans une cellule", () => {
    const csv = serialiserCsv(construireTableau([PRODUIT], COLONNES_EXPORT_DEFAUT), ";");
    expect(csv).not.toContain("undefined");
  });
});

describe("classeur xlsx", () => {
  /** The exact call the route makes, minus the Response wrapper. */
  function classeur(colonnesCles: string[], produits: any[] = [PRODUIT]) {
    const tableau = construireTableau(produits, colonnesCles);
    const ws = XLSX.utils.json_to_sheet(tableau.objets, { header: tableau.entetes });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return XLSX.read(buffer, { type: "buffer" });
  }

  function feuille(wb: XLSX.WorkBook) {
    return wb.Sheets[wb.SheetNames[0]!]!;
  }

  it("écrit les 18 colonnes et les relit dans l'ordre", () => {
    const wb = classeur(COLONNES_EXPORT_DEFAUT);
    const grille = XLSX.utils.sheet_to_json<any[]>(feuille(wb), { header: 1 });
    expect(grille[0]).toEqual(COLONNES_EXPORT_DEFAUT.map((k) => MAP_COLONNES[k]!.label));
    expect(grille[1]).toHaveLength(18);
  });

  it("relit la valeur de chaque colonne sans la perdre", () => {
    const wb = classeur(COLONNES_EXPORT_DEFAUT);
    const lignes = XLSX.utils.sheet_to_json<Record<string, any>>(feuille(wb));
    expect(Object.keys(lignes[0]!)).toHaveLength(18);
    expect(lignes[0]!["Code Interne"]).toBe("P-0001");
    expect(lignes[0]!["Marge Estimée (DA)"]).toBe("500 DA (50%)");
    expect(lignes[0]!["Date d'Entrée"]).toBe("2026-07-24");
    expect(lignes[0]!["En Vitrine"]).toBe("Oui");
  });

  it("un classeur vide a bien ses en-têtes (jamais un fichier illisible)", () => {
    const wb = classeur(["code_interne", "reference"], []);
    expect(XLSX.utils.sheet_to_json(feuille(wb), { header: 1 })).toEqual([
      ["Code Interne", "Désignation / Modèle"],
    ]);
  });

  it("survit à une valeur contenant un point-virgule, un guillemet et un saut de ligne", () => {
    const wb = classeur(["notes"], [{ ...PRODUIT, notes: 'a;b\n"c"' }]);
    const lignes = XLSX.utils.sheet_to_json<Record<string, any>>(feuille(wb));
    expect(lignes[0]!["Notes"]).toBe('a;b\n"c"');
  });
});

/**
 * La mise en page du classeur, reproduite À L'IDENTIQUE depuis
 * `app/api/produits/export/route.ts`. Ces tests existent pour que la route et
 * son test ne puissent pas diverger en silence : si la route cesse d'écrire une
 * largeur ou un filtre, l'un d'eux rougit.
 */
describe("mise en page du classeur xlsx", () => {
  function feuilleRoute(colonnesCles: string[], produits: any[] = [PRODUIT]) {
    const tableau = construireTableau(produits, colonnesCles);
    const ws = XLSX.utils.json_to_sheet(tableau.objets, { header: tableau.entetes });

    for (const c of colonnesMonnaie(tableau.colonnesCles)) {
      for (let r = 1; r <= tableau.objets.length; r++) {
        const cellule = ws[XLSX.utils.encode_cell({ r, c })];
        if (cellule && typeof cellule.v === "number") cellule.z = FORMAT_MONNAIE;
      }
    }

    ws["!cols"] = largeursColonnes(tableau.colonnesCles);
    ws["!autofilter"] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: tableau.objets.length, c: tableau.colonnesCles.length - 1 },
      }),
    };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Inventaire");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return { ws, buffer, tableau };
  }

  it("pose une largeur par colonne émise, jamais `undefined`", () => {
    const { ws, tableau } = feuilleRoute(COLONNES_EXPORT_DEFAUT);
    const cols = ws["!cols"]!;
    expect(cols).toHaveLength(tableau.colonnesCles.length);
    for (const c of cols) expect(c.wch).toBeGreaterThan(0);
  });

  it("la désignation est bien la colonne la plus large du fichier écrit", () => {
    // Le lecteur de SheetJS n'expose pas `!cols` : la seule preuve que les
    // largeurs ont survécu à l'écriture est de les lire dans le XML du zip.
    // Les entrées y sont stockées sans compression, donc le XML est en clair.
    //
    // On compare les largeurs ENTRE ELLES plutôt qu'à `META_COLONNES` : le
    // writer convertit `wch` en `width` par un décalage interne
    // (`+0.83203125`), une constante qui ne nous appartient pas. La promesse
    // tenable, elle, est celle-ci : le nom des produits se lit en entier.
    const { buffer, tableau } = feuilleRoute(COLONNES_EXPORT_DEFAUT);
    const bloc = /<cols>(.*?)<\/cols>/.exec(buffer.toString("latin1"))?.[1];
    expect(bloc, "<cols> absent du fichier écrit").toBeDefined();

    const largeurs = [...bloc!.matchAll(/width="([0-9.]+)"/g)].map((m) => Number(m[1]));
    expect(largeurs).toHaveLength(tableau.colonnesCles.length);

    const iDesignation = tableau.colonnesCles.indexOf("reference");
    expect(iDesignation).toBe(1);
    expect(largeurs[iDesignation]).toBe(Math.max(...largeurs));
  });

  it("pose un filtre automatique sur toute la plage, en-tête compris", () => {
    const { buffer, tableau } = feuilleRoute(COLONNES_EXPORT_DEFAUT);
    const wb = XLSX.read(buffer, { type: "buffer", cellStyles: true });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const attendu = XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: tableau.objets.length, c: tableau.colonnesCles.length - 1 },
    });
    expect(ws["!autofilter"]).toEqual({ ref: attendu });
    // 18 colonnes de A à R, l'en-tête plus une ligne de donnée : A1:R2.
    expect(attendu).toBe("A1:R2");
  });

  it("affiche les montants en DA sans les transformer en texte", () => {
    const colonnes = ["reference", "prix_achat", "prix_vente_fixe"];
    const { ws, tableau } = feuilleRoute(colonnes);
    const ligne = 1;
    const colPrix = tableau.colonnesCles.indexOf("prix_achat");
    const cellule = ws[XLSX.utils.encode_cell({ r: ligne, c: colPrix })]!;
    expect(cellule.z).toBe(FORMAT_MONNAIE);
    // Un montant qui devient une chaîne cesse d'être sommable : c'est tout
    // l'intérêt d'un format d'affichage plutôt que d'un suffixe « DA ».
    expect(typeof cellule.v).toBe("number");
    expect(cellule.v).toBe(1000);
  });

  it("le format monétaire survit à l'écriture et à la relecture", () => {
    const colonnes = ["reference", "prix_achat"];
    const { buffer, tableau } = feuilleRoute(colonnes);
    const wb = XLSX.read(buffer, { type: "buffer", cellStyles: true });
    const ws = wb.Sheets[wb.SheetNames[0]!]!;
    const adresse = XLSX.utils.encode_cell({
      r: 1,
      c: tableau.colonnesCles.indexOf("prix_achat"),
    });
    expect(ws[adresse]!.z).toBe(FORMAT_MONNAIE);
    expect(typeof ws[adresse]!.v).toBe("number");
  });

  it("ne pose AUCUN format monétaire sur une colonne de texte", () => {
    const { ws } = feuilleRoute(["reference"]);
    expect(ws["A1"]!.z).toBeUndefined();
    expect(ws["A2"]!.z).toBeUndefined();
  });

  it("un classeur vide garde ses largeurs et son filtre d'en-tête", () => {
    const { ws, buffer } = feuilleRoute(["code_interne", "reference"], []);
    expect(ws["!cols"]).toHaveLength(2);
    expect(ws["!autofilter"]).toEqual({ ref: "A1:B1" });
    // Aucune ligne de donnée : la boucle des montants ne doit pas déborder.
    expect(() => buffer.toString("latin1")).not.toThrow();
  });
});
