import { describe, it, expect } from "vitest";
import {
  CLES_CONTROLE_EXPORT,
  FORMATS_FICHIER,
  FORMAT_FICHIER_DEFAUT,
  PARAM_FORMAT_FICHIER,
  construireFiltresExport,
  construireParametresProduit,
  lireFormatFichier,
} from "@/lib/export-inventaire";

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

    it("scope=tous exporte tout le catalogue, sans filtre", () => {
      expect(construireFiltresExport(paramsModale("xlsx", "tous"))).toEqual({});
    });

    it("scope=filtres conserve le masquage par défaut des vendus / hs / assemblés", () => {
      const where = construireFiltresExport(paramsModale("csv_excel"));
      expect(JSON.stringify(where)).toContain("vendu");
      expect(JSON.stringify(where)).toContain("assemble");
    });
  });
});
