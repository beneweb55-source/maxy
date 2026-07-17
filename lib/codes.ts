import type { Prisma } from "@prisma/client";

export async function genererCodesInternes(
  tx: Prisma.TransactionClient,
  nombre: number
): Promise<string[]> {
  const dernier = await tx.produit.findFirst({
    orderBy: { id: "desc" },
    select: { code_interne: true },
  });
  let numero = 0;
  if (dernier) {
    const extrait = Number.parseInt(dernier.code_interne.replace(/\D/g, ""), 10);
    if (Number.isFinite(extrait)) numero = extrait;
  }
  return Array.from({ length: nombre }, () => {
    numero += 1;
    return `P-${String(numero).padStart(4, "0")}`;
  });
}
