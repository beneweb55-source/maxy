import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { erreur, exigerUtilisateur } from "@/lib/api";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

/**
 * L'historique des mouvements de caisse : le mesurer (GET), le vider (DELETE).
 *
 * ── Pourquoi une confirmation par mot-clé ET une sauvegarde ──
 * `mouvements_caisse` n'a aucune clé étrangère entrante (vérifié : aucun modèle
 * du schéma ne pointe vers elle) : la base ne protège donc rien ici, et un
 * `deleteMany({})` ne violerait aucune contrainte — rien ne préviendrait avant
 * de le faire. Or c'est le registre financier de l'exploitation : chaque vente,
 * chaque achat de lot, chaque répartition y a laissé une ligne. D'où le même
 * niveau d'exigence que `POST /api/admin/reinitialisation` : gérant seul,
 * mot-clé exact, et la copie renvoyée dans la réponse pour que l'écran puisse
 * la télécharger — sans quoi la sauvegarde serait un objet JSON que personne
 * n'ouvre jamais.
 *
 * ── Ce qui survit, volontairement ──
 * Le journal d'activité n'est pas touché. Il garde la trace de la suppression
 * elle-même, et surtout celle des répartitions déjà versées : c'est ce qui
 * empêche de verser deux fois la répartition du mois après un vidage (voir
 * `repartitionDejaAppliquee` dans lib/caisse-db.ts).
 *
 * ── Ce qui repart de zéro ──
 * Les soldes et les trois courbes de `GET /api/caisse`, le KPI `cash_disponible`
 * du tableau de bord, le flux d'activité et l'export CSV de la caisse : tous
 * sont calculés à partir de ces lignes. C'est le comportement attendu d'un
 * vidage, mais il se voit sur d'autres écrans que celui-ci.
 */

export async function GET() {
  const acces = await exigerUtilisateur(["gerant", "dev"]);
  if (acces.reponse) return acces.reponse;

  try {
    // Le comptage sert à l'écran de confirmation : il doit annoncer le VRAI
    // périmètre. `donnees.total` de la page est le total de la caisse
    // actuellement filtrée, pas celui de l'historique — annoncer l'un pour
    // l'autre serait exactement le genre de chiffre faux qu'on vient de
    // corriger sur l'export de l'inventaire.
    const [total, physique, yalidine, bornes] = await Promise.all([
      prisma.mouvementCaisse.count(),
      prisma.mouvementCaisse.count({ where: { caisse: "CAISSE_PHYSIQUE" } }),
      prisma.mouvementCaisse.count({ where: { caisse: "CAISSE_YALIDINE" } }),
      prisma.mouvementCaisse.aggregate({ _min: { date: true }, _max: { date: true } }),
    ]);

    return NextResponse.json({
      total,
      physique,
      yalidine,
      premier: bornes._min.date?.toISOString() ?? null,
      dernier: bornes._max.date?.toISOString() ?? null,
    });
  } catch (e) {
    console.error("GET /api/caisse/historique", e);
    return erreur(500, "Erreur lors du comptage de l'historique.");
  }
}

export async function DELETE(request: NextRequest) {
  const acces = await exigerUtilisateur(["gerant"]);
  if (acces.reponse) return acces.reponse;
  const user = acces.user;

  let corps: unknown;
  try {
    corps = await request.json();
  } catch {
    return erreur(400, "Requête invalide.");
  }
  const { confirmation } = (corps ?? {}) as { confirmation?: unknown };
  if (confirmation !== "VIDER") {
    return erreur(400, "Confirmation invalide : saisissez exactement VIDER.");
  }

  try {
    const resultat = await prisma.$transaction(async (tx) => {
      // La copie est prise DANS la transaction : ce qui est supprimé et ce qui
      // est renvoyé sont la même lecture. Il ne peut donc pas y avoir de ligne
      // sauvegardée qui aurait survécu, ni de ligne supprimée qui manquerait à
      // la sauvegarde.
      const mouvements = await tx.mouvementCaisse.findMany({ orderBy: { id: "asc" } });
      const suppression = await tx.mouvementCaisse.deleteMany({});

      const premier = mouvements[0];
      const dernier = mouvements[mouvements.length - 1];

      await enregistrerActivite(tx, user.id, ACTIONS_JOURNAL.CAISSE_PURGE_HISTORIQUE, "caisse", undefined, {
        mouvements_supprimes: suppression.count,
        du: premier?.date.toISOString() ?? null,
        au: dernier?.date.toISOString() ?? null,
        par_caisse: {
          CAISSE_PHYSIQUE: mouvements.filter((m) => m.caisse !== "CAISSE_YALIDINE").length,
          CAISSE_YALIDINE: mouvements.filter((m) => m.caisse === "CAISSE_YALIDINE").length,
        },
      });

      return { mouvements, supprimes: suppression.count };
    });

    const pluriel = resultat.supprimes > 1 ? "s" : "";

    return NextResponse.json({
      ok: true,
      supprimes: resultat.supprimes,
      message:
        resultat.supprimes === 0
          ? "L'historique était déjà vide."
          : `${resultat.supprimes} mouvement${pluriel} supprimé${pluriel}.`,
      backup: {
        timestamp: new Date().toISOString(),
        version: "1.0",
        source: "vidage-historique-caisse",
        data: { mouvements: resultat.mouvements },
      },
    });
  } catch (e) {
    console.error("DELETE /api/caisse/historique", e);
    return erreur(500, "Erreur lors du vidage de l'historique.");
  }
}
