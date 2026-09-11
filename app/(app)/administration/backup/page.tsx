import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import BackupClient from "@/components/admin/BackupClient";

export default async function BackupPage() {
  const session = await utilisateurCourant();
  if (!session || (session.role !== "gerant" && session.role !== "dev")) {
    redirect("/");
  }

  return (
    <BackupClient
      user={{ id: session.id, username: session.username, role: session.role }}
    />
  );
}
