// eslint-disable-next-line @typescript-eslint/no-require-imports
const writtenNumber = require("written-number") as {
  (n: number, options?: { lang?: string; noAnd?: boolean }): string;
  defaults: { lang: string; noAnd?: boolean };
};

writtenNumber.defaults.lang = "fr";
writtenNumber.defaults.noAnd = false;

export function montantEnLettres(montant: number): string {
  if (!isFinite(montant) || montant < 0) return "montant invalide";

  const intPart = Math.floor(montant);
  const decPart = Math.round((montant - intPart) * 100);

  const lettresInt = writtenNumber(intPart);
  let resultat = `${lettresInt} Dinars Algériens`;

  if (decPart > 0) {
    const lettresDec = writtenNumber(decPart);
    resultat += ` et ${lettresDec} centimes`;
  }

  // Capitalize first letter
  return resultat.charAt(0).toUpperCase() + resultat.slice(1);
}
