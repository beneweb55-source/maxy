import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import AppShell from "@/components/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  return <AppShell user={user}>{children}</AppShell>;
}
