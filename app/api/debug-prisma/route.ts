import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur } from "@/lib/api";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  const tests: Record<string, string> = {};

  // Test 1: Prisma client version
  tests["prisma_client"] = "loaded";

  // Test 2: Basic user query
  try {
    await prisma.user.findFirst({ select: { id: true } });
    tests["user"] = "OK";
  } catch (e: any) {
    tests["user"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  // Test 3: VenteCredit model
  try {
    const count = await prisma.venteCredit.count();
    tests["venteCredit"] = `OK (count: ${count})`;
  } catch (e: any) {
    tests["venteCredit"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  // Test 4: Raw query vente_credits
  try {
    const rows: any[] = await prisma.$queryRawUnsafe(
      "SELECT count(*)::int as cnt FROM vente_credits"
    );
    tests["raw_vente_credits"] = `OK (count: ${rows[0]?.cnt})`;
  } catch (e: any) {
    tests["raw_vente_credits"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  // Test 5: VenteCredit findMany (the failing query)
  try {
    const credits = await prisma.venteCredit.findMany({
      take: 1,
      include: {
        client: { select: { id: true, nom: true, telephone: true, email: true } },
        vente: {
          select: {
            id: true, prix_vente_reel: true, date_vente: true, type_vente: true,
            produit: { select: { code_interne: true, reference: true } },
          },
        },
        paiements: { orderBy: { date_paiement: "desc" as const }, select: { id: true } },
      },
    });
    tests["venteCredit_findMany"] = `OK (${credits.length} results)`;
  } catch (e: any) {
    tests["venteCredit_findMany"] = `FAIL: ${e.message?.slice(0, 500)}`;
  }

  // Test 6: Charge model
  try {
    const count = await prisma.charge.count();
    tests["charge"] = `OK (count: ${count})`;
  } catch (e: any) {
    tests["charge"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  // Test 7: Vente model
  try {
    const count = await prisma.vente.count();
    tests["vente"] = `OK (count: ${count})`;
  } catch (e: any) {
    tests["vente"] = `FAIL: ${e.message?.slice(0, 300)}`;
  }

  return NextResponse.json(tests);
}
