import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const { id } = await params;
    const modeleId = Number(id);
    if (!Number.isInteger(modeleId)) return erreur(400, "Identifiant de modèle invalide.");

    const modele = await prisma.modele.findUnique({
      where: { id: modeleId },
      include: {
        categorie: {
          include: {
            parent: {
              include: { parent: true }
            }
          }
        },
        exemplaires: {
          select: {
            id: true,
            code_interne: true,
            reference: true,
            numero_serie: true,
            grade: true,
            emplacement: true,
            statut: true,
            a_jeter: true,
            en_vitrine: true,
            prix_achat: true,
            prix_vente_fixe: true,
            prix_vente_reel: true,
            date_vente: true,
            etiquette_imprimee: true,
            lot_id: true,
            created_at: true,
            lot: {
              select: {
                id: true,
                fournisseur: true,
                date_entree: true,
              }
            }
          },
          orderBy: [{ statut: "asc" }, { id: "asc" }]
        }
      }
    });

    if (!modele) return erreur(404, "Modèle introuvable.");

    return NextResponse.json(modele);
  } catch (e) {
    console.error("GET /api/modeles/[id]", e);
    return erreur(500, "Erreur lors de la récupération du modèle.");
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { id } = await params;
    const modeleId = Number(id);
    if (!Number.isInteger(modeleId)) return erreur(400, "Identifiant de modèle invalide.");

    const body = await request.json();
    const { nom, categorie_id, attributs, image_url, description, prix_vente_conseille } = body;

    const data: any = {};
    if (nom !== undefined) {
      if (!nom || !nom.trim()) return erreur(400, "Le nom du modèle est obligatoire.");
      data.nom = nom.trim();
    }
    if (categorie_id !== undefined) {
      data.categorie_id = Number(categorie_id);
    }
    if (attributs !== undefined) {
      data.attributs = attributs;
    }
    if (image_url !== undefined) {
      data.image_url = image_url;
    }
    if (description !== undefined) {
      data.description = description;
    }
    if (prix_vente_conseille !== undefined) {
      data.prix_vente_conseille = prix_vente_conseille ? Number(prix_vente_conseille) : null;
    }

    const modeleMaj = await prisma.$transaction(async (tx) => {
      const updated = await tx.modele.update({
        where: { id: modeleId },
        data,
        include: { categorie: true }
      });

      // Si le nom ou la catégorie a changé, synchroniser les exemplaires
      if (data.nom || data.categorie_id) {
        await tx.produit.updateMany({
          where: { modele_id: modeleId },
          data: {
            ...(data.nom ? { reference: data.nom } : {}),
            ...(data.categorie_id ? { 
              categorie_id: updated.categorie_id,
              categorie: updated.categorie.nom 
            } : {})
          }
        });
      }

      return updated;
    });

    await enregistrerActivite(
      prisma,
      user.id,
      ACTIONS_JOURNAL.PRODUIT_MODIFIER,
      "modele",
      modeleId,
      { nom: modeleMaj.nom }
    );

    return NextResponse.json(modeleMaj);
  } catch (e) {
    console.error("PUT /api/modeles/[id]", e);
    return erreur(500, "Erreur lors de la modification du modèle.");
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const { id } = await params;
    const modeleId = Number(id);
    if (!Number.isInteger(modeleId)) return erreur(400, "Identifiant de modèle invalide.");

    const nbExemplaires = await prisma.produit.count({
      where: { modele_id: modeleId }
    });

    if (nbExemplaires > 0) {
      return erreur(400, `Impossible de supprimer : ce modèle contient encore ${nbExemplaires} exemplaire(s) physique(s) en stock.`);
    }

    await prisma.modele.delete({
      where: { id: modeleId }
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("DELETE /api/modeles/[id]", e);
    return erreur(500, "Erreur lors de la suppression du modèle.");
  }
}
