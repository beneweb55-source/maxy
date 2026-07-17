import { existsSync } from "node:fs";
import { join } from "node:path";
import EmbeddedPostgres from "embedded-postgres";

const PORT = 5433;
const DB = "gestion_maxy";
const DOSSIER_DONNEES = "./.pgdata";

const pg = new EmbeddedPostgres({
  databaseDir: DOSSIER_DONNEES,
  user: "maxy",
  password: "maxy",
  port: PORT,
  persistent: true,
});

try {
  if (!existsSync(join(DOSSIER_DONNEES, "PG_VERSION"))) {
    console.log("Initialisation du cluster PostgreSQL…");
    await pg.initialise();
  }
  await pg.start();

  const client = pg.getPgClient();
  await client.connect();
  const existe = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [DB]);
  if (existe.rowCount === 0) {
    await pg.createDatabase(DB);
  }
  await client.end();

  console.log(`PostgreSQL prêt : postgresql://maxy:maxy@localhost:${PORT}/${DB}`);
  console.log("Laissez ce terminal ouvert. Ctrl+C pour arrêter la base.");
} catch (e) {
  console.error("Impossible de démarrer PostgreSQL :", e);
  await pg.stop().catch(() => undefined);
  process.exit(1);
}

async function arreter() {
  console.log("\nArrêt de PostgreSQL…");
  await pg.stop().catch(() => undefined);
  process.exit(0);
}
process.on("SIGINT", () => void arreter());
process.on("SIGTERM", () => void arreter());
