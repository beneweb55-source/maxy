import { NextResponse, type NextRequest } from "next/server";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { StockService } from "@/lib/stock-service";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const acces = await exigerUtilisateur(["gerant", "technicien", "dev"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  try {
    const { id } = await context.params;
    const modeleId = Number(id);
    if (!Number.isInteger(modeleId) || modeleId <= 0) {
      return erreur(400, "Identifiant de modèle invalide.");
    }

    const body = await request.json();
    const { quantite, statutDefaut, emplacement } = body as {
      quantite: number;
      statutDefaut?: any;
      emplacement?: string;
    };

    if (quantite === undefined || !Number.isInteger(Number(quantite)) || Number(quantite) < 0) {
      return erreur(400, "La quantité doit être un nombre entier supérieur ou égal à 0.");
    }

    const resultat = await StockService.setStockQuantity(
      modeleId,
      Number(quantite),
      user.id,
      { statutDefaut, emplacement }
    );

    return NextResponse.json(resultat);
  } catch (err: any) {
    console.error("PATCH /api/modeles/[id]/quantite", err);
    return erreur(400, err.message || "Erreur lors de la modification de quantité.");
  }
}
