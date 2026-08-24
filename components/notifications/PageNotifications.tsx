"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { useLangue } from "@/lib/i18n/contexte";
import { IconeCoche, IconeCloche, IconeAlerte, IconeCocheCercle, IconeInfo, IconeCroixCercle } from "@/components/icons";

interface NotificationDto {
  id: number;
  message: string;
  lu: boolean;
  lien: string | null;
  type: string | null;
  created_at: string;
}

const ICONES_TYPE: Record<string, React.ReactNode> = {
  alerte_stock: <IconeAlerte taille={18} className="text-brand-orange" />,
  succes: <IconeCocheCercle taille={18} className="text-succes" />,
  info: <IconeInfo taille={18} className="text-brand-grey" />,
  erreur: <IconeCroixCercle taille={18} className="text-danger" />,
};

export default function PageNotifications() {
  const router = useRouter();
  const { afficher } = useToast();
  const { langue, t } = useLangue();
  const [notifications, setNotifications] = useState<NotificationDto[] | null>(null);
  const [nonLues, setNonLues] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications");
      const corps = (await res.json().catch(() => null)) as
        | { non_lues: number; notifications: NotificationDto[] }
        | { error?: string }
        | null;
      if (!res.ok || !corps || "error" in (corps as object)) {
        setErreur((corps as { error?: string } | null)?.error ?? t("notifications.erreurChargement"));
        return;
      }
      const d = corps as { non_lues: number; notifications: NotificationDto[] };
      setNotifications(d.notifications);
      setNonLues(d.non_lues);
      setErreur(null);
    } catch {
      setErreur(t("commun.serveurInjoignable"));
    }
  }, [t]);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function ouvrir(n: NotificationDto) {
    await fetch(`/api/notifications/${n.id}/lu`, { method: "POST" }).catch(() => undefined);
    router.push(n.lien ?? "/notifications");
  }

  async function toutMarquerLu() {
    const res = await fetch("/api/notifications/tout-lu", { method: "POST" });
    if (res.ok) {
      afficher(t("notifications.toutesLues"));
      await charger();
    }
  }

  if (erreur && notifications === null) {
    return (
      <div className="alerte-erreur" role="alert">
        {erreur}
      </div>
    );
  }
  if (notifications === null) {
    return <p className="p-4 text-sm text-brand-warm-grey">{t("notifications.chargement")}</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-entree">
      <div className="flex items-center justify-between pb-2 border-b border-brand-light-grey/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-brand-black flex items-center gap-2">
          {t("notifications.titre")}
          {nonLues > 0 && (
            <span className="rounded-full bg-brand-orange px-2 py-0.5 text-xs font-bold text-white">
              {nonLues} {t(nonLues > 1 ? "notifications.nonLuesP" : "notifications.nonLuesS")}
            </span>
          )}
        </h1>
        {nonLues > 0 && (
          <button type="button" onClick={() => void toutMarquerLu()} className="btn btn-secondaire">
            <IconeCoche taille={15} />
            {t("notifications.toutMarquerLu")}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
          {t("notifications.aucune")}
        </p>
      ) : (
        <ul className="overflow-hidden rounded-xl border border-brand-light-grey bg-brand-white">
          {notifications.map((n) => (
            <li key={n.id} className="ligne-table border-b border-brand-light-grey/30 last:border-0">
              <button
                type="button"
                onClick={() => void ouvrir(n)}
                className={`flex w-full items-start gap-3 px-4 py-4 text-left text-sm transition hover:bg-brand-glow/20 ${
                  n.lu ? "text-brand-warm-grey" : "font-medium text-brand-black bg-brand-light-grey/10"
                }`}
              >
                {!n.lu && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />}
                <span className="shrink-0 mt-0.5">
                  {ICONES_TYPE[n.type ?? "info"] || <IconeCloche taille={18} className="text-brand-grey" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block">{n.message}</span>
                  <span className="text-xs font-normal text-brand-grey">
                    {new Date(n.created_at).toLocaleString(langue === "en" ? "en-GB" : "fr-FR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
