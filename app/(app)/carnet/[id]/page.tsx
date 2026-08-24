import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";
import { redirect } from "next/navigation";
import { EditeurCarnet } from "@/components/carnet/EditeurCarnet";
import { PiecesJointes } from "@/components/carnet/PiecesJointes";
import { BoutonSupprimerCarnet } from "@/components/carnet/BoutonSupprimerCarnet";
import Link from "next/link";
import { IconeFlecheGauche, IconeOeil } from "@/components/icons";

export default async function CarnetDetailPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await utilisateurCourant();
  if (!session) redirect("/");

  const { id } = await params;
  const entreeId = Number(id);
  if (!Number.isInteger(entreeId)) redirect("/carnet");

  const entree = await prisma.carnetEntree.findUnique({
    where: { id: entreeId },
    include: {
      user: { select: { id: true, username: true } },
      pieces_jointes: { orderBy: { created_at: "asc" } },
    }
  });

  if (!entree) redirect("/carnet");

  const estAuteur = entree.user_id === session.id;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-20">
      
      <div className="flex items-center gap-2 text-sm font-medium text-brand-grey mb-4">
        <Link href="/carnet" className="hover:text-brand-black transition-colors flex items-center gap-1">
          <IconeFlecheGauche className="w-4 h-4" /> Retour au carnet
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold font-outfit text-brand-black tracking-tight mb-2">
            {entree.titre}
          </h1>
          <div className="flex items-center gap-4 text-xs font-medium text-brand-grey">
            <span className="flex items-center gap-1">
              <div className="w-5 h-5 rounded-full bg-brand-light-grey flex items-center justify-center text-[10px] font-bold text-brand-black">
                {entree.user.username.charAt(0).toUpperCase()}
              </div>
              {entree.user.username}
            </span>
            <div className="flex gap-1 flex-wrap">
              {entree.categories.map(c => (
                <span key={c} className="capitalize text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full">
                  {c.replace(/_/g, " ")}
                </span>
              ))}
            </div>
            <span>{entree.date_travail.toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</span>
          </div>
        </div>

        {estAuteur ? (
          <div className="self-start">
            <BoutonSupprimerCarnet id={entree.id} />
          </div>
        ) : (
          <div className="bg-brand-light-grey/20 px-3 py-1.5 rounded-lg text-sm text-brand-grey flex items-center gap-2 self-start">
            <IconeOeil className="w-4 h-4" /> Lecture seule
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <EditeurCarnet 
            id={entree.id}
            contenuInitial={entree.contenu}
            lectureSeule={!estAuteur}
          />
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="bg-brand-white border border-brand-light-grey/50 rounded-xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-brand-black mb-3">Informations</h3>
            <ul className="space-y-2 text-sm text-brand-grey">
              <li className="flex justify-between">
                <span>Auteur</span>
                <span className="font-medium text-brand-black">{entree.user.username}</span>
              </li>
              <li className="flex justify-between">
                <span>Création</span>
                <span className="font-medium text-brand-black">{entree.created_at.toLocaleDateString()}</span>
              </li>
              <li className="flex justify-between">
                <span>Dernière modif.</span>
                <span className="font-medium text-brand-black">{entree.updated_at.toLocaleDateString()} à {entree.updated_at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            </ul>
          </div>

          <PiecesJointes 
            entreeId={entree.id}
            piecesJointesInitiales={entree.pieces_jointes}
            lectureSeule={!estAuteur}
          />
        </div>
      </div>
    </div>
  );
}
