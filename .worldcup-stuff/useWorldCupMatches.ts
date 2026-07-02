// src/hooks/useWorldCupMatches.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import { getFixturesByDate, getLiveFixtures, Fixture } from '../services/footballApi';

const TODAY_POLL_MS = 5 * 60 * 1000; // 5 min — today's fixtures, low churn
const LIVE_POLL_MS = 45 * 1000; // 45s — only while something is actually live

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function useWorldCupMatches() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasLive = fixtures.some((f) =>
    ['1H', 'HT', '2H', 'ET', 'P', 'LIVE'].includes(f.fixture.status.short)
  );

  const fetchOnce = useCallback(async () => {
    try {
      setError(null);
      const data = hasLive ? await getLiveFixtures() : await getFixturesByDate(todayISO());
      setFixtures(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [hasLive]);

  useEffect(() => {
    fetchOnce();

    const interval = hasLive ? LIVE_POLL_MS : TODAY_POLL_MS;
    pollRef.current = setInterval(fetchOnce, interval);

    // pause polling when app is backgrounded
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') fetchOnce();
    });

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
      sub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasLive]);

  return { fixtures, loading, error, hasLive, refetch: fetchOnce };
}
