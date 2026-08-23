import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { utilisateurCourant } from "@/lib/session";

export default async function JournalActivitePage() {
  const session = await utilisateurCourant();
  if (!session || (session.role !== "gerant" && session.role !== "dev")) {
    redirect("/");
  }

  const logs = await prisma.journalActivite.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
    include: {
      user: {
        select: { username: true, role: true },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold font-outfit text-brand-black tracking-tight">Journal d'activité</h1>
          <p className="text-sm text-brand-warm-grey">
            Audit log global des 100 dernières actions effectuées sur la plateforme.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-brand-light-grey/50 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-brand-paper/50">
                <th className="px-4 py-2 font-medium text-brand-grey">Date</th>
                <th className="px-4 py-2 font-medium text-brand-grey">Utilisateur</th>
                <th className="px-4 py-2 font-medium text-brand-grey">Action</th>
                <th className="px-4 py-2 font-medium text-brand-grey">Cible</th>
                <th className="px-4 py-2 font-medium text-brand-grey">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-light-grey/30">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-brand-warm-grey">
                    Aucune activité enregistrée.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="transition-colors hover:bg-brand-glow/10">
                    <td className="px-4 py-2.5 text-brand-grey font-mono text-xs">
                      {new Date(log.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>
                    <td className="px-4 py-2.5 font-medium text-brand-black">
                      {log.user.username} <span className="text-brand-grey font-normal">({log.user.role})</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center rounded-md bg-brand-light-grey/30 px-2 py-1 text-xs font-medium text-brand-smooth">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      {log.entite_type ? (
                        <span className="text-brand-black">
                          {log.entite_type} <span className="text-brand-grey font-mono text-xs">#{log.entite_id}</span>
                        </span>
                      ) : (
                        <span className="text-brand-grey/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-brand-warm-grey truncate max-w-[200px]" title={log.details || ""}>
                      {log.details || "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
