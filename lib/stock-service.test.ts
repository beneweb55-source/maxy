import { describe, it, expect, vi, beforeEach } from "vitest";
import { 
  StockService, 
  STATUTS_EN_STOCK, 
  STATUTS_HORS_STOCK, 
  STATUTS_ELIGIBLES_DIMINUTION 
} from "@/lib/stock-service";
import { prisma } from "@/lib/db";

// Mock des fonctions Prisma et helpers
vi.mock("@/lib/db", () => ({
  prisma: {
    $transaction: vi.fn(),
    modele: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    produit: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    produitImage: {
      deleteMany: vi.fn(),
    },
    historiqueStatut: {
      deleteMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/creation-produits", () => ({
  creerProduitsGroupes: vi.fn().mockResolvedValue(["PR-0001", "PR-0002", "PR-0003"]),
}));

vi.mock("@/lib/journal", () => ({
  enregistrerActivite: vi.fn().mockResolvedValue(true),
  ACTIONS_JOURNAL: {
    PRODUIT_AJOUTER: "PRODUIT_AJOUTER",
    PRODUIT_MODIFIER: "PRODUIT_MODIFIER",
  },
}));

describe("StockService - Unification & Invariant Métier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Définitions métier des statuts", () => {
    it("inclut les statuts actifs dans STATUTS_EN_STOCK", () => {
      expect(STATUTS_EN_STOCK).toContain("en_vente");
      expect(STATUTS_EN_STOCK).toContain("recu");
      expect(STATUTS_EN_STOCK).toContain("ok");
      expect(STATUTS_EN_STOCK).toContain("produit_commande");
    });

    it("exclut vendu, hs et assemble du stock actif", () => {
      expect(STATUTS_HORS_STOCK).toContain("vendu");
      expect(STATUTS_HORS_STOCK).toContain("hs");
      expect(STATUTS_HORS_STOCK).toContain("assemble");
      expect(STATUTS_EN_STOCK).not.toContain("vendu");
      expect(STATUTS_EN_STOCK).not.toContain("hs");
      expect(STATUTS_EN_STOCK).not.toContain("assemble");
    });

    it("n'autorise que les exemplaires libres et sans engagement pour la diminution", () => {
      expect(STATUTS_ELIGIBLES_DIMINUTION).toContain("en_vente");
      expect(STATUTS_ELIGIBLES_DIMINUTION).toContain("recu");
      expect(STATUTS_ELIGIBLES_DIMINUTION).toContain("ok");
      expect(STATUTS_ELIGIBLES_DIMINUTION).not.toContain("produit_commande");
      expect(STATUTS_ELIGIBLES_DIMINUTION).not.toContain("vendu");
      expect(STATUTS_ELIGIBLES_DIMINUTION).not.toContain("assemble");
    });
  });

  describe("Validation des entrées", () => {
    it("rejette une quantité négative pour la création", async () => {
      await expect(
        StockService.createExemplaires(1, {
          reference: "ThinkPad T14",
          categorie: "PC Portables",
          quantite: -5,
        })
      ).rejects.toThrow();
    });

    it("rejette une quantité nulle pour la création", async () => {
      await expect(
        StockService.createExemplaires(1, {
          reference: "ThinkPad T14",
          categorie: "PC Portables",
          quantite: 0,
        })
      ).rejects.toThrow();
    });

    it("rejette une quantité négative pour setStockQuantity", async () => {
      await expect(
        StockService.setStockQuantity(1, -2, 1)
      ).rejects.toThrow("La quantité de stock doit être un entier positif ou nul.");
    });
  });

  describe("Cas A : Augmentation directe (+3 exemplaires)", () => {
    it("déclenche la création des exemplaires manquants et met à jour la quantité", async () => {
      const mockTx = {
        modele: {
          findUnique: vi.fn().mockResolvedValue({
            id: 10,
            nom: "Dell XPS 13",
            categorie_id: 1,
            quantite: 2,
            prix_vente_conseille: 120000,
            categorie: { id: 1, nom: "Laptops" },
          }),
          update: vi.fn().mockResolvedValue({ id: 10, quantite: 5 }),
        },
        produit: {
          findMany: vi.fn().mockResolvedValue([
            { id: 1, reference: "Dell XPS 13", statut: "en_vente", prix_achat: 80000, prix_vente_fixe: 120000, _count: { ventes: 0, mouvements: 0, reparations: 0, lignes_commande: 0 } },
            { id: 2, reference: "Dell XPS 13", statut: "en_vente", prix_achat: 80000, prix_vente_fixe: 120000, _count: { ventes: 0, mouvements: 0, reparations: 0, lignes_commande: 0 } },
          ]),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const resultat = await StockService.setStockQuantity(10, 5, 1);

      expect(resultat.ok).toBe(true);
      expect(resultat.ancienneQuantite).toBe(2);
      expect(resultat.nouvelleQuantite).toBe(5);
      expect(resultat.diff).toBe(3);
      expect(mockTx.modele.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { quantite: 5 },
      });
    });
  });

  describe("Cas B : Diminution directe (-2 exemplaires)", () => {
    it("refuse la diminution si les exemplaires ont des numéros de série ou un engagement", async () => {
      const mockTx = {
        modele: {
          findUnique: vi.fn().mockResolvedValue({
            id: 20,
            nom: "MacBook Air M2",
            categorie: { id: 1, nom: "Apple" },
          }),
        },
        produit: {
          findMany: vi.fn().mockResolvedValue([
            // Exemplaire 1 avec S/N et vente
            { id: 101, numero_serie: "C02XYZ123", statut: "en_vente", _count: { ventes: 1, mouvements: 0, reparations: 0, lignes_commande: 0 } },
            // Exemplaire 2 avec commande réservée
            { id: 102, numero_serie: "C02XYZ124", statut: "produit_commande", _count: { ventes: 0, mouvements: 0, reparations: 0, lignes_commande: 1 } },
          ]),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      // Tenter de passer de 2 à 1
      await expect(
        StockService.setStockQuantity(20, 1, 1)
      ).rejects.toThrow("seuls 0 exemplaire(s) sont libres et non assignés");
    });

    it("supprime proprement les exemplaires libres sans S/N quand la diminution est valide", async () => {
      const mockTx = {
        modele: {
          findUnique: vi.fn().mockResolvedValue({
            id: 30,
            nom: "Souris Logitech G Pro",
            categorie: { id: 2, nom: "Périphériques" },
          }),
          update: vi.fn().mockResolvedValue({ id: 30, quantite: 1 }),
        },
        produit: {
          findMany: vi.fn().mockResolvedValue([
            { id: 201, numero_serie: null, statut: "recu", _count: { ventes: 0, mouvements: 0, reparations: 0, lignes_commande: 0 } },
            { id: 202, numero_serie: null, statut: "en_vente", _count: { ventes: 0, mouvements: 0, reparations: 0, lignes_commande: 0 } },
            { id: 203, numero_serie: null, statut: "en_vente", _count: { ventes: 0, mouvements: 0, reparations: 0, lignes_commande: 0 } },
          ]),
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        produitImage: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
        historiqueStatut: {
          deleteMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const resultat = await StockService.setStockQuantity(30, 1, 1);

      expect(resultat.ok).toBe(true);
      expect(resultat.ancienneQuantite).toBe(3);
      expect(resultat.nouvelleQuantite).toBe(1);
      expect(resultat.diff).toBe(-2);
      expect(mockTx.produit.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: [203, 202] } }, // Les plus récents sans S/N
      });
      expect(mockTx.modele.update).toHaveBeenCalledWith({
        where: { id: 30 },
        data: { quantite: 1 },
      });
    });
  });

  describe("Cas C : Création en masse via UniversalStockManager", () => {
    it("crée 10 exemplaires et incrémente atomiquement le modèle parent", async () => {
      const mockTx = {
        modele: {
          findUnique: vi.fn().mockResolvedValue({
            id: 40,
            nom: "Écran Dell 27 4K",
            categorie_id: 3,
            quantite: 5,
            prix_vente_conseille: 65000,
            categorie: { id: 3, nom: "Moniteurs" },
          }),
          update: vi.fn().mockResolvedValue({ id: 40, quantite: 15 }),
        },
      };

      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return await callback(mockTx);
      });

      const resultat = await StockService.createExemplaires(1, {
        modeleId: 40,
        reference: "Écran Dell 27 4K",
        categorie: "Moniteurs",
        quantite: 10,
        statut: "en_vente",
        prix_achat: 45000,
        prix_vente_fixe: 65000,
      });

      expect(resultat.ok).toBe(true);
      expect(resultat.ancienneQuantite).toBe(5);
      expect(resultat.nouvelleQuantite).toBe(15);
      expect(resultat.diff).toBe(10);
      expect(mockTx.modele.update).toHaveBeenCalledWith({
        where: { id: 40 },
        data: { quantite: { increment: 10 } },
        select: { quantite: true },
      });
    });
  });
});
