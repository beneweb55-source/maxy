import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";
import { idsParRole, notifier } from "@/lib/notifs";

export async function GET() {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const lots = await prisma.lot.findMany({
      orderBy: { date_entree: "desc" },
      include: { produits: { select: { statut: true } } },
    });
    const fournisseurs = Array.from(new Set(lots.map((l) => l.fournisseur))).sort();

    return NextResponse.json({
      fournisseurs,
      lots: lots.map((lot) => ({
        id: lot.id,
        fournisseur: lot.fournisseur,
        date_entree: lot.date_entree.toISOString(),
        statut_lot: lot.statut_lot,
        description: lot.description,
        quantite_attendue: lot.quantite_attendue,
        cout_global_declare: lot.cout_global_declare,
        nb_produits: lot.produits.length,
        nb_testes: lot.produits.filter((p) => p.statut !== "recu" && p.statut !== "en_test")
          .length,
        nb_recus: lot.produits.filter((p) => p.statut === "recu").length,
      })),
    });
  } catch (e) {
    console.error("GET /api/lots", e);
    return erreur(500, "Erreur lors du chargement des lots.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }

  const {
    fournisseur,
    description,
    cout_global_declare,
    quantite_attendue,
  } = (corps ?? {}) as {
    fournisseur?: unknown;
    description?: unknown;
    cout_global_declare?: unknown;
    quantite_attendue?: unknown;
  };

  if (typeof fournisseur !== "string" || !fournisseur.trim()) {
    return erreur(400, "Le fournisseur est obligatoire.");
  }

  if (
    cout_global_declare !== undefined &&
    cout_global_declare !== null &&
    (typeof cout_global_declare !== "number" ||
      !Number.isInteger(cout_global_declare) ||
      cout_global_declare < 0)
  ) {
    return erreur(400, "Le coût global déclaré doit être un entier positif en DA.");
  }

  if (
    quantite_attendue === undefined ||
    quantite_attendue === null ||
    typeof quantite_attendue !== "number" ||
    !Number.isInteger(quantite_attendue) ||
    quantite_attendue <= 0
  ) {
    return erreur(400, "La quantité attendue doit être un entier strictement positif.");
  }

  try {
    const lotCree = await prisma.$transaction(async (tx) => {
      const lot = await tx.lot.create({
        data: {
          fournisseur: fournisseur.trim(),
          description:
            typeof description === "string" && description.trim() ? description.trim() : null,
          cout_global_declare:
            typeof cout_global_declare === "number" ? cout_global_declare : null,
          quantite_attendue,
        },
      });

      if (cout_global_declare && cout_global_declare > 0) {
        await ajouterMouvement(tx, {
          montant: cout_global_declare,
          type: "achat_lot",
          user_id: user.id,
          lot_id: lot.id,
          description: `Achat lot n°${lot.id} — ${lot.fournisseur}`,
        });
      }

      const techniciens = await idsParRole(tx, "technicien");
      await notifier(
        tx,
        techniciens,
        `Nouveau lot n°${lot.id} — ${lot.fournisseur}, ${quantite_attendue} produits attendus`,
        `/lots/${lot.id}`
      );

      return lot;
    });

    return NextResponse.json({ lot_id: lotCree.id }, { status: 201 });
  } catch (e) {
    console.error("POST /api/lots", e);
    return erreur(500, "Erreur lors de la création du lot.");
  }
}
