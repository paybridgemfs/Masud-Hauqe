import fs from 'node:fs';
import path from 'node:path';

// Load .env into process.env when running standalone CLI script
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

async function main() {
  const { ensureDatabaseInitialized } = await import('../lib/db.js');
  const { syncStateToPostgres, getPgPool } = await import('../lib/postgres-sync.js');

  console.log('Running PostgreSQL schema migration and idempotent seed...');
  const state = await ensureDatabaseInitialized();
  await syncStateToPostgres(state);

  const pool = getPgPool();
  if (pool) {
    const client = await pool.connect();
    try {
      const tablesRes = await client.query(
        `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name ASC`
      );
      console.log('PostgreSQL tables present in public schema:', tablesRes.rows.map((r) => r.table_name));
    } finally {
      client.release();
      await pool.end();
    }
  }

  console.log('Database initialized and synced successfully.');
  console.log(`Default Artist: ${state.artists?.[0]?.name} (${state.artists?.[0]?.slug})`);
  console.log(`Admin count: ${state.admins?.length || 0}`);
}

main().catch((err) => {
  console.error('Database seed failed:', err);
  process.exit(1);
});
