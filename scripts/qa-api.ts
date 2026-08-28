import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_URL = "http://localhost:3000/api";

async function login() {
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "imed", password: "Imed@2007" })
  });
  
  if (!res.ok) throw new Error("Login failed");
  
  const cookies = res.headers.get("set-cookie");
  return cookies;
}

async function runTest() {
  console.log("=== DÉBUT DU TEST QA INVENTAIRE ===");
  try {
    const cookies = await login();
    console.log("✅ Connecté en tant que gérant (imed)");

    // 1. Création de 10 unités
    console.log("\n--- TEST: Création de 10 unités ---");
    const resCreate = await fetch(`${API_URL}/produits`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Cookie": cookies },
      body: JSON.stringify({
        reference: "TEST-QA-10",
        categorie: "TEST",
        prix_achat: 100,
        quantite: 10,
        en_vitrine: false
      })
    });
    
    if (!resCreate.ok) {
      console.error(await resCreate.text());
      throw new Error("Failed to create products");
    }
    
    const created = await resCreate.json();
    console.log(`✅ 10 unités créées. Code interne de base : ${created.code_interne}`);

    // 2. Vérification DB
    const produits = await prisma.produit.findMany({
      where: { reference: "TEST-QA-10" }
    });
    console.log(`🔍 Vérification DB : ${produits.length} unités trouvées (Attendu: 10).`);
    if (produits.length !== 10) throw new Error("La création n'a pas généré 10 unités.");

    const ids = produits.map(p => p.id);

    // 3. Réduction de la quantité à 5 (Test Destructif)
    console.log("\n--- TEST: Réduction de la quantité (10 -> 5) ---");
    const resEdit = await fetch(`${API_URL}/produits/masse/edition`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Cookie": cookies },
      body: JSON.stringify({
        ids,
        reference: "TEST-QA-10-MOD",
        categorie: "TEST",
        prix_achat: 100,
        quantite: 5
      })
    });
    
    if (!resEdit.ok) {
      console.error(await resEdit.text());
      throw new Error("Failed to edit quantity");
    }
    
    console.log("✅ Édition validée par l'API.");

    // 4. Vérification DB post-réduction
    const produitsRestants = await prisma.produit.findMany({
      where: { id: { in: ids } }
    });
    console.log(`🔍 Unités restantes en DB : ${produitsRestants.length} (Attendu: 5).`);
    if (produitsRestants.length !== 5) throw new Error("La suppression n'a pas retiré 5 unités.");

    console.log("✅ La référence a été mise à jour :", produitsRestants[0].reference);

    // 5. Test d'impossibilité de suppression si vendu
    console.log("\n--- TEST: Protection contre la suppression si historique ---");
    // On simule une vente sur le premier produit restant
    await prisma.vente.create({
      data: {
        produit_id: produitsRestants[0].id,
        prix: 150,
        vendu_par: 1,
        date_vente: new Date()
      }
    });
    console.log("💸 Vente simulée sur 1 unité.");
    
    const resEdit2 = await fetch(`${API_URL}/produits/masse/edition`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Cookie": cookies },
      body: JSON.stringify({
        ids: produitsRestants.map(p => p.id),
        quantite: 1 // On essaie de tout supprimer sauf 1
      })
    });
    
    if (resEdit2.status === 400 || resEdit2.status === 500) {
      const errorText = await resEdit2.text();
      console.log(`✅ L'API a bloqué la suppression comme prévu : ${errorText}`);
    } else {
      console.log("❌ L'API n'a pas bloqué la suppression ! Status: " + resEdit2.status);
    }

    console.log("\n=== TEST TERMINÉ AVEC SUCCÈS ===");

  } catch (e) {
    console.error("❌ ERREUR LORS DU TEST:", e);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
