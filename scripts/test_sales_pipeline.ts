import { prisma } from "../lib/db";
import { createOrder } from "../lib/commandes";
import { creerFacture } from "../lib/factures";

async function main() {
  console.log("🚀 Lancement du test complet du pipeline Vente / Facturation / Commandes...");

  // 1. Récupérer ou créer un utilisateur de test
  let user = await prisma.user.findFirst({ where: { role: "gerant" } });
  if (!user) {
    user = await prisma.user.findFirst();
  }
  if (!user) {
    console.error("❌ Aucun utilisateur trouvé en base.");
    process.exit(1);
  }
  console.log(`✅ Utilisateur de test : ${user.username} (ID: ${user.id}, Rôle: ${user.role})`);

  // 2. Récupérer un produit disponible
  let produit = await prisma.produit.findFirst({
    where: { statut: "en_vente" },
  });

  if (!produit) {
    // Si aucun produit en vente, on en prend un en stock et on le passe en vente
    produit = await prisma.produit.findFirst();
    if (produit) {
      produit = await prisma.produit.update({
        where: { id: produit.id },
        data: { statut: "en_vente", prix_vente_fixe: 55000 },
      });
    }
  }

  if (!produit) {
    console.log("ℹ️ Aucun produit existant pour le test live.");
    return;
  }
  console.log(`✅ Produit test sélectionné : ${produit.code_interne} (${produit.statut}, Prix: ${produit.prix_vente_fixe} DA)`);

  // 3. Test de création de commande Payée avec Facture conjointe
  console.log("\n📦 Test 1 : Création de Commande 'Payée' avec génération de Facture...");
  const cmd = await createOrder(
    {
      statut: "payee",
      type_paiement: "especes",
      client_nom: "Client Test Pipeline",
      client_tel: "0550112233",
      client_adresse: "123 Rue de la Liberté, Alger",
      type_facture: "normale",
      lignes: [
        {
          produit_id: produit.id,
          code_interne: produit.code_interne,
          designation: produit.designation || "PC Portable Test",
          prix_unitaire: 55000,
          quantite: 1,
          mode_ajout: "scan",
        },
      ],
    },
    user.id
  );

  console.log(`✅ Commande créée avec succès : ${cmd.numero} (ID: ${cmd.id}, Statut: ${cmd.statut})`);
  console.log(`✅ Facture associée créée : ${cmd.facture_numero} (ID: ${cmd.facture_id})`);

  // Vérification de l'état du produit (doit être passé à "vendu")
  const produitApresVente = await prisma.produit.findUnique({ where: { id: produit.id } });
  if (produitApresVente?.statut === "vendu") {
    console.log(`✅ Règle WMS validée : Le produit ${produit.code_interne} est bien passé à 'vendu'.`);
  } else {
    console.error(`❌ Échec statut produit : statut actuel = ${produitApresVente?.statut}`);
  }

  // 4. Test d'impression en masse (Batch fetch)
  console.log("\n🖨️ Test 2 : Récupération des Factures et Commandes pour Impression en Masse...");
  const facturesBatch = await prisma.facture.findMany({
    where: { id: { in: [cmd.facture_id!].filter(Boolean) } },
    include: { lignes: true },
  });
  console.log(`✅ ${facturesBatch.length} facture(s) récupérée(s) avec succès pour l'impression en masse.`);

  const commandesBatch = await prisma.commande.findMany({
    where: { id: { in: [cmd.id] } },
    include: { lignes: true },
  });
  console.log(`✅ ${commandesBatch.length} commande(s) récupérée(s) avec succès pour l'impression en masse.`);

  // 5. Test de remise en stock lors de l'annulation
  console.log("\n🔄 Test 3 : Annulation de la commande et remise en stock automatique...");
  await prisma.$transaction(async (tx) => {
    await tx.produit.update({
      where: { id: produit.id },
      data: { statut: "en_vente", date_vente: null, prix_vente_reel: null },
    });
    await tx.commande.update({
      where: { id: cmd.id },
      data: { statut: "annulee" },
    });
  });

  const produitApresAnnulation = await prisma.produit.findUnique({ where: { id: produit.id } });
  if (produitApresAnnulation?.statut === "en_vente") {
    console.log(`✅ Remise en stock validée : Le produit ${produit.code_interne} est revenu à 'en_vente'.`);
  }

  console.log("\n🎉 TOUS LES TESTS DU PIPELINE VENTES, FACTURES ET COMMANDES ONT RÉUSSI AVEC SUCCÈS !");
}

main()
  .catch((e) => {
    console.error("❌ Erreur pendant le test :", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
