import { Pool } from 'pg';
import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not set');
}

// Ensure sslmode is explicitly set to verify-full to avoid deprecation warning
const connectionString = process.env.DATABASE_URL?.includes('sslmode=')
  ? process.env.DATABASE_URL
  : `${process.env.DATABASE_URL}&sslmode=verify-full`;

export const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

export async function query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
  const res = await pool.query(sql, params);
  return res.rows as T[];
}
