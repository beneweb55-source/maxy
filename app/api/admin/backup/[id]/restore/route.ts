/**
 * API /api/admin/backup/[id]/restore
 *
 * POST → Restaurer un backup (MODIFIE la DB)
 * Crée automatiquement un backup de sécurité avant restauration.
 */
import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { BackupService } from "@/lib/backup-service";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await utilisateurCourant();
    if (!session || (session.role !== "gerant" && session.role !== "dev")) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
    }

    const { id } = await params;
    const backupId = parseInt(id, 10);
    if (isNaN(backupId)) {
      return NextResponse.json({ error: "ID invalide" }, { status: 400 });
    }

    // Demander confirmation côté serveur
    const body = await req.json().catch(() => ({}));
    if (body.confirmation !== "RESTAURER") {
      return NextResponse.json(
        { error: "Confirmation requise. Envoyez { confirmation: 'RESTAURER' }." },
        { status: 400 }
      );
    }

    const result = await BackupService.restoreBackup(
      backupId,
      session.id,
      session.username
    );

    return NextResponse.json({
      message: result.message,
      backupId: result.backupId,
      preRestoreBackupId: result.preRestoreBackupId,
      recordsRestored: result.recordsRestored,
    });
  } catch (error: any) {
    console.error("POST /api/admin/backup/[id]/restore", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors de la restauration." },
      { status: 500 }
    );
  }
}
