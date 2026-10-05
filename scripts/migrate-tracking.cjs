/**
 * Aplica src/database/migrations/001_tracking_schema.sql (catálogos + viajes) usando pg.
 * Carga variables desde .env.local / .env si existen.
 *
 * Uso: npm run db:migrate:tracking
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const eq = trimmed.indexOf('=');
    if (eq <= 0) {
      continue;
    }

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function needsSsl(databaseUrl) {
  try {
    const hostname = new URL(databaseUrl).hostname;
    return (
      hostname !== 'localhost' &&
      hostname !== '127.0.0.1' &&
      !hostname.endsWith('railway.internal')
    );
  } catch {
    return false;
  }
}

function buildClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    return new Client({
      connectionString: databaseUrl,
      ssl: needsSsl(databaseUrl) ? { rejectUnauthorized: false } : false,
    });
  }

  const host = process.env.DB_HOST;
  const port = process.env.DB_PORT;
  const user = process.env.DB_USERNAME;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;

  if (!host || !port || !user || !database) {
    throw new Error(
      'Faltan variables de conexión. Defina DATABASE_URL o DB_HOST/DB_PORT/DB_USERNAME/DB_PASSWORD/DB_NAME.',
    );
  }

  return new Client({
    host,
    port: Number(port),
    user,
    password: password ?? '',
    database,
  });
}

async function main() {
  const root = path.resolve(__dirname, '..');
  loadEnvFile(path.join(root, '.env.local'));
  loadEnvFile(path.join(root, '.env'));

  const sqlPath = path.join(
    root,
    'src',
    'database',
    'migrations',
    '001_tracking_schema.sql',
  );
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = buildClient();
  await client.connect();

  try {
    await client.query(sql);
    console.log('Migración tracking aplicada:', path.relative(root, sqlPath));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error('Error al aplicar migración tracking:', error.message);
  process.exit(1);
});
