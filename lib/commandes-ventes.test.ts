import { describe, it, expect, vi, beforeEach } from "vitest";
import { createOrder } from "@/lib/commandes";
import { creerFacture } from "@/lib/factures";
import { prisma } from "@/lib/db";

// Mock de Prisma et des modules
vi.mock("@/lib/db", () => {
  const mPrisma = {
    $transaction: vi.fn(async (cb) => cb(mPrisma)),
    $queryRaw: vi.fn().mockResolvedValue([{ max_seq: 1 }]),
    commande: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    facture: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    factureLigne: {
      createMany: vi.fn(),
    },
    produit: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    historiqueStatut: {
      create: vi.fn(),
    },
    mouvementCaisse: {
      create: vi.fn(),
    },
  };
  return { prisma: mPrisma };
});

vi.mock("@/lib/caisse-db", () => ({
  ajouterMouvement: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/journal", () => ({
  enregistrerActivite: vi.fn().mockResolvedValue(true),
  ACTIONS_JOURNAL: {
    VENTE_ENREGISTRER: "VENTE_ENREGISTRER",
    COMMANDE_CREER: "COMMANDE_CREER",
    COMMANDE_STATUT: "COMMANDE_STATUT",
    FACTURE_CREER: "FACTURE_CREER",
    PARAMETRES_MODIFIER: "PARAMETRES_MODIFIER",
  },
}));

describe("Système de Commande, Vente & Facturation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("doit créer une commande 'payee' et générer automatiquement la facture liée + déstocker le produit", async () => {
    const mockCommande = {
      id: 42,
      numero: "CMD-2026-0042",
      client_nom: "Samy Entreprise",
      total_ttc: 90000,
      statut: "payee",
      date_commande: new Date(),
    };

    (prisma.commande.create as any).mockResolvedValue(mockCommande);
    (prisma.produit.findUnique as any).mockResolvedValue({
      id: 101,
      statut: "en_vente",
      code_interne: "PC-001",
    });
    (prisma.facture.create as any).mockResolvedValue({
      id: 88,
      numero: "F-2026-0088",
    });

    const resultat = await createOrder(
      {
        statut: "payee",
        type_paiement: "especes",
        client_nom: "Samy Entreprise",
        client_tel: "0555000000",
        client_adresse: "Alger Centre",
        type_facture: "normale",
        lignes: [
          {
            produit_id: 101,
            code_interne: "PC-001",
            designation: "Dell Latitude 7420 i7 16GB",
            prix_unitaire: 90000,
            quantite: 1,
            mode_ajout: "scan",
          },
        ],
      },
      1
    );

    expect(resultat).toBeDefined();
    expect(resultat.id).toBe(42);
    expect(resultat.facture_id).toBe(88);
    expect(resultat.facture_numero).toBe("F-2026-0088");
    expect(prisma.commande.create).toHaveBeenCalled();
    // Doit avoir mis à jour le produit à "vendu" car statut === payee
    expect(prisma.produit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 101 },
        data: expect.objectContaining({ statut: "vendu", prix_vente_reel: 90000 }),
      })
    );
    // Doit avoir créé la facture
    expect(prisma.facture.create).toHaveBeenCalled();
  });

  it("doit réserver le matériel (statut 'produit_commande') lorsqu'une commande est en attente ou devis", async () => {
    const mockCommande = {
      id: 43,
      numero: "CMD-2026-0043",
      client_nom: "Client Réservation",
      total_ttc: 65000,
      statut: "en_attente",
      date_commande: new Date(),
    };

    (prisma.commande.create as any).mockResolvedValue(mockCommande);
    (prisma.produit.findUnique as any).mockResolvedValue({
      id: 102,
      statut: "en_vente",
      code_interne: "PC-002",
    });
    (prisma.facture.create as any).mockResolvedValue({
      id: 89,
      numero: "F-2026-0089",
    });

    const resultat = await createOrder(
      {
        statut: "en_attente",
        type_paiement: "virement",
        client_nom: "Client Réservation",
        lignes: [
          {
            produit_id: 102,
            code_interne: "PC-002",
            designation: "Lenovo ThinkPad T14",
            prix_unitaire: 65000,
            quantite: 1,
            mode_ajout: "manuel",
          },
        ],
      },
      1
    );

    expect(resultat.id).toBe(43);
    expect(prisma.produit.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 102 },
        data: expect.objectContaining({ statut: "produit_commande" }),
      })
    );
  });

  it("doit créer une facture directe (vente comptoir/vitrine) avec données fiscales complètes", async () => {
    (prisma.facture.create as any).mockResolvedValue({
      id: 99,
      numero: "F-2026-0099",
      total: 120000,
      client_nom: "Sarl Tech Algiers",
      client_rc: "16/00-1234567",
      client_nif: "001916001234567",
      client_nis: "001916001234567",
      client_ai: "1622334455",
      type_facture: "tva",
    });

    const facture = await creerFacture(
      prisma as any,
      {
        userId: 1,
        quand: new Date(),
        clientNom: "Sarl Tech Algiers",
        clientTel: "021000000",
        typeFacture: "tva",
        clientAdresse: "Hydra, Alger",
        clientRc: "16/00-1234567",
        clientNif: "001916001234567",
        clientNis: "001916001234567",
        clientAi: "1622334455",
        modePaiement: "virement",
        lignes: [
          {
            produit_id: 10,
            code_interne: "PC-002",
            designation: "HP ZBook Fury G8",
            prix: 120000,
          },
        ],
      }
    );

    expect(facture.id).toBe(99);
    expect(prisma.facture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          client_nom: "Sarl Tech Algiers",
          client_rc: "16/00-1234567",
          client_nif: "001916001234567",
          type_facture: "tva",
          mode_paiement: "virement",
          total: 120000,
        }),
      })
    );
  });

  it("QA Test 4 : Facturation à 0 DA et traçabilité S/N garantie", async () => {
    (prisma.facture.create as any).mockResolvedValue({
      id: 105,
      numero: "FA-2026-0005",
    });

    const facture = await creerFacture(
      prisma as any,
      {
        userId: 1,
        quand: new Date(),
        clientNom: "Remplacement SAV Client",
        typeFacture: "normale",
        lignes: [
          {
            produit_id: 11,
            code_interne: "PC-SAV-01",
            designation: "Dell Latitude 5420 (S/N: 8XYZ999)",
            prix: 0, // Vente / Remplacement à 0 DA
          },
        ],
      }
    );

    expect(facture.id).toBe(105);
    expect(prisma.facture.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          total: 0,
          client_nom: "Remplacement SAV Client",
        }),
      })
    );
    expect(prisma.factureLigne.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          expect.objectContaining({
            code_interne: "PC-SAV-01",
            designation: "Dell Latitude 5420 (S/N: 8XYZ999)",
            prix: 0,
          }),
        ],
      })
    );
  });
});

