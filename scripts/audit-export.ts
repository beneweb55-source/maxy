/**
 * Audit: does the export path preserve EVERY filter the inventory screen can send?
 *
 * For each filter family, the same URLSearchParams is fed to
 *   1. `construireFiltresProduits`  — what GET /api/produits builds, and
 *   2. `construireFiltresExport`    — what GET /api/produits/export builds.
 * The two where-clauses must be IDENTICAL and the two counts must be EQUAL.
 * Any divergence is a filter the export silently loses or mangles.
 *
 * Read-only: counts only.
 *
 * Run: npx tsx scripts/audit-export.ts
 */
import { construireFiltresProduits } from '../lib/filtres-produits';
import { construireFiltresExport, construireParametresProduit, FORMATS_FICHIER } from '../lib/export-inventaire';
import { prisma } from '../lib/db';

/** The 28 hardware-spec keys, copied from lib/filtres-produits.ts:63-69. */
const CHAMPS_MATRICE = [
  'marque', 'format', 'cpu', 'ram', 'stockage', 'format_cible', 'type_specifique',
  'generation', 'frequence_mhz', 'type_disque', 'interface', 'format_physique',
  'capacite', 'capacite_disque', 'taille_ecran', 'taille_pouces', 'resolution',
  'frequence_hz', 'type_dalle', 'puissance_w', 'type_connecteur', 'fondeur',
  'gamme', 'vram_taille', 'type_consommable', 'couleur', 'technologie', 'format_serveur',
];

/** A plausible value for each hardware key, so the filter actually matches something. */
const VALEURS: Record<string, string> = {
  marque: 'HP', format: 'M.2', cpu: 'i5', ram: '8', stockage: '256',
  format_cible: 'SFF', type_specifique: 'SSD', generation: '8', frequence_mhz: '2666',
  type_disque: 'SSD', interface: 'NVMe', format_physique: '2.5', capacite: '512',
  capacite_disque: '1To', taille_ecran: '15', taille_pouces: '24', resolution: '1920',
  frequence_hz: '60', type_dalle: 'IPS', puissance_w: '500', type_connecteur: 'USB',
  fondeur: 'Intel', gamme: 'EliteBook', vram_taille: '8', type_consommable: 'Toner',
  couleur: 'Noir', technologie: 'DDR4', format_serveur: 'Rack',
};

/** Every non-matrice family the filter module understands. */
const AUTRES: [string, string][] = [
  ['q', 'ssd'],
  ['reference_exacte', 'A16'],
  ['code_exact', 'P-0646'],
  ['grade', 'Grade A'],
  ['grades', 'Grade A,Grade B'],
  ['emplacement', 'vitrine'],
  ['emplacement', 'reserve'],
  ['statuts', 'en_vente'],
  ['statuts', 'recu,en_test'],
  ['categorie', 'Switches'],
  ['lot', '13'],
  ['sans_lot', '1'],
  ['du', '2026-01-01'],
  ['au', '2026-06-30'],
  ['plus30j', '1'],
  ['a_tarifer', '1'],
  ['a_classer', '1'],
  ['a_jeter', '1'],
  ['en_vitrine', '1'],
  ['poste_reseaux', '1'],
  ['sans_photo', '1'],
  ['sans_etiquette', '1'],
  ['tri', 'prix_vente_fixe'],
  ['ordre', 'desc'],
];

/** The three keys the export claims for itself. */
const CONTROLE = ['format_fichier', 'colonnes', 'scope'];

let echecs = 0;

/**
 * Compare two where-clauses ignoring the exact wall-clock instant.
 *
 * `plus30j` derives its threshold from `Date.now()` INSIDE each builder, and the
 * two builders are called a few hundred microseconds apart. When that straddles
 * a millisecond the two ISO strings differ and the clauses look unequal while
 * the counts are identical — a flake in this harness, not a defect in the code.
 * Timestamps are therefore normalised away; the counts still catch any real
 * divergence in what the clause selects.
 */
function normaliser(clause: unknown): string {
  return JSON.stringify(clause).replace(/"\d{4}-\d{2}-\d{2}T[\d:.]+Z"/g, '"<date>"');
}

async function comparer(nom: string, params: URLSearchParams) {
  const inventaire = construireFiltresProduits(params);
  const export_ = construireFiltresExport(params);

  const memeWhere = normaliser(inventaire) === normaliser(export_);

  let nInventaire = -1;
  let nExport = -1;
  try {
    [nInventaire, nExport] = await Promise.all([
      prisma.produit.count({ where: inventaire }),
      prisma.produit.count({ where: export_ }),
    ]);
  } catch (e: any) {
    console.log(`  ERREUR ${nom}: ${e.message}`);
    echecs++;
    return;
  }

  const ok = memeWhere && nInventaire === nExport;
  if (!ok) echecs++;
  const marque = ok ? 'ok  ' : 'ÉCHEC';
  console.log(
    `  ${marque} ${nom.padEnd(34)} inventaire=${String(nInventaire).padStart(5)}  export=${String(nExport).padStart(5)}` +
      (memeWhere ? '' : '   <-- WHERE DIFFÈRE')
  );
}

async function main() {
  const total = await prisma.produit.count();
  console.log(`catalogue : ${total} produits\n`);

  console.log('--- filtres techniques (champsMatrice) ---');
  for (const cle of CHAMPS_MATRICE) {
    const v = VALEURS[cle]!;
    await comparer(`${cle}=${v}`, new URLSearchParams({ [cle]: v }));
  }

  console.log('\n--- autres familles de filtres ---');
  for (const [cle, v] of AUTRES) {
    await comparer(`${cle}=${v}`, new URLSearchParams({ [cle]: v }));
  }
  await comparer('du + au', new URLSearchParams({ du: '2026-01-01', au: '2026-06-30' }));

  console.log("\n--- le filtre technique COMBINÉ aux params de contrôle de l'export ---");
  for (const f of FORMATS_FICHIER) {
    // Exactly what the corrected modal sends, plus real technical filters.
    const params = new URLSearchParams({
      colonnes: 'code_interne,reference,prix_achat',
      format_fichier: f,
      scope: 'filtres',
      cpu: 'i5',
      ram: '8',
    });
    await comparer(`cpu+ram avec format_fichier=${f}`, params);
  }

  console.log('\n--- les 3 clés de contrôle sont-elles inertes pour le filtre produit ? ---');
  for (const c of CONTROLE) {
    const avec = await prisma.produit.count({
      where: construireFiltresProduits(new URLSearchParams({ [c]: 'csv_excel' })),
    });
    const sans = await prisma.produit.count({
      where: construireFiltresProduits(new URLSearchParams({ [c]: 'zzz-inexistant' })),
    });
    // The baseline is NOT `total`: with no `statuts` parameter the default
    // masking (notIn vendu/hs/assemble) applies, so the reference count is 1616.
    // Inert means: the value carried makes no difference to the clause.
    const inerte = avec === sans;
    console.log(`  ${inerte ? 'ok  ' : 'ÉCHEC'} ${c.padEnd(16)} inerte : ${avec} identique à ${sans} (catalogue ${total})`);
    if (!inerte) echecs++;
  }

  console.log("\n--- le tri et l'ordre survivent-ils au nettoyage ? ---");
  const brut = new URLSearchParams({
    tri: 'prix_vente_fixe',
    ordre: 'desc',
    format_fichier: 'xlsx',
    colonnes: 'a,b',
    scope: 'filtres',
  });
  const net = construireParametresProduit(brut);
  const triOk = net.get('tri') === 'prix_vente_fixe' && net.get('ordre') === 'desc';
  console.log(`  ${triOk ? 'ok  ' : 'ÉCHEC'} tri/ordre conservés : ${JSON.stringify(Object.fromEntries(net))}`);
  if (!triOk) echecs++;

  console.log(`\n${echecs === 0 ? 'AUCUN ÉCART' : `${echecs} ÉCART(S) DÉTECTÉ(S)`}`);

  await sondageFacettesOrphelines();

  await prisma.$disconnect();
  if (echecs > 0) process.exit(1);
}

/**
 * Ten facets the filter drawer renders are ABSENT from `champsMatrice`, so the
 * server never reads them: the pill lights up and the list does not move.
 *
 * Adding them is not obviously right — their option values are display strings
 * ("Intel Core i5", "8Go", "256Go SSD"), and `champsMatrice` searches with
 * `contains` over reference / modele.nom / categorie. A key that is read but
 * matches nothing would be WORSE than one that is ignored, because it would look
 * like it worked. So: measure first, change nothing on a guess.
 */
async function sondageFacettesOrphelines() {
  const facettes: [string, string[]][] = [
    ['cpu_gamme', ['Intel Core i3', 'Intel Core i5', 'Intel Core i7', 'Intel Xeon', 'AMD Ryzen 5']],
    ['cpu_generation', ['4e / 5e Gen', '8e / 9e Gen', '12e / 13e Gen', '14e Gen+']],
    ['ram_taille', ['8Go', '16Go', '32Go', '64Go+']],
    ['stockage_principal', ['256Go SSD', '512Go SSD', '1To SSD', '1To HDD']],
    ['cpu_modele', ['Intel Core i5', 'Intel Core i7', 'AMD Ryzen 5', 'Apple M1/M2/M3']],
    ['clavier_layout', ['AZERTY Français', 'QWERTY US', 'QWERTY Arabe', 'Autre']],
    ['generation_serveur', ['Gen8 / 12G', 'Gen9 / 13G', 'Gen10 / 14G']],
    ['fonctions', ['Multifonction (3-en-1)', 'Recto-Verso Automatique', 'Wi-Fi Direct', 'Chargeur ADF']],
    ['taille_ecran_pos', ['10 pouces', '15 pouces']],
  ];

  console.log('\n=== facettes du tiroir ABSENTES de champsMatrice : que trouveraient-elles ? ===');
  console.log('(clause champsMatrice telle qu\'elle existe : contains sur reference / modele.nom / categorie)\n');

  for (const [cle, valeurs] of facettes) {
    let total = 0;
    const details: string[] = [];
    for (const v of valeurs) {
      const valPure = v.replace(/Go|GB|W|Hz|pouces|"/g, '').trim();
      const where = {
        OR: [
          { reference: { contains: v, mode: 'insensitive' as const } },
          { reference: { contains: valPure, mode: 'insensitive' as const } },
          { modele: { nom: { contains: v, mode: 'insensitive' as const } } },
          { modele: { nom: { contains: valPure, mode: 'insensitive' as const } } },
          { categorie: { contains: v, mode: 'insensitive' as const } },
          { categorie_rel: { nom: { contains: v, mode: 'insensitive' as const } } },
        ],
      };
      const n = await prisma.produit.count({ where });
      total += n;
      if (n > 0) details.push(`"${v}"→${n}`);
    }
    const verdict = total === 0 ? 'AUCUN MATCH si on l\'activait' : `matcherait ${total}`;
    console.log(`  ${cle.padEnd(20)} ${verdict}${details.length ? `   (${details.join(', ')})` : ''}`);
  }
}

main().catch(async (e) => {
  console.error('ÉCHEC:', e);
  await prisma.$disconnect();
  process.exit(1);
});
