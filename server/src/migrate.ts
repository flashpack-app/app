import fs from 'fs';
import path from 'path';
import { pool, query } from './db';
import { generateInviteCode } from './codes';

async function ensureGenesisCodes(target: number) {
  const rows = await query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM genesis_codes WHERE used = FALSE`);
  const open = parseInt(rows[0]?.count ?? '0', 10);
  const need = Math.max(0, target - open);
  if (need === 0) return [];

  const created: string[] = [];
  for (let i = 0; i < need; i++) {
    const code = generateInviteCode();
    try {
      await query(`INSERT INTO genesis_codes(code) VALUES ($1)`, [code]);
      created.push(code);
    } catch (e: any) {
      if (e?.code !== '23505') throw e; // duplicate -> retry
      i--;
    }
  }
  return created;
}

async function upsertAdmin() {
  const username = 'korybantes';
  const email = 'toptutanertac@gmail.com';

  const existing = await query<{ id: string; invite_code: string }>(
    'SELECT id, invite_code FROM users WHERE username = $1',
    [username],
  );
  if (existing.length) {
    await query(
      `UPDATE users SET email = $1, is_admin = TRUE, invite_slots = GREATEST(invite_slots, 25) WHERE username = $2`,
      [email, username],
    );
    console.log(`admin promoted: @${username} (${existing[0].invite_code}) email=${email}`);
    return;
  }

  let code = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const exists = await query(
      `SELECT 1 FROM users WHERE invite_code = $1 UNION SELECT 1 FROM genesis_codes WHERE code = $1`,
      [code],
    );
    if (!exists.length) break;
    code = generateInviteCode();
  }

  await query(
    `INSERT INTO users(username, email, invite_code, is_admin, invite_slots)
     VALUES ($1, $2, $3, TRUE, 25)`,
    [username, email, code],
  );
  console.log(`admin created: @${username} email=${email} invite_code=${code}`);
  console.log(`  → sign in with: username "${username}"`);
}

async function migrateSeparator() {
  // One-shot: rewrite legacy `·` codes to `-` so phone keyboards can type them.
  const u = await pool.query(
    `UPDATE users SET invite_code = REPLACE(invite_code, '·', '-') WHERE invite_code LIKE '%·%' RETURNING id`,
  );
  const g = await pool.query(
    `UPDATE genesis_codes SET code = REPLACE(code, '·', '-') WHERE code LIKE '%·%' RETURNING code`,
  );
  if (u.rowCount || g.rowCount) {
    console.log(`separator migration: ${u.rowCount} user codes, ${g.rowCount} genesis codes updated.`);
  }
}

async function fixCommentReportsTable() {
  // Fix comment_reports table if it was created with wrong foreign key reference
  try {
    // Check if table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'comment_reports'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      // Drop and recreate with correct foreign key
      await pool.query('DROP TABLE IF EXISTS comment_reports CASCADE');
      console.log('comment_reports table dropped for migration');
    }
  } catch (e) {
    // Table might not exist yet, which is fine
    console.log('comment_reports migration check skipped');
  }
}

export async function applySchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
}

export async function bootstrap() {
  await fixCommentReportsTable();
  await applySchema();
  console.log('schema applied.');

  await migrateSeparator();
  await upsertAdmin();

  const newCodes = await ensureGenesisCodes(10);
  if (newCodes.length) {
    console.log('seeded genesis invite codes:');
    for (const c of newCodes) console.log('  ' + c);
  }
}

export async function showGenesisCodes() {
  const all = await query<{ code: string; used: boolean }>(`SELECT code, used FROM genesis_codes ORDER BY used, code`);
  console.log('\ncurrent genesis codes:');
  for (const r of all) console.log(`  ${r.used ? '[used] ' : '[open] '}${r.code}`);
}
