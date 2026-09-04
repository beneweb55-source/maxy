import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function PUT(request: Request) {
  try {
    const acces = await exigerUtilisateur();
    if (acces.reponse) return acces.reponse;
    const userId = acces.user!.id;

    const body = await request.json();
    const { produit_ids, famille_id, categorie_id, sous_categorie_id, modele_id } = body;

    if (!produit_ids || !Array.isArray(produit_ids) || produit_ids.length === 0) {
      return NextResponse.json({ error: "Aucun produit sélectionné" }, { status: 400 });
    }
    if (!famille_id) {
      return NextResponse.json({ error: "La famille est obligatoire" }, { status: 400 });
    }

    // 1. Validation stricte de l'arborescence (Famille -> Catégorie -> Sous-catégorie)
    const famille = await prisma.categorie.findUnique({ where: { id: Number(famille_id) } });
    if (!famille || famille.parent_id !== null) {
      return NextResponse.json({ error: "Famille invalide" }, { status: 400 });
    }

    let target_categorie_id = famille.id;

    if (categorie_id) {
      const cat = await prisma.categorie.findUnique({ where: { id: Number(categorie_id) } });
      if (!cat || cat.parent_id !== famille.id) {
        return NextResponse.json({ error: "Catégorie invalide ou n'appartient pas à la famille" }, { status: 400 });
      }
      target_categorie_id = cat.id;
    }

    if (sous_categorie_id) {
      if (!categorie_id) {
         return NextResponse.json({ error: "Sous-catégorie fournie sans catégorie parente" }, { status: 400 });
      }
      const scat = await prisma.categorie.findUnique({ where: { id: Number(sous_categorie_id) } });
      if (!scat || scat.parent_id !== Number(categorie_id)) {
        return NextResponse.json({ error: "Sous-catégorie invalide ou n'appartient pas à la catégorie" }, { status: 400 });
      }
      target_categorie_id = scat.id;
    }

    // 2. Validation du Modèle
    if (modele_id) {
      const mod = await prisma.modele.findUnique({ where: { id: Number(modele_id) } });
      if (!mod || mod.categorie_id !== target_categorie_id) {
        return NextResponse.json({ error: "Modèle invalide ou n'appartient pas à la catégorie cible" }, { status: 400 });
      }
    }

    // 3. Exécution atomique (Transaction)
    await prisma.$transaction(async (tx) => {
      // Vérifier l'existence des produits
      const count = await tx.produit.count({
        where: { id: { in: produit_ids.map(Number) } }
      });
      if (count !== produit_ids.length) {
        throw new Error("Certains produits n'existent pas");
      }

      // Résoudre le nom de la catégorie cible pour synchroniser le champ texte
      const catCible = await tx.categorie.findUnique({
        where: { id: target_categorie_id },
        select: { nom: true }
      });
      const nomCategorie = catCible?.nom || "";

      // Mise à jour chirurgicale: categorie_id, modele_id ET categorie texte
      await tx.produit.updateMany({
        where: { id: { in: produit_ids.map(Number) } },
        data: {
          categorie_id: target_categorie_id,
          modele_id: modele_id ? Number(modele_id) : null,
          // Synchroniser le champ texte legacy avec le nom de la catégorie cible
          ...(nomCategorie ? { categorie: nomCategorie } : {}),
        }
      });

      // Journalisation
      for (const pid of produit_ids) {
        await enregistrerActivite(
          tx,
          userId,
          ACTIONS_JOURNAL.PRODUIT_MODIFIER,
          "produit",
          Number(pid),
          { action_details: "classification_manuelle", target_categorie_id, modele_id }
        );
      }
    });

    return NextResponse.json({ success: true, count: produit_ids.length });
  } catch (error: any) {
    console.error("Erreur PUT /api/produits/classification:", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la classification" },
      { status: 500 }
    );
  }
}
