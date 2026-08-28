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
    // Ne pas rediriger si on est déjà au POS, dans l'inventaire ou sur une fiche produit
    // (ces pages gèrent leur propre logique de scan).
    if (pathname === "/pos" || pathname === "/inventaire" || pathname?.startsWith("/produits")) {
      return;
    }
    afficher(t("scannerGlobal.redirection", { code }));
    const searchParams = new URLSearchParams();
    searchParams.set("scan_code", code);
    searchParams.set("t", Date.now().toString());
    router.push(`/pos?${searchParams.toString()}`);
  });

  return null;
}
