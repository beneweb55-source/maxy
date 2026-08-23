"use client";

import { usePathname, useRouter } from "next/navigation";
import { useBarcodeScanner } from "@/lib/useBarcodeScanner";
import { useToast } from "@/components/toast";
import { useT } from "@/lib/i18n/contexte";

export default function ScannerGlobal() {
  const router = useRouter();
  const pathname = usePathname();
  const { afficher } = useToast();
  const t = useT();

  useBarcodeScanner((code) => {
    if (pathname !== "/pos") {
      afficher(t("scannerGlobal.redirection", { code }));
      const searchParams = new URLSearchParams();
      searchParams.set("scan_code", code);
      searchParams.set("t", Date.now().toString());
      router.push(`/pos?${searchParams.toString()}`);
    }
    // Si on est déjà dans la caisse, CaisseClient a son propre useBarcodeScanner qui l'intercepte.
  });

  return null;
}
