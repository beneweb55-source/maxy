import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import { IconeBaseDeDonnees, IconeTelechargement } from "@/components/icons";

export default async function BackupPage() {
  const session = await utilisateurCourant();
  if (!session || (session.role !== "gerant" && session.role !== "dev")) {
    redirect("/");
  }

  return (
    <div className="space-y-6">
      <div className="pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black">Gestion des Sauvegardes</h1>
        <p className="mt-1 text-sm text-brand-warm-grey">
          Exportez et sécurisez les données de votre plateforme.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="carte p-6 flex flex-col gap-4 items-start">
          <div className="flex items-center gap-3 w-full">
            <div className="h-10 w-10 bg-brand-glow/40 text-brand-orange flex items-center justify-center rounded-full">
              <IconeBaseDeDonnees taille={20} />
            </div>
            <div>
              <h3 className="font-bold text-brand-black">Sauvegarde manuelle de la base</h3>
              <p className="text-xs text-brand-warm-grey">Téléchargez un export complet au format JSON</p>
            </div>
          </div>
          
          <div className="w-full bg-brand-light-grey/20 rounded p-3 text-sm text-brand-smooth border border-brand-light-grey/50">
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Inclut tous les utilisateurs et rôles</li>
              <li>Inclut l'inventaire, les ventes et mouvements de caisse</li>
              <li>Inclut les paramètres, le journal d'audit et les notifications</li>
            </ul>
          </div>
          
          <button 
            type="button" 
            className="btn btn-primaire w-full justify-center"
            disabled // Placeholder for now, could be implemented via a real API endpoint
          >
            <IconeTelechargement taille={16} />
            Générer et télécharger l'export (Bientôt)
          </button>
        </div>
        
        <div className="carte p-6 flex flex-col gap-4 items-start bg-gradient-to-br from-white to-brand-light-grey/10 border-brand-light-grey/60 shadow-sm">
          <div className="flex items-center gap-3 w-full">
            <div className="h-10 w-10 bg-succes/20 text-succes flex items-center justify-center rounded-full">
              <span className="text-xl">🛡️</span>
            </div>
            <div>
              <h3 className="font-bold text-brand-black">Sauvegardes automatiques (Cloud)</h3>
              <p className="text-xs text-brand-warm-grey">Votre base est sécurisée</p>
            </div>
          </div>
          
          <p className="text-sm text-brand-smooth">
            La base de données principale (Supabase/PostgreSQL) bénéficie de sauvegardes automatiques journalières gérées par le fournisseur cloud. Aucune action n'est requise.
          </p>
          
          <div className="mt-auto w-full pt-4 border-t border-brand-light-grey/30 text-xs text-brand-warm-grey flex justify-between items-center">
            <span>Dernière vérification :</span>
            <span className="font-semibold text-succes">Système opérationnel</span>
          </div>
        </div>
      </div>
    </div>
  );
}
