import { useCallback, useEffect, useState } from 'react';
import api from '../services/api';
import type { Tournament } from '../types';
import { StoredTournament, TournamentScores, toStoredTournament } from '../utils/tournament';

/**
 * The tenant's tournaments, backed by /api/tournaments (database first — the
 * list is not cached locally). `save` writes the whole tournament; callers
 * decide when (on every confirmed match, debounced while scores are entered).
 */
export function useTournaments() {
  const [list, setList] = useState<StoredTournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setList(await api.tournaments.getAll());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
  useEffect(() => { void load(); }, [load]);

  /** Resolves to false if the server did not take it (the caller tells the user). */
  const save = useCallback(async (t: Tournament, scores: TournamentScores = {}): Promise<boolean> => {
    const stored = toStoredTournament(t, scores);
    try {
      await api.tournaments.save(stored as unknown as { id: string } & Record<string, unknown>);
      setList(prev => [{ ...stored, updatedAt: Date.now() }, ...prev.filter(x => x.id !== t.id)]);
      return true;
    } catch {
      return false;
    }
  }, []);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      await api.tournaments.delete(id);
      setList(prev => prev.filter(x => x.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { list, loading, error, reload: load, save, remove };
}
