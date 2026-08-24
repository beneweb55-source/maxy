import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";
import { enregistrerActivite, ACTIONS_JOURNAL } from "@/lib/journal";

function parseDates(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") {
    const isIsoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(obj);
    if (isIsoDate) {
      const date = new Date(obj);
      if (!isNaN(date.getTime())) return date;
    }
    return obj;
  }
  if (Array.isArray(obj)) return obj.map(parseDates);
  if (typeof obj === "object") {
    const parsed: any = {};
    for (const key in obj) {
      parsed[key] = parseDates(obj[key]);
    }
    return parsed;
  }
  return obj;
}

export async function POST(req: Request) {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const body = await req.json();
    if (!body || !body.data) {
      return NextResponse.json({ error: "Fichier de sauvegarde invalide." }, { status: 400 });
    }

    const backupData = parseDates(body.data);

    // Compatibilité v1.0 -> v1.1
    if (!backupData.factureLignes && backupData.factures) {
      backupData.factureLignes = [];
      backupData.factures.forEach((f: any) => {
        if (f.lignes) {
          backupData.factureLignes.push(...f.lignes);
          delete f.lignes;
        }
      });
    }

    // Paramètres : s'assurer que c'est un tableau
    const parametres = backupData.parametres 
      ? (Array.isArray(backupData.parametres) ? backupData.parametres : [backupData.parametres])
      : [];

    await prisma.$transaction(async (tx) => {
      // 1. Vider la base de données actuelle
      await tx.$executeRawUnsafe(`
        TRUNCATE TABLE "users", "parametres", "lots", "produits", "produit_images", "ventes", "reparations", "historique_statuts", "mouvements_caisse", "factures", "facture_lignes", "notifications", "journal_activite", "push_subscriptions", "fcm_tokens" RESTART IDENTITY CASCADE;
      `);

      // 2. Insérer les données en respectant l'ordre des relations
      if (backupData.users?.length > 0) await tx.user.createMany({ data: backupData.users });
      if (parametres.length > 0) await tx.parametres.createMany({ data: parametres });
      if (backupData.lots?.length > 0) await tx.lot.createMany({ data: backupData.lots });
      if (backupData.produits?.length > 0) await tx.produit.createMany({ data: backupData.produits });
      if (backupData.produitImages?.length > 0) await tx.produitImage.createMany({ data: backupData.produitImages });
      if (backupData.ventes?.length > 0) await tx.vente.createMany({ data: backupData.ventes });
      if (backupData.reparations?.length > 0) await tx.reparation.createMany({ data: backupData.reparations });
      if (backupData.historiqueStatuts?.length > 0) await tx.historiqueStatut.createMany({ data: backupData.historiqueStatuts });
      if (backupData.mouvements?.length > 0) await tx.mouvementCaisse.createMany({ data: backupData.mouvements });
      if (backupData.factures?.length > 0) await tx.facture.createMany({ data: backupData.factures });
      if (backupData.factureLignes?.length > 0) await tx.factureLigne.createMany({ data: backupData.factureLignes });
      if (backupData.notifications?.length > 0) await tx.notification.createMany({ data: backupData.notifications });
      if (backupData.journal?.length > 0) await tx.journalActivite.createMany({ data: backupData.journal });
      if (backupData.pushSubscriptions?.length > 0) await tx.pushSubscription.createMany({ data: backupData.pushSubscriptions });
      if (backupData.fcmTokens?.length > 0) await tx.fcmToken.createMany({ data: backupData.fcmTokens });

      // 3. Réinitialiser les séquences d'auto-incrémentation
      const tables = [
        "users", "parametres", "lots", "produits", "produit_images", 
        "ventes", "reparations", "historique_statuts", "mouvements_caisse", 
        "factures", "facture_lignes", "notifications", "journal_activite", 
        "push_subscriptions", "fcm_tokens"
      ];
      
      for (const table of tables) {
        await tx.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), coalesce(max(id), 0) + 1, false) FROM "${table}";`);
      }
      
      // Log la restauration d'urgence (ça va s'insérer juste après le setval, ce qui est parfait)
      await enregistrerActivite(tx, session.id, ACTIONS_JOURNAL.BACKUP_RESTAURER, "systeme", undefined, { timestamp: backupData.timestamp });
    }, {
      maxWait: 10000,  
      timeout: 300000, // 5 minutes max
    });

    return NextResponse.json({ message: "Restauration effectuée avec succès." }, { status: 200 });
  } catch (error: any) {
    console.error("Erreur restore:", error);
    return NextResponse.json({ error: error.message || "Erreur lors de la restauration." }, { status: 500 });
  }
}
