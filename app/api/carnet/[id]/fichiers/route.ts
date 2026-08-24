import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { put } from "@vercel/blob";
import { extensionDepuisMime } from "@/lib/images";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const { id } = await params;
  const entreeId = Number(id);
  if (!Number.isInteger(entreeId)) return erreur(400, "ID invalide.");

  let corps: any;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const { nom, mime, taille, base64 } = corps;

  if (!nom || !mime || !taille || !base64) {
    return erreur(400, "Données de fichier manquantes.");
  }

  try {
    const entree = await prisma.carnetEntree.findUnique({ where: { id: entreeId } });
    if (!entree) return erreur(404, "Entrée introuvable.");

    if (entree.user_id !== user.id) {
      return erreur(403, "Vous ne pouvez pas ajouter de pièces jointes à ce rapport.");
    }

    let urlDistante = "";

    // Si on a un Token Vercel Blob
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const octets = Buffer.from(base64, "base64");
      // On utilise le nom d'origine mais en le nettoyant, et on ajoute un suffixe
      const cleanName = nom.replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const resultat = await put(`carnet/${entreeId}_${cleanName}`, octets, {
        access: "public",
        contentType: mime,
        addRandomSuffix: true,
      });
      urlDistante = resultat.url;
    } else {
      // Pas de Blob configuré : on enregistre en data-uri directement en base
      // (Solution de repli pour développement local ou sans Vercel)
      urlDistante = `data:${mime};base64,${base64}`;
    }

    const pj = await prisma.carnetPieceJointe.create({
      data: {
        entree_id: entreeId,
        nom,
        url: urlDistante,
        taille,
        type: mime,
      },
    });

    return NextResponse.json(pj, { status: 201 });
  } catch (e) {
    console.error("POST /api/carnet/[id]/fichiers", e);
    return erreur(500, `Erreur lors du téléversement : ${e instanceof Error ? e.message : "Inconnue"}`);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  const url = new URL(request.url);
  const fileIdStr = url.searchParams.get("fileId");
  const fileId = Number(fileIdStr);
  if (!fileIdStr || isNaN(fileId)) {
    return erreur(400, "fileId manquant ou invalide.");
  }

  try {
    const pj = await prisma.carnetPieceJointe.findUnique({
      where: { id: fileId },
      include: { entree: true },
    });

    if (!pj) return erreur(404, "Fichier introuvable.");

    if (pj.entree.user_id !== user.id) {
      return erreur(403, "Interdit.");
    }

    // Note : on ne supprime pas physiquement le blob sur Vercel par sécurité et car l'espace est grand,
    // mais on supprime l'entrée en base.
    await prisma.carnetPieceJointe.delete({ where: { id: fileId } });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/carnet/[id]/fichiers", e);
    return erreur(500, "Erreur lors de la suppression.");
  }
}
