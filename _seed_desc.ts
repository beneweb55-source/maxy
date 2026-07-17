import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const data = [
    { fournisseur: "MOUFID", quantite_attendue: 11, description: "CARTE GRAPHIC" },
    { fournisseur: "TECHNO DZ", quantite_attendue: 20, description: "Lot mixte bureautique" },
    { fournisseur: "IMPORT 16", quantite_attendue: 8, description: "CARTE GRAPHIC" },
    { fournisseur: "EL DJAZAIR", quantite_attendue: 15, description: "Écrans et périphériques" },
    { fournisseur: "SANS DESC", quantite_attendue: 5, description: null },
  ];
  for (const d of data) await prisma.lot.create({ data: d });
  console.log("OK lots créés:", data.length);
  await prisma.$disconnect();
}
main();
