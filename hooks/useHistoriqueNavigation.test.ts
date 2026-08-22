import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  enregistrerRoute,
  naviguerRetourInterne,
  getParentFallback,
} from "./useHistoriqueNavigation";

describe("useHistoriqueNavigation", () => {
  const routerMock = {
    push: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retourne le fallback parent logique approprié", () => {
    expect(getParentFallback("/produits/123")).toBe("/inventaire");
    expect(getParentFallback("/lots/45")).toBe("/arrivages");
    expect(getParentFallback("/factures/67")).toBe("/factures");
    expect(getParentFallback("/rapports/89")).toBe("/rapports");
    expect(getParentFallback("/imprimer-etiquettes")).toBe("/inventaire");
    expect(getParentFallback("/inventaire")).toBe("/");
    expect(getParentFallback("/")).toBe("/");
  });

  it("trace la navigation et navigue en arrière fidèlement (Dashboard -> Inventaire -> Produit -> Back)", () => {
    enregistrerRoute("/", "");
    enregistrerRoute("/inventaire", "categorie=PC&page=2");
    enregistrerRoute("/produits/123", "");

    // 1er retour depuis /produits/123
    const handled1 = naviguerRetourInterne(routerMock, "/produits/123");
    expect(handled1).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith("/inventaire?categorie=PC&page=2");

    // 2e retour depuis /inventaire
    const handled2 = naviguerRetourInterne(routerMock, "/inventaire");
    expect(handled2).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith("/");

    // 3e retour depuis / (racine)
    const handled3 = naviguerRetourInterne(routerMock, "/");
    expect(handled3).toBe(false); // Pas d'historique interne, c'est la racine
  });

  it("gère la navigation depuis Vitrine vers Produit et retour vers Vitrine", () => {
    enregistrerRoute("/", "");
    enregistrerRoute("/vitrine", "");
    enregistrerRoute("/produits/999", "");

    const handled = naviguerRetourInterne(routerMock, "/produits/999");
    expect(handled).toBe(true);
    expect(routerMock.push).toHaveBeenCalledWith("/vitrine");
  });
});
