import { describe, expect, it } from "vitest";
import {
  calculerSoldes,
  formaterDA,
  impactSolde,
  soldeApres,
  type MouvementPourCalcul,
} from "./caisse";

describe("caisse — sens et solde", () => {
  it("calcule le solde exact sur une séquence de mouvements mélangés", () => {
    const sequence: [MouvementPourCalcul, number][] = [
      [{ type: "apport_associe", montant: 300_000 }, 300_000],
      [{ type: "achat_lot", montant: 210_000 }, 90_000],
      [{ type: "achat_piece", montant: 3_500 }, 86_500],
      [{ type: "achat_piece", montant: 1_500 }, 85_000],
      [{ type: "vente", montant: 60_000 }, 145_000],
      [{ type: "vente", montant: 42_000 }, 187_000],
      [{ type: "vente", montant: 68_000 }, 255_000],
      [{ type: "reinvest", montant: 8_000 }, 255_000],
      [{ type: "transfert_reserve", montant: 3_200 }, 255_000],
      [{ type: "transfert_reserve", montant: 3_200 }, 255_000],
      [{ type: "frais", montant: 1_600 }, 253_400],
      [{ type: "vente", montant: 20_000 }, 273_400],
      [{ type: "vente", montant: 15_000 }, 288_400],
      [{ type: "annulation_vente", montant: 15_000 }, 273_400],
      [{ type: "achat_lot", montant: 112_000 }, 161_400],
      [{ type: "achat_lot", montant: 51_000 }, 110_400],
    ];

    let solde = 0;
    for (const [mouvement, attendu] of sequence) {
      solde = soldeApres(solde, mouvement.type, mouvement.montant);
      expect(solde).toBe(attendu);
    }

    const soldes = calculerSoldes(sequence.map(([m]) => m));
    expect(soldes.total).toBe(110_400);
    expect(soldes.reserve).toBe(6_400);
    expect(soldes.disponible).toBe(104_000);
  });

  it("les mouvements neutres ne changent pas le solde total mais déplacent la réserve", () => {
    const mouvements: MouvementPourCalcul[] = [
      { type: "apport_associe", montant: 100_000 },
      { type: "transfert_reserve", montant: 30_000 },
      { type: "reinvest", montant: 50_000 },
    ];
    const soldes = calculerSoldes(mouvements);
    expect(soldes.total).toBe(100_000);
    expect(soldes.reserve).toBe(30_000);
    expect(soldes.disponible).toBe(70_000);
  });

  it("une annulation contre-passe exactement la vente et rejette les montants invalides", () => {
    let solde = 50_000;
    solde = soldeApres(solde, "vente", 12_500);
    solde = soldeApres(solde, "annulation_vente", 12_500);
    expect(solde).toBe(50_000);

    expect(() => impactSolde("vente", -5)).toThrow();
    expect(() => impactSolde("frais", 10.5)).toThrow();
    expect(impactSolde("vente", 0)).toBe(0);
  });

  it("formate les montants en DZD lisibles", () => {
    expect(formaterDA(12_500)).toBe("12 500 DA");
    expect(formaterDA(-3_000)).toBe("-3 000 DA");
    expect(formaterDA(0)).toBe("0 DA");
  });
});
