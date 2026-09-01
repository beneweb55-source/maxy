import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

async function main() {
  // 1. Fetch categories tree
  const categories = await prisma.categorie.findMany({
    include: {
      parent: {
        include: {
          parent: true,
        },
      },
      enfants: true,
      _count: {
        select: {
          produits: true,
          modeles: true,
        },
      },
    },
    orderBy: [{ parent_id: "asc" }, { ordre: "asc" }, { id: "asc" }],
  });

  // 2. Fetch all products
  const produits = await prisma.produit.findMany({
    select: {
      id: true,
      code_interne: true,
      reference: true,
      categorie: true,
      categorie_id: true,
      modele_id: true,
      notes: true,
      grade: true,
      emplacement: true,
      statut: true,
      prix_achat: true,
      prix_vente_fixe: true,
      modele: {
        select: {
          id: true,
          nom: true,
          categorie_id: true,
          attributs: true,
        },
      },
      categorie_rel: {
        select: {
          id: true,
          nom: true,
          parent_id: true,
          parent: {
            select: {
              id: true,
              nom: true,
              parent_id: true,
              parent: {
                select: {
                  id: true,
                  nom: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  });

  // Summary by unique reference / category combination
  const summary: Record<string, any> = {};
  for (const p of produits) {
    const key = `${p.reference} ||| ${p.categorie} ||| ${p.categorie_id}`;
    if (!summary[key]) {
      summary[key] = {
        reference: p.reference,
        categorie_legacy: p.categorie,
        categorie_id: p.categorie_id,
        categorie_nom: p.categorie_rel?.nom || "AUCUNE",
        chemin: p.categorie_rel
          ? [
              p.categorie_rel.parent?.parent?.nom,
              p.categorie_rel.parent?.nom,
              p.categorie_rel.nom,
            ]
              .filter(Boolean)
              .join(" > ")
          : "SANS_CATEGORIE_REL",
        modele: p.modele?.nom,
        notes: p.notes,
        count: 0,
        ids: [],
        statuts: {},
      };
    }
    summary[key].count++;
    summary[key].ids.push(p.id);
    summary[key].statuts[p.statut] = (summary[key].statuts[p.statut] || 0) + 1;
  }

  const outDir = "C:\\Users\\ASUS\\.gemini\\antigravity-ide\\brain\\f2d03e04-5bc9-4778-9700-dd0b8ecf7f2d\\scratch";
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(
    path.join(outDir, "categories_dump.json"),
    JSON.stringify(categories, null, 2)
  );

  fs.writeFileSync(
    path.join(outDir, "produits_full.json"),
    JSON.stringify(produits, null, 2)
  );

  fs.writeFileSync(
    path.join(outDir, "produits_summary.json"),
    JSON.stringify(Object.values(summary), null, 2)
  );

  console.log(`DUMP SUCCESS: ${categories.length} categories, ${produits.length} products (${Object.keys(summary).length} unique groups).`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
