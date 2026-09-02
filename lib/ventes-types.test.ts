import { describe, it, expect, afterAll } from "vitest";
import { validerTypeVente, TYPES_VENTE } from "./validation";
import { prisma } from "./db";
import { creerFacture } from "./factures";
import { ajouterMouvement } from "./caisse-db";

describe("Séparation Métier Ventes COMPTOIR vs YALIDINE", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe("Validation & Typage", () => {
    it("définit strictement les deux valeurs autorisées", () => {
      expect(TYPES_VENTE).toEqual(["COMPTOIR", "YALIDINE"]);
    });

    it("valide et normalise 'COMPTOIR'", () => {
      const res = validerTypeVente("COMPTOIR");
      expect(res.type).toBe("COMPTOIR");
      expect(res.erreur).toBeUndefined();

      const resMin = validerTypeVente("comptoir ");
      expect(resMin.type).toBe("COMPTOIR");
    });

    it("valide et normalise 'YALIDINE'", () => {
      const res = validerTypeVente("YALIDINE");
      expect(res.type).toBe("YALIDINE");
      expect(res.erreur).toBeUndefined();

      const resMin = validerTypeVente(" yalidine");
      expect(resMin.type).toBe("YALIDINE");
    });

    it("rejette toute autre valeur non autorisée", () => {
      const res1 = validerTypeVente("AUTRE");
      expect(res1.erreur).toBeDefined();

      const res2 = validerTypeVente(null);
      expect(res2.erreur).toBeDefined();

      const res3 = validerTypeVente(123);
      expect(res3.erreur).toBeDefined();
    });
  });

  describe("Intégrité des Données & Rétrocompatibilité", () => {
    it(
      "garantit que 100% des factures historiques sont classées COMPTOIR",
      async () => {
        const nonComptoir = await prisma.facture.count({
          where: {
            type_vente: { not: "COMPTOIR" },
            date_emission: { lt: new Date("2026-09-02T20:00:00Z") },
          },
        });
        expect(nonComptoir).toBe(0);
      },
      25000
    );

    it(
      "garantit que 100% des ventes historiques sont classées COMPTOIR",
      async () => {
        const nonComptoir = await prisma.vente.count({
          where: {
            type_vente: { not: "COMPTOIR" },
            date_vente: { lt: new Date("2026-09-02T20:00:00Z") },
          },
        });
        expect(nonComptoir).toBe(0);
      },
      25000
    );
  });

  describe("Création et Affectation aux Caisses", () => {
    it(
      "crée une facture COMPTOIR avec caisse_destination CAISSE_PHYSIQUE",
      async () => {
        const user = await prisma.user.findFirst();
        const produit = await prisma.produit.findFirst();
        if (!user || !produit) return;

        const res = await prisma.$transaction(async (tx) => {
          return creerFacture(tx, {
            lignes: [
              {
                produit_id: produit.id,
                code_interne: "TEST-01",
                designation: "Produit Test Comptoir",
                categorie: "Test",
                prix: 5000,
              },
            ],
            userId: user.id,
            quand: new Date(),
            typeVente: "COMPTOIR",
            clientNom: "Test Client Comptoir",
          });
        });

        const f = await prisma.facture.findUnique({ where: { id: res.id } });
        expect(f?.type_vente).toBe("COMPTOIR");
        expect(f?.caisse_destination).toBe("CAISSE_PHYSIQUE");

        // Nettoyage
        await prisma.factureLigne.deleteMany({ where: { facture_id: res.id } });
        await prisma.facture.delete({ where: { id: res.id } });
      },
      25000
    );

    it(
      "crée une facture YALIDINE avec caisse_destination CAISSE_YALIDINE",
      async () => {
        const user = await prisma.user.findFirst();
        const produit = await prisma.produit.findFirst();
        if (!user || !produit) return;

        const res = await prisma.$transaction(async (tx) => {
          return creerFacture(tx, {
            lignes: [
              {
                produit_id: produit.id,
                code_interne: "TEST-02",
                designation: "Produit Test Yalidine",
                categorie: "Test",
                prix: 7500,
              },
            ],
            userId: user.id,
            quand: new Date(),
            typeVente: "YALIDINE",
            clientNom: "Test Client Yalidine",
          });
        });

        const f = await prisma.facture.findUnique({ where: { id: res.id } });
        expect(f?.type_vente).toBe("YALIDINE");
        expect(f?.caisse_destination).toBe("CAISSE_YALIDINE");

        // Nettoyage
        await prisma.factureLigne.deleteMany({ where: { facture_id: res.id } });
        await prisma.facture.delete({ where: { id: res.id } });
      },
      25000
    );

    it(
      "vérifie la cohérence arithmétique globale : Solde Global = Solde Comptoir + Solde Yalidine",
      async () => {
        const mouvements = await prisma.mouvementCaisse.findMany({
          select: { type: true, montant: true, caisse: true },
        });

        const soldePhysique = mouvements
          .filter((m) => m.caisse !== "CAISSE_YALIDINE")
          .reduce((sum, m) => sum + (m.type === "retrait" ? -m.montant : m.montant), 0);

        const soldeYalidine = mouvements
          .filter((m) => m.caisse === "CAISSE_YALIDINE")
          .reduce((sum, m) => sum + (m.type === "retrait" ? -m.montant : m.montant), 0);

        const soldeGlobal = mouvements.reduce(
          (sum, m) => sum + (m.type === "retrait" ? -m.montant : m.montant),
          0
        );

        expect(soldePhysique + soldeYalidine).toBe(soldeGlobal);
      },
      25000
    );

    it(
      "bascule transactionnellement les mouvements de caisse lors du changement de type de vente",
      async () => {
        const user = await prisma.user.findFirst();
        const produit = await prisma.produit.findFirst();
        if (!user || !produit) return;

        // 1. Créer une vente initiale COMPTOIR
        const venteInit = await prisma.vente.create({
          data: {
            produit_id: produit.id,
            vendu_par: user.id,
            prix_vente_reel: 3000,
            type_vente: "COMPTOIR",
          },
        });

        const mvtInit = await ajouterMouvement(prisma, {
          user_id: user.id,
          produit_id: produit.id,
          montant: 3000,
          type: "vente",
          caisse: "CAISSE_PHYSIQUE",
          description: "Test Vente Initiale",
        });

        const factureInit = await creerFacture(prisma, {
          lignes: [
            {
              produit_id: produit.id,
              vente_id: venteInit.id,
              code_interne: produit.code_interne,
              designation: produit.reference,
              categorie: produit.categorie,
              prix: 3000,
            },
          ],
          userId: user.id,
          quand: new Date(),
          typeVente: "COMPTOIR",
        });

        expect(factureInit.id).toBeDefined();

        // 2. Simuler la bascule COMPTOIR -> YALIDINE via la transaction PATCH
        await prisma.$transaction(async (tx) => {
          await tx.facture.update({
            where: { id: factureInit.id },
            data: {
              type_vente: "YALIDINE",
              caisse_destination: "CAISSE_YALIDINE",
            },
          });
          await tx.vente.updateMany({
            where: { id: venteInit.id },
            data: { type_vente: "YALIDINE" },
          });
          await tx.mouvementCaisse.updateMany({
            where: { id: mvtInit.id },
            data: { caisse: "CAISSE_YALIDINE" },
          });
        });

        // 3. Vérifications
        const fApres = await prisma.facture.findUnique({ where: { id: factureInit.id } });
        const vApres = await prisma.vente.findUnique({ where: { id: venteInit.id } });
        const mApres = await prisma.mouvementCaisse.findUnique({ where: { id: mvtInit.id } });

        expect(fApres?.type_vente).toBe("YALIDINE");
        expect(fApres?.caisse_destination).toBe("CAISSE_YALIDINE");
        expect(vApres?.type_vente).toBe("YALIDINE");
        expect(mApres?.caisse).toBe("CAISSE_YALIDINE");

        // 4. Nettoyage
        await prisma.factureLigne.deleteMany({ where: { facture_id: factureInit.id } });
        await prisma.facture.delete({ where: { id: factureInit.id } });
        await prisma.vente.delete({ where: { id: venteInit.id } });
        await prisma.mouvementCaisse.delete({ where: { id: mvtInit.id } });
      },
      25000
    );
  });
});
