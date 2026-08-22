import { describe, expect, it } from "vitest";
import { finGarantie, GARANTIE_MOIS } from "./factures";

describe("factures — finGarantie", () => {
  it("calcule la date d'expiration standard à 6 mois", () => {
    const debut = new Date("2026-03-15T10:00:00.000Z");
    const fin = finGarantie(debut, 6);
    expect(fin.getFullYear()).toBe(2026);
    expect(fin.getMonth()).toBe(8); // Septembre (0-indexé = 8)
    expect(fin.getDate()).toBe(15);
  });

  it("gère le passage d'année", () => {
    const debut = new Date("2026-10-10T12:00:00.000Z");
    const fin = finGarantie(debut, GARANTIE_MOIS);
    expect(fin.getFullYear()).toBe(2027);
    expect(fin.getMonth()).toBe(3); // Avril
    expect(fin.getDate()).toBe(10);
  });

  it("ajuste correctement la fin de mois quand le mois cible est plus court (ex: 31 août -> 28 février)", () => {
    const debut = new Date("2026-08-31T00:00:00.000Z");
    const fin = finGarantie(debut, 6);
    expect(fin.getFullYear()).toBe(2027);
    expect(fin.getMonth()).toBe(1); // Février
    expect(fin.getDate()).toBe(28);
  });

  it("ajuste correctement en année bissextile (ex: 31 août 2027 -> 29 février 2028)", () => {
    const debut = new Date("2027-08-31T00:00:00.000Z");
    const fin = finGarantie(debut, 6);
    expect(fin.getFullYear()).toBe(2028);
    expect(fin.getMonth()).toBe(1); // Février 2028 (bissextile)
    expect(fin.getDate()).toBe(29);
  });
});
