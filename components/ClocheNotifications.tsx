"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconeCloche } from "./icons";

interface NotificationDto {
  id: number;
  message: string;
  lu: boolean;
  lien: string | null;
  created_at: string;
}

export default function ClocheNotifications() {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [nonLues, setNonLues] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const zone = useRef<HTMLDivElement>(null);

  const charger = useCallback(async () => {
    try {
      const res = await fetch("/api/notifications?limit=10");
      if (!res.ok) return;
      const donnees = (await res.json()) as {
        non_lues: number;
        notifications: NotificationDto[];
      };
      setNonLues(donnees.non_lues);
      setNotifications(donnees.notifications);
    } catch {
    }
  }, []);

  useEffect(() => {
    void charger();
    const intervalle = setInterval(() => void charger(), 60_000);
    return () => clearInterval(intervalle);
  }, [charger]);

  useEffect(() => {
    function surClicExterieur(e: MouseEvent) {
      if (zone.current && !zone.current.contains(e.target as Node)) setOuvert(false);
    }
    document.addEventListener("mousedown", surClicExterieur);
    return () => document.removeEventListener("mousedown", surClicExterieur);
  }, []);

  async function ouvrirNotification(n: NotificationDto) {
    setOuvert(false);
    try {
      await fetch(`/api/notifications/${n.id}/lu`, { method: "POST" });
    } catch {
    }
    void charger();
    router.push(n.lien ?? "/notifications");
  }

  async function toutMarquerLu() {
    await fetch("/api/notifications/tout-lu", { method: "POST" });
    void charger();
  }

  return (
    <div ref={zone} className="relative">
      <button
        type="button"
        onClick={() => setOuvert(!ouvert)}
        aria-label={`Notifications (${nonLues} non lues)`}
        className="relative rounded-lg border border-brand-light-grey p-2 text-brand-smooth transition hover:bg-brand-light-grey/40"
      >
        <IconeCloche taille={17} />
        {nonLues > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-orange px-1 text-[11px] font-bold text-brand-white">
            {nonLues > 9 ? "9+" : nonLues}
          </span>
        )}
      </button>

      {ouvert && (
        <div className="absolute right-0 top-11 z-50 w-80 overflow-hidden rounded-xl border border-brand-light-grey bg-brand-white shadow-xl">
          <div className="flex items-center justify-between border-b border-brand-light-grey/70 px-4 py-2.5">
            <span className="text-sm font-bold">Notifications</span>
            <button type="button" onClick={() => void toutMarquerLu()} className="lien text-xs">
              Tout marquer lu
            </button>
          </div>
          <ul className="max-h-96 divide-y divide-brand-light-grey/50 overflow-y-auto">
            {notifications.length === 0 && (
              <li className="px-4 py-5 text-sm text-brand-warm-grey">Aucune notification.</li>
            )}
            {notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void ouvrirNotification(n)}
                  className={`w-full px-4 py-2.5 text-left text-sm transition hover:bg-brand-glow/20 ${
                    n.lu ? "text-brand-warm-grey" : "font-medium text-brand-black"
                  }`}
                >
                  <span className="flex items-start gap-2">
                    {!n.lu && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate">{n.message}</span>
                      <span className="text-xs font-normal text-brand-grey">
                        {new Date(n.created_at).toLocaleString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div className="border-t border-brand-light-grey/70 px-4 py-2.5 text-center">
            <Link href="/notifications" onClick={() => setOuvert(false)} className="lien text-sm">
              Voir toutes les notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
