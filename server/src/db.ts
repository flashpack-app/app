import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Local Postgres (dev, e.g. a Docker container) doesn't speak SSL, so detect a
// local/non-SSL target and turn SSL off for it. Managed Postgres (Neon in prod)
// is untouched: SSL stays on with sslmode=verify-full appended.
const raw = process.env.DATABASE_URL!;
const isLocal =
  /@(localhost|127\.0\.0\.1|postgres|host\.docker\.internal)[:/]/.test(raw) ||
  raw.includes('sslmode=disable');

const connectionString = isLocal || raw.includes('sslmode=')
  ? raw
  : `${raw}&sslmode=verify-full`;

export const pool = new Pool({
  connectionString,
  ssl: isLocal ? false : { rejectUnauthorized: false },
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}
