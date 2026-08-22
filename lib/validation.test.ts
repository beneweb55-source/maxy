import { describe, expect, it } from "vitest";
import { validerLignesProduits, entierPositif } from "./validation";

describe("validation — produits et entrées", () => {
  it("valide une liste de produits conforme", () => {
    const lignes = [
      {
        reference: "Dell Latitude 5420",
        categorie: "PC Portable",
        prix_achat: 45000,
        prix_vente_fixe: 65000,
      },
    ];
    const res = validerLignesProduits(lignes);
    expect(res.erreur).toBeUndefined();
    expect(res.produits).toBeDefined();
    expect(res.produits?.length).toBe(1);
    expect(res.produits?.[0]?.reference).toBe("Dell Latitude 5420");
  });

  it("rejette les références ou catégories vides", () => {
    expect(validerLignesProduits([{ reference: "", categorie: "PC", prix_achat: 10000 }]).erreur).toBeDefined();
    expect(validerLignesProduits([{ reference: "Ref", categorie: "   ", prix_achat: 10000 }]).erreur).toBeDefined();
  });

  it("rejette les prix d'achat invalides ou négatifs", () => {
    expect(validerLignesProduits([{ reference: "Ref", categorie: "PC", prix_achat: -100 }]).erreur).toBeDefined();
    expect(validerLignesProduits([{ reference: "Ref", categorie: "PC", prix_achat: "abc" }]).erreur).toBeDefined();
  });

  it("valide la fonction entierPositif", () => {
    expect(entierPositif(100, "Le montant")).toBeNull();
    expect(entierPositif(0, "Le montant")).toContain("entier positif");
    expect(entierPositif(-50, "Le montant")).toContain("entier positif");
    expect(entierPositif(12.5, "Le montant")).toContain("entier positif");
    expect(entierPositif("100", "Le montant")).toContain("entier positif");
  });
});
