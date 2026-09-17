import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { exigerUtilisateur, erreur } from "@/lib/api";
import { ajouterMouvement } from "@/lib/caisse-db";

/**
 * GET /api/charges — Liste les charges avec filtres
 * POST /api/charges — Enregistrer une charge
 */

export async function GET(request: NextRequest) {
  const acces = await exigerUtilisateur();
  if (acces.reponse) return acces.reponse;

  try {
    const params = request.nextUrl.searchParams;
    const categorie = params.get("categorie");
    const statut = params.get("statut");
    const dateDebut = params.get("date_debut");
    const dateFin = params.get("date_fin");
    const modePaiement = params.get("mode_paiement");
    const beneficiaire = params.get("beneficiaire")?.trim();
    const q = params.get("q")?.trim();

    const where: any = {};

    if (categorie) {
      where.categorie = categorie;
    }
    if (statut) {
      where.statut = statut;
    }
    if (modePaiement) {
      where.mode_paiement = modePaiement;
    }
    if (beneficiaire) {
      where.beneficiaire = { contains: beneficiaire, mode: "insensitive" };
    }
    if (dateDebut || dateFin) {
      where.date_charge = {};
      if (dateDebut) where.date_charge.gte = new Date(dateDebut);
      if (dateFin) {
        const fin = new Date(dateFin);
        fin.setDate(fin.getDate() + 1);
        where.date_charge.lt = fin;
      }
    }
    if (q) {
      where.OR = [
        { libelle: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { beneficiaire: { contains: q, mode: "insensitive" } },
      ];
    }

    const charges = await prisma.charge.findMany({
      where,
      include: {
        user: { select: { id: true, username: true } },
      },
      orderBy: { date_charge: "desc" },
    });

    // Totaux
    const maintenant = new Date();
    const debutJour = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
    const debutSemaine = new Date(debutJour);
    debutSemaine.setDate(debutSemaine.getDate() - debutSemaine.getDay());
    const debutMois = new Date(maintenant.getFullYear(), maintenant.getMonth(), 1);
    const debutAnnee = new Date(maintenant.getFullYear(), 0, 1);

    const [totalJour, totalSemaine, totalMois, totalAnnee, totalGlobal] = await Promise.all([
      prisma.charge.aggregate({
        where: { date_charge: { gte: debutJour } },
        _sum: { montant: true },
      }),
      prisma.charge.aggregate({
        where: { date_charge: { gte: debutSemaine } },
        _sum: { montant: true },
      }),
      prisma.charge.aggregate({
        where: { date_charge: { gte: debutMois } },
        _sum: { montant: true },
      }),
      prisma.charge.aggregate({
        where: { date_charge: { gte: debutAnnee } },
        _sum: { montant: true },
      }),
      prisma.charge.aggregate({
        _sum: { montant: true },
      }),
    ]);

    // Répartition par catégorie (pour le mois en cours)
    const repartition = await prisma.charge.groupBy({
      by: ["categorie"],
      where: { date_charge: { gte: debutMois } },
      _sum: { montant: true },
      _count: true,
      orderBy: { _sum: { montant: "desc" } },
    });

    return NextResponse.json({
      charges,
      stats: {
        jour: totalJour._sum.montant ?? 0,
        semaine: totalSemaine._sum.montant ?? 0,
        mois: totalMois._sum.montant ?? 0,
        annee: totalAnnee._sum.montant ?? 0,
        total: totalGlobal._sum.montant ?? 0,
      },
      repartition,
    });
  } catch (e) {
    console.error("GET /api/charges", e);
    return erreur(500, "Erreur lors du chargement des charges.");
  }
}

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    const body = await request.json();
    const { categorie, libelle, description, montant, date_charge, mode_paiement, beneficiaire, reference, notes } = body;

    if (!categorie) return erreur(400, "La catégorie est obligatoire.");
    if (!libelle || !libelle.trim()) return erreur(400, "Le libellé est obligatoire.");

    const montantNum = Number(montant);
    if (!Number.isFinite(montantNum) || montantNum <= 0) {
      return erreur(400, "Le montant doit être un nombre positif.");
    }

    // Vérifier que la catégorie est valide
    const categoriesValides = [
      "loyer", "electricite", "internet", "telephone", "salaires",
      "transport", "carburant", "fournitures", "maintenance", "marketing",
      "logiciels", "taxes", "bancaires", "autre",
    ];
    if (!categoriesValides.includes(categorie)) {
      return erreur(400, `Catégorie invalide. Valeurs acceptées : ${categoriesValides.join(", ")}`);
    }

    const modesValides = ["especes", "virement", "carte", "cheque", "autre"];
    const mode = modesValides.includes(mode_paiement) ? mode_paiement : "especes";

    const charge = await prisma.$transaction(async (tx) => {
      const c = await tx.charge.create({
        data: {
          categorie,
          libelle: libelle.trim(),
          description: description?.trim() || null,
          montant: Math.round(montantNum),
          date_charge: date_charge ? new Date(date_charge) : new Date(),
          mode_paiement: mode as any,
          beneficiaire: beneficiaire?.trim() || null,
          reference: reference?.trim() || null,
          user_id: acces.user.id,
          notes: notes?.trim() || null,
        },
        include: {
          user: { select: { id: true, username: true } },
        },
      });

      // Enregistrer le mouvement de caisse pour cohérence financière
      await ajouterMouvement(tx, {
        montant: Math.round(montantNum),
        type: "frais",
        user_id: acces.user.id,
        date: c.date_charge,
        description: `Charge: ${libelle.trim()} [${categorie}]${beneficiaire ? ` → ${beneficiaire}` : ""}`,
        caisse: "CAISSE_PHYSIQUE",
      });

      return c;
    });

    return NextResponse.json(charge, { status: 201 });
  } catch (e: any) {
    console.error("POST /api/charges", e);
    return erreur(400, e?.message || "Erreur lors de l'enregistrement de la charge.");
  }
}
