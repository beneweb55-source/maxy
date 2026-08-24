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

  const formaterAction = (action: string) => {
    const labels: Record<string, string> = {
      "auth.connexion": "Connexion",
      "auth.echec": "Échec de connexion",
      "produit.ajouter": "Nouveau(x) produit(s)",
      "produit.statut": "Statut modifié",
      "vente.enregistrer": "Vente enregistrée",
      "backup.exporter": "Sauvegarde générée",
      "backup.restaurer": "Restauration",
    };
    return labels[action] || action;
  };

  const renderDetails = (details: string | null) => {
    if (!details) return <span className="text-brand-grey/50">—</span>;
    try {
      const parsed = JSON.parse(details);
      if (typeof parsed !== "object" || parsed === null) return <span>{details}</span>;
      return (
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(parsed).map(([key, value]) => (
            <span key={key} className="inline-flex items-center rounded bg-brand-light-grey/20 px-1.5 py-0.5 text-[10px] font-medium text-brand-black">
              <span className="text-brand-grey mr-1">{key}:</span> 
              {String(value)}
            </span>
          ))}
        </div>
      );
    } catch {
      return <span>{details}</span>;
    }
  };

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

      <div className="overflow-hidden rounded-xl border border-brand-light-grey/50 bg-brand-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-brand-paper/50">
                <th className="px-4 py-3 font-medium text-brand-warm-grey text-xs uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 font-medium text-brand-warm-grey text-xs uppercase tracking-wider">Utilisateur</th>
                <th className="px-4 py-3 font-medium text-brand-warm-grey text-xs uppercase tracking-wider">Action</th>
                <th className="px-4 py-3 font-medium text-brand-warm-grey text-xs uppercase tracking-wider">Cible</th>
                <th className="px-4 py-3 font-medium text-brand-warm-grey text-xs uppercase tracking-wider">Détails</th>
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
                    <td className="px-4 py-3 font-medium text-brand-black">
                      {log.user?.username || "Utilisateur supprimé"} <span className="text-brand-grey font-normal">({log.user?.role || "Inconnu"})</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-md bg-brand-light-grey/30 px-2 py-1 text-xs font-medium text-brand-smooth">
                        {formaterAction(log.action)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.entite_type ? (
                        <span className="text-brand-black">
                          {log.entite_type} <span className="text-brand-grey font-mono text-xs">#{log.entite_id}</span>
                        </span>
                      ) : (
                        <span className="text-brand-grey/50">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {renderDetails(log.details)}
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
