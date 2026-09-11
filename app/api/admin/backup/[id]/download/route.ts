/**
 * API /api/admin/backup/[id]/download
 *
 * POST → Télécharger le fichier backup
 */
import { NextResponse } from "next/server";
import { utilisateurCourant } from "@/lib/session";
import { BackupService } from "@/lib/backup-service";
import fs from "fs/promises";

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

    const { filePath, filename, mimeType } = await BackupService.downloadBackup(backupId);

    const fileContent = await fs.readFile(filePath);

    return new NextResponse(fileContent, {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": fileContent.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("POST /api/admin/backup/[id]/download", error);
    return NextResponse.json(
      { error: error.message || "Erreur lors du téléchargement." },
      { status: 500 }
    );
  }
}
