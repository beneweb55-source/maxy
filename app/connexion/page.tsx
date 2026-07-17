import { Suspense } from "react";
import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import FormulaireConnexion from "@/components/FormulaireConnexion";

export default async function PageConnexion() {
  const user = await utilisateurCourant();
  if (user) redirect("/");
  return (
    <Suspense>
      <FormulaireConnexion />
    </Suspense>
  );
}
