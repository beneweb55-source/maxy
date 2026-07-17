const PALETTE = [
  { bg: "#FDECE3", fg: "#C2410C" },
  { bg: "#E5EFFC", fg: "#1257B0" },
  { bg: "#E7F6EF", fg: "#047857" },
  { bg: "#FDEBEB", fg: "#B91C1C" },
  { bg: "#F3E8FB", fg: "#7E22CE" },
  { bg: "#FEF4E6", fg: "#B45309" },
  { bg: "#E6F6F8", fg: "#0E7490" },
  { bg: "#ECEBE8", fg: "#57534E" },
];

function couleurPour(texte: string) {
  let empreinte = 0;
  for (let i = 0; i < texte.length; i++) {
    empreinte = (empreinte * 31 + texte.charCodeAt(i)) >>> 0;
  }
  return PALETTE[empreinte % PALETTE.length]!;
}

export default function BadgeDescription({
  description,
  className = "",
}: {
  description: string | null;
  className?: string;
}) {
  const texte = description?.trim();
  if (!texte) return null;
  const couleur = couleurPour(texte.toLowerCase());
  return (
    <span
      title={texte}
      style={{ backgroundColor: couleur.bg, color: couleur.fg }}
      className={`inline-block max-w-[14rem] truncate rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
    >
      {texte}
    </span>
  );
}
