/**
 * API /api/admin/backup/[id]/load
 *
 * POST → Charger un backup pour prévisualisation (SANS modifier la DB)
 */
import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { BackupService } from "@/lib/backup-service";

export async function POST(
  _req: Request,
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

    const result = await BackupService.loadBackup(backupId);

    return NextResponse.json({
      backup: result.backup,
      checksumValid: result.checksumValid,
      preview: {
        recordCounts: result.content.metadata.recordCounts,
        totalRecords: result.content.metadata.totalRecords,
        tablesIncluded: result.content.metadata.tablesIncluded,
        applicationVersion: result.content.metadata.applicationVersion,
        databaseSchemaVersion: result.content.metadata.databaseSchemaVersion,
        createdAt: result.content.metadata.createdAt,
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/backup/[id]/load", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors du chargement du backup." },
      { status: 500 }
    );
  }
}
