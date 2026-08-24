import Link from "next/link";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";
import { IconePlus, IconeNote } from "@/components/icons";
import { redirect } from "next/navigation";
import { CarnetFiltres } from "@/components/carnet/CarnetFiltres";
import type { Prisma } from "@prisma/client";

export default async function CarnetPage(
  props: { searchParams: Promise<{ q?: string; auteur?: string; categorie?: string; periode?: string }> }
) {
  const session = await utilisateurCourant();
  if (!session) redirect("/");

  const searchParams = await props.searchParams;
  const { q, auteur, categorie, periode } = searchParams;

  const conditions: Prisma.CarnetEntreeWhereInput = {};

  if (q?.trim()) {
    conditions.OR = [
      { titre: { contains: q, mode: "insensitive" } },
      { contenu: { contains: q, mode: "insensitive" } },
    ];
  }
  if (auteur && !isNaN(Number(auteur))) {
    conditions.user_id = Number(auteur);
  }
  if (categorie) {
    conditions.categorie = categorie as any;
  }
  if (periode) {
    const now = new Date();
    if (periode === "aujourdhui") {
      const debut = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      conditions.date_travail = { gte: debut };
    } else if (periode === "semaine") {
      const debut = new Date(now);
      debut.setDate(debut.getDate() - 7);
      conditions.date_travail = { gte: debut };
    } else if (periode === "mois") {
      const debut = new Date(now.getFullYear(), now.getMonth(), 1);
      conditions.date_travail = { gte: debut };
    }
  }

  const entrees = await prisma.carnetEntree.findMany({
    where: conditions,
    orderBy: { date_travail: "desc" },
    include: {
      user: { select: { id: true, username: true, role: true } },
      _count: { select: { pieces_jointes: true } },
    },
  });

  const allUsers = await prisma.user.findMany({
    select: { id: true, username: true, role: true },
    orderBy: { username: "asc" }
  });

  // Groupement par mois
  const groupes: Record<string, typeof entrees> = {};
  entrees.forEach((e) => {
    // Ex: "Août 2026"
    const cle = e.date_travail.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
    if (!groupes[cle]) groupes[cle] = [];
    groupes[cle].push(e);
  });

  // Capitalize month names
  const labelsMois = Object.keys(groupes).map(k => k.charAt(0).toUpperCase() + k.slice(1));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-brand-black tracking-tight">Carnet de travail</h1>
          <p className="text-sm text-brand-warm-grey">
            Historique collaboratif des tâches et interventions.
          </p>
        </div>

        <Link
          href="/carnet/nouveau"
          className="bg-brand-black text-brand-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm hover:bg-brand-dark-grey transition-colors flex items-center justify-center gap-2"
        >
          <IconePlus className="w-4 h-4" />
          Nouveau rapport
        </Link>
      </div>

      <CarnetFiltres utilisateurs={allUsers} />

      {entrees.length === 0 ? (
        <div className="bg-brand-white border border-brand-light-grey/50 rounded-xl p-8 text-center shadow-sm">
          <IconeNote className="w-8 h-8 text-brand-light-grey mx-auto mb-3" />
          <p className="text-brand-grey text-sm font-medium">Aucun rapport trouvé.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.keys(groupes).map((cleMois, i) => (
            <div key={cleMois}>
              <h2 className="text-sm font-bold text-brand-grey uppercase tracking-wider mb-4 px-1 border-b border-brand-light-grey/50 pb-2">
                {labelsMois[i]}
              </h2>
              
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {groupes[cleMois]?.map((e) => (
                  <Link 
                    key={e.id}
                    href={`/carnet/${e.id}`}
                    className="flex flex-col p-4 bg-brand-white border border-brand-light-grey/50 rounded-xl shadow-sm hover:border-brand-orange hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-brand-orange bg-brand-orange/10 px-2 py-0.5 rounded-full capitalize">
                        {e.categorie.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-brand-grey font-medium bg-brand-light-grey/20 px-1.5 py-0.5 rounded">
                        {e.date_travail.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                      </span>
                    </div>

                    <h3 className="font-outfit font-semibold text-brand-black text-base line-clamp-2 mb-1 group-hover:text-brand-orange transition-colors">
                      {e.titre}
                    </h3>
                    
                    <p className="text-xs text-brand-warm-grey mb-4 line-clamp-3 overflow-hidden text-ellipsis h-[3.6em] relative">
                      {/* Extraction très basique de texte du HTML sans Regex complexes qui casseraient côté client */}
                      <span dangerouslySetInnerHTML={{ __html: e.contenu.replace(/<[^>]+>/g, ' ').substring(0, 150) + '...' }} />
                    </p>

                    <div className="mt-auto pt-3 flex items-center justify-between border-t border-brand-light-grey/30">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-brand-light-grey flex items-center justify-center text-[10px] font-bold text-brand-black">
                          {e.user.username.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-brand-black">{e.user.username}</span>
                      </div>
                      
                      {e._count.pieces_jointes > 0 && (
                        <div className="flex items-center gap-1 text-brand-grey text-xs">
                          <IconeNote className="w-3.5 h-3.5" />
                          {e._count.pieces_jointes}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
