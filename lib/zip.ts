// Générateur d'archives ZIP minimal, sans dépendance, côté serveur (Node).
// Méthode « store » (aucune compression) : les JPEG/PNG/WebP sont déjà
// compressés, inutile de les recompresser. Suffisant pour regrouper les photos
// des produits dans un téléchargement unique et organisé en dossiers.

interface EntreeZip {
  /** Chemin dans l'archive, séparateurs « / » (ex. "P-0001 Dell/01.jpg"). */
  chemin: string;
  contenu: Buffer;
}

const TABLE_CRC = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ TABLE_CRC[(crc ^ buf[i]!) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Date/heure DOS fixe (2020-01-01 00:00) — évite toute dépendance à l'horloge
// et garde les archives reproductibles.
const DOS_TIME = 0;
const DOS_DATE = ((2020 - 1980) << 9) | (1 << 5) | 1;

/** Construit une archive ZIP à partir d'une liste de fichiers. */
export function creerZip(entrees: EntreeZip[]): Buffer {
  const morceaux: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;

  for (const entree of entrees) {
    const nom = Buffer.from(entree.chemin, "utf8");
    const data = entree.contenu;
    const crc = crc32(data);

    const enteteLocale = Buffer.alloc(30);
    enteteLocale.writeUInt32LE(0x04034b50, 0); // signature
    enteteLocale.writeUInt16LE(20, 4); // version nécessaire
    enteteLocale.writeUInt16LE(0x0800, 6); // drapeau UTF-8 (bit 11)
    enteteLocale.writeUInt16LE(0, 8); // méthode : store
    enteteLocale.writeUInt16LE(DOS_TIME, 10);
    enteteLocale.writeUInt16LE(DOS_DATE, 12);
    enteteLocale.writeUInt32LE(crc, 14);
    enteteLocale.writeUInt32LE(data.length, 18); // taille compressée
    enteteLocale.writeUInt32LE(data.length, 22); // taille décompressée
    enteteLocale.writeUInt16LE(nom.length, 26);
    enteteLocale.writeUInt16LE(0, 28); // longueur extra

    morceaux.push(enteteLocale, nom, data);

    const enteteCentrale = Buffer.alloc(46);
    enteteCentrale.writeUInt32LE(0x02014b50, 0); // signature
    enteteCentrale.writeUInt16LE(20, 4); // version créatrice
    enteteCentrale.writeUInt16LE(20, 6); // version nécessaire
    enteteCentrale.writeUInt16LE(0x0800, 8); // drapeau UTF-8
    enteteCentrale.writeUInt16LE(0, 10); // méthode : store
    enteteCentrale.writeUInt16LE(DOS_TIME, 12);
    enteteCentrale.writeUInt16LE(DOS_DATE, 14);
    enteteCentrale.writeUInt32LE(crc, 16);
    enteteCentrale.writeUInt32LE(data.length, 20);
    enteteCentrale.writeUInt32LE(data.length, 24);
    enteteCentrale.writeUInt16LE(nom.length, 28);
    enteteCentrale.writeUInt16LE(0, 30); // extra
    enteteCentrale.writeUInt16LE(0, 32); // commentaire
    enteteCentrale.writeUInt16LE(0, 34); // n° disque
    enteteCentrale.writeUInt16LE(0, 36); // attributs internes
    enteteCentrale.writeUInt32LE(0, 38); // attributs externes
    enteteCentrale.writeUInt32LE(offset, 42); // décalage de l'entête locale
    central.push(enteteCentrale, nom);

    offset += enteteLocale.length + nom.length + data.length;
  }

  const tailleLocale = offset;
  const blocCentral = Buffer.concat(central);

  const fin = Buffer.alloc(22);
  fin.writeUInt32LE(0x06054b50, 0); // signature
  fin.writeUInt16LE(0, 4); // n° disque
  fin.writeUInt16LE(0, 6); // disque du répertoire central
  fin.writeUInt16LE(entrees.length, 8); // entrées sur ce disque
  fin.writeUInt16LE(entrees.length, 10); // total des entrées
  fin.writeUInt32LE(blocCentral.length, 12); // taille du répertoire central
  fin.writeUInt32LE(tailleLocale, 16); // décalage du répertoire central
  fin.writeUInt16LE(0, 20); // longueur du commentaire

  return Buffer.concat([...morceaux, blocCentral, fin]);
}

/** Assainit un fragment de chemin pour un nom de fichier/dossier sûr. */
export function nomSur(texte: string, repli = "produit"): string {
  const nettoye = texte
    .normalize("NFC")
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return nettoye || repli;
}
