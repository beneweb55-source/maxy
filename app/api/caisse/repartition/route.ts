import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { formaterDA } from "@/lib/caisse";
import { ajouterMouvement, beneficeDuMois, soldesCaisse } from "@/lib/caisse-db";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

export async function POST(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let confirmer = false;
  let customPct = { reinvest: 50, reserve: 20, parts: 20, frais: 10 };
  try {
    const corps = (await request.json()) as { confirmer?: unknown, pctReinvest?: number, pctReserve?: number, pctParts?: number, pctFrais?: number };
    confirmer = corps?.confirmer === true;
    customPct = {
      reinvest: corps?.pctReinvest ?? 50,
      reserve: corps?.pctReserve ?? 20,
      parts: corps?.pctParts ?? 20,
      frais: corps?.pctFrais ?? 10
    };
  } catch {
  }

  try {
    const maintenant = new Date();
    const annee = maintenant.getUTCFullYear();
    const mois = maintenant.getUTCMonth() + 1;
    const cleMois = `${annee}-${String(mois).padStart(2, "0")}`;
    const marqueur = `repartition:${cleMois}`;

    const dejaFaite = await prisma.mouvementCaisse.findFirst({
      where: { type: "reinvest", description: { contains: marqueur } },
      select: { id: true },
    });
    if (dejaFaite) {
      return erreur(409, `La répartition de ${cleMois} a déjà été appliquée.`);
    }

    const benefice = await beneficeDuMois(prisma, annee, mois);
    if (benefice <= 0) {
      return erreur(400, "Aucun bénéfice à répartir ce mois-ci.");
    }

    if (customPct.reinvest + customPct.reserve + customPct.parts + customPct.frais !== 100) {
      return erreur(400, "Le total des pourcentages doit être égal à 100.");
    }
    const partReserve = Math.round(benefice * (customPct.reserve / 100));
    const partAssocies = Math.round(benefice * (customPct.parts / 100));
    const partFrais = Math.round(benefice * (customPct.frais / 100));
    const partReinvest = benefice - partReserve - partAssocies - partFrais;

    const parametres = await prisma.parametres.findUnique({ where: { id: 1 } });
    const objectif = parametres?.objectif_reserve ?? 50000;
    const soldes = await soldesCaisse(prisma);
    const reserveSousObjectif = soldes.reserve < objectif;

    if (reserveSousObjectif && !confirmer) {
      return NextResponse.json({
        confirmation_required: true,
        message: `Le fonds de réserve (${formaterDA(soldes.reserve)}) n'a pas atteint son objectif : les ${customPct.parts} % de parts (${formaterDA(partAssocies)}) seront transférés en réserve au lieu d'être versés. Confirmer la répartition ?`,
        benefice,
        detail: {
          reinvest: partReinvest,
          reserve: partReserve,
          parts: partAssocies,
          frais: partFrais,
        },
      });
    }

    await prisma.$transaction(async (tx) => {
      await ajouterMouvement(tx, {
        montant: partReinvest,
        type: "reinvest",
        user_id: user.id,
        description: `Répartition ${cleMois} — réinvestissement ${customPct.reinvest} % (${marqueur})`,
      });
      await ajouterMouvement(tx, {
        montant: partReserve,
        type: "transfert_reserve",
        user_id: user.id,
        description: `Répartition ${cleMois} — réserve ${customPct.reserve} %`,
      });
      if (reserveSousObjectif) {
        await ajouterMouvement(tx, {
          montant: partAssocies,
          type: "transfert_reserve",
          user_id: user.id,
          description: `Répartition ${cleMois} — parts redirigées vers la réserve (objectif non atteint)`,
        });
      } else {
        await ajouterMouvement(tx, {
          montant: partAssocies,
          type: "retrait_parts",
          user_id: user.id,
          description: `Répartition ${cleMois} — parts des 4 associés (${customPct.parts} % total)`,
        });
      }
      await ajouterMouvement(tx, {
        montant: partFrais,
        type: "frais",
        user_id: user.id,
        description: `Répartition ${cleMois} — frais divers ${customPct.frais} %`,
      });

      await enregistrerActivite(tx, user.id, ACTIONS_JOURNAL.CAISSE_REPARTITION, "caisse", undefined, {
        cleMois,
        benefice,
        reinvest: partReinvest,
        reserve: partReserve,
        associes: partAssocies,
        frais: partFrais,
        parts_vers_reserve: reserveSousObjectif
      });
    });

    return NextResponse.json({
      ok: true,
      benefice,
      parts_vers_reserve: reserveSousObjectif,
    });
  } catch (e) {
    console.error("POST /api/caisse/repartition", e);
    return erreur(500, "Erreur lors de la répartition mensuelle.");
  }
}
