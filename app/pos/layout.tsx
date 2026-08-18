import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import type { Metadata } from "next";
import { FournisseurToasts } from "@/components/toast";

export const metadata: Metadata = {
  title: "Caisse - Solution Maxi",
  description: "Interface de caisse enregistreuse",
};

export default async function CaisseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion");
  
  return (
    <FournisseurToasts>
      <div className="min-h-screen bg-brand-light-grey/20 flex flex-col overflow-hidden text-brand-black">
        {children}
      </div>
    </FournisseurToasts>
  );
}
