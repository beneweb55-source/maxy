"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/toast";
import { IconeCoche } from "@/components/icons";

interface NotificationDto {
  id: number;
  message: string;
  lu: boolean;
  lien: string | null;
  created_at: string;
}

export default function PageNotifications() {
  const router = useRouter();
  const { afficher } = useToast();
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
        setErreur((corps as { error?: string } | null)?.error ?? "Erreur de chargement.");
        return;
      }
      const d = corps as { non_lues: number; notifications: NotificationDto[] };
      setNotifications(d.notifications);
      setNonLues(d.non_lues);
      setErreur(null);
    } catch {
      setErreur("Impossible de joindre le serveur.");
    }
  }, []);

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
      afficher("Toutes les notifications sont marquées lues.");
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
    return <p className="p-4 text-sm text-brand-warm-grey">Chargement des notifications…</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2">
          Notifications
          {nonLues > 0 && (
            <span className="rounded-full bg-brand-orange px-2 py-0.5 text-xs font-bold text-brand-white">
              {nonLues} non lue{nonLues > 1 ? "s" : ""}
            </span>
          )}
        </h1>
        {nonLues > 0 && (
          <button type="button" onClick={() => void toutMarquerLu()} className="btn btn-secondaire">
            <IconeCoche taille={15} />
            Tout marquer lu
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="carte border-dashed p-6 text-sm text-brand-warm-grey">
          Aucune notification.
        </p>
      ) : (
        <ul className="divide-y divide-brand-light-grey/50 overflow-hidden rounded-xl border border-brand-light-grey bg-brand-white">
          {notifications.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => void ouvrir(n)}
                className={`flex w-full items-start gap-2 px-4 py-3 text-left text-sm transition hover:bg-brand-glow/15 ${
                  n.lu ? "text-brand-warm-grey" : "font-medium text-brand-black"
                }`}
              >
                {!n.lu && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />}
                <span className="min-w-0 flex-1">
                  <span className="block">{n.message}</span>
                  <span className="text-xs font-normal text-brand-grey">
                    {new Date(n.created_at).toLocaleString("fr-FR", {
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
