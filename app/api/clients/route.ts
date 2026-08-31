import { type NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev", "social_media"]);
  if (acces.reponse) return acces.reponse;

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim();

    const clients = await prisma.client.findMany({
      where: q
        ? {
            OR: [
              { nom: { contains: q, mode: "insensitive" } },
              { telephone: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { registre_commerce: { contains: q, mode: "insensitive" } },
            ],
          }
        : undefined,
      orderBy: { created_at: "desc" },
      take: 20,
    });

    return NextResponse.json(clients);
  } catch (e: any) {
    console.error("GET /api/clients:", e);
    return erreur(500, e.message || "Erreur lors de la recherche des clients.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const body = await request.json();
    const { nom, telephone, email, adresse, registre_commerce, nif, nis, article_imposition } = body;

    if (!nom || !nom.trim()) {
      return erreur(400, "Le nom du client est obligatoire.");
    }

    const client = await prisma.client.create({
      data: {
        nom: nom.trim(),
        telephone: telephone ? telephone.trim() : null,
        email: email ? email.trim() : null,
        adresse: adresse ? adresse.trim() : null,
        registre_commerce: registre_commerce ? registre_commerce.trim() : null,
        nif: nif ? nif.trim() : null,
        nis: nis ? nis.trim() : null,
        article_imposition: article_imposition ? article_imposition.trim() : null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/clients:", e);
    return erreur(500, e.message || "Erreur lors de la création du client.");
  }
}
