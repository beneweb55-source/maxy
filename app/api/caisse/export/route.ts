import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { sensMouvement } from "@/lib/caisse";

function champCsv(valeur: string | number | null): string {
  if (valeur === null) return "";
  const texte = String(valeur);
  return /[;"\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte;
}

export async function GET() {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const mouvements = await prisma.mouvementCaisse.findMany({
      orderBy: { id: "asc" },
      include: { user: { select: { username: true } } },
    });
    const entetes = ["Date", "Type", "Sens", "Montant (DA)", "Solde après (DA)", "Par", "Description"];
    const lignes = mouvements.map((m) =>
      [
        m.date.toISOString().replace("T", " ").slice(0, 16),
        m.type,
        sensMouvement(m.type),
        m.montant,
        m.solde_apres,
        m.user.username,
        m.description,
      ]
        .map(champCsv)
        .join(";")
    );
    const csv = "﻿" + [entetes.join(";"), ...lignes].join("\r\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="caisse-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (e) {
    console.error("GET /api/caisse/export", e);
    return erreur(500, "Erreur lors de l'export CSV.");
  }
}
