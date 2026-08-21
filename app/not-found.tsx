"use client";

import Link from "next/link";
import { useLangue } from "@/lib/i18n/contexte";

export default function NotFound() {
  const { t } = useLangue();
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="text-center">
        <h1>{t("commun.erreur")} 404</h1>
        <p className="mt-2 text-sm text-brand-warm-grey">
          {t("commun.introuvable")}
        </p>
        <Link href="/" className="btn btn-primaire mt-5">
          {t("commun.retourAccueil")}
        </Link>
      </div>
    </main>
  );
}
