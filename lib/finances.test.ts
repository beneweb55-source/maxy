import { describe, expect, it } from "vitest";
import { margeVente, seuilMargeMinimum } from "./finances";

describe("finances — marges et seuils", () => {
  it("calcule la marge exacte avec et sans réparations", () => {
    expect(margeVente(50_000, 30_000, 5_000)).toBe(15_000);
    expect(margeVente(50_000, 30_000, 0)).toBe(20_000);
  });

  it("calcule le seuil de marge minimum en pourcentage", () => {
    // Coût de revient = 30_000 + 5_000 = 35_000. Marge 20% -> 35_000 * 1.20 = 42_000
    expect(seuilMargeMinimum(30_000, 5_000, 20)).toBe(42_000);
    // Coût de revient = 10_000. Marge 15% -> 11_500
    expect(seuilMargeMinimum(10_000, 0, 15)).toBe(11_500);
  });
});
