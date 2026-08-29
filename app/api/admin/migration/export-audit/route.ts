import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

export async function GET() {
  try {
    const data = {
      produits: await prisma.produit.findMany({
        select: { id: true, code_interne: true, reference: true, categorie: true, modele_id: true, notes: true }
      }),
      modeles: await prisma.modele.findMany({
        include: { categorie: true }
      }),
      propositions: await prisma.propositionMigration.findMany(),
      historiques: await prisma.historiqueStatut.findMany({
        take: 100,
        orderBy: { created_at: 'desc' }
      }),
      factures: await prisma.factureLigne.findMany({
        select: { produit_id: true, code_interne: true, designation: true, categorie: true }
      })
    };

    const filePath = path.join(process.cwd(), "scratch", "audit_post_migration.json");
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

    return NextResponse.json({ success: true, file: filePath });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
