// src/services/footballApi.ts
//
// Thin wrapper around api-sports.io (API-Football v3).
// Docs: https://www.api-football.com/documentation-v3
//
// SECURITY NOTE: EXPO_PUBLIC_ vars are bundled into the client JS and are
// readable by anyone who inspects the app. Fine for a low-stakes free-tier
// scores API; if this app grows revenue/scale, move this call behind a
// tiny backend proxy (Vercel/Cloudflare function) instead.

const BASE_URL = 'https://v3.football.api-sports.io';
const API_KEY = process.env.EXPO_PUBLIC_FOOTBALL_API_KEY;

// FIFA World Cup competition id in API-Football
export const WORLD_CUP_LEAGUE_ID = 1;
export const WORLD_CUP_SEASON = 2026;

// Free tier: 100 requests/day. Don't poll aggressively — see useWorldCupMatches.

export type FixtureStatus =
  | 'TBD' | 'NS' // not started
  | '1H' | 'HT' | '2H' | 'ET' | 'P' | 'LIVE' // in progress
  | 'FT' | 'AET' | 'PEN' // finished
  | 'PST' | 'CANC' | 'ABD' | 'AWD' | 'WO'; // postponed/cancelled/etc

export interface Fixture {
  fixture: {
    id: number;
    date: string;
    status: { short: FixtureStatus; elapsed: number | null };
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

interface FixturesResponse {
  response: Fixture[];
}

async function callApi<T>(path: string, params: Record<string, string | number>): Promise<T> {
  if (!API_KEY) {
    throw new Error(
      'Missing EXPO_PUBLIC_FOOTBALL_API_KEY — add it to your .env (see .env.example)'
    );
  }

  const query = new URLSearchParams(
    Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)]))
  ).toString();

  const res = await fetch(`${BASE_URL}${path}?${query}`, {
    headers: { 'x-apisports-key': API_KEY },
  });

  if (!res.ok) {
    throw new Error(`API-Football request failed: ${res.status} ${res.statusText}`);
  }

  return res.json();
}

/** Fixtures for a given date (YYYY-MM-DD), World Cup 2026 only. */
export async function getFixturesByDate(dateISO: string): Promise<Fixture[]> {
  const data = await callApi<FixturesResponse>('/fixtures', {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    date: dateISO,
  });
  return data.response;
}

/** Live World Cup fixtures right now. */
export async function getLiveFixtures(): Promise<Fixture[]> {
  const data = await callApi<FixturesResponse>('/fixtures', {
    league: WORLD_CUP_LEAGUE_ID,
    season: WORLD_CUP_SEASON,
    live: 'all',
  });
  return data.response;
}
