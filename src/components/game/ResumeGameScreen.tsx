import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Play, Trash2, Clock, Users, Target, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../services/api';
import { useGame } from '../../context/GameContext';
import { generateMatchName } from '../../utils/matchNames';
import { reconstructMatch } from '../../utils/matchReconstruction';
import { getLocalGameSummaries, clearGameState, LocalGameSummary } from '../../utils/gameStorage';

interface ResumableMatch {
  id: string;
  type: string;
  status: string;
  startedAt: number;
  settings: {
    startScore?: number;
    legsToWin?: number;
    doubleOut?: boolean;
  };
  players: Array<{
    playerId: string;
    name: string;
    isBot?: boolean;
    botLevel?: number;
    legsWon: number;
  }>;
}

type ResumableItem =
  | { kind: 'api'; match: ResumableMatch; timestamp: number }
  | { kind: 'local'; game: LocalGameSummary; timestamp: number };

const ResumeGameScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { state, dispatch, loadMatchFromDb } = useGame();

  const [matches, setMatches] = useState<ResumableMatch[]>([]);
  const [localGames, setLocalGames] = useState<LocalGameSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMatchId, setLoadingMatchId] = useState<string | null>(null);
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    // Load localStorage games synchronously
    setLocalGames(getLocalGameSummaries());

    try {
      const data = await api.matches.getResumable();
      setMatches(data as ResumableMatch[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  // Merge and sort all items by timestamp (newest first)
  const allItems: ResumableItem[] = [
    ...matches.map((m): ResumableItem => ({
      kind: 'api',
      match: m,
      timestamp: m.startedAt < 10000000000 ? m.startedAt * 1000 : m.startedAt,
    })),
    ...localGames.map((g): ResumableItem => ({
      kind: 'local',
      game: g,
      timestamp: g.savedAt,
    })),
  ].sort((a, b) => b.timestamp - a.timestamp);

  const handleResume = async (matchId: string) => {
    setLoadingMatchId(matchId);
    try {
      const fullMatch = await api.matches.getById(matchId);
      const match = reconstructMatch(fullMatch);
      loadMatchFromDb(matchId);
      dispatch({ type: 'LOAD_MATCH', payload: match });
      navigate('/game?resume=1');
    } catch {
      setLoadingMatchId(null);
    }
  };

  const handleResumeLocal = (game: LocalGameSummary) => {
    navigate(game.route);
  };

  const handleDelete = async (matchId: string) => {
    setDeletingMatchId(matchId);
    try {
      await api.matches.delete(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
    } catch {
      // silently fail
    } finally {
      setDeletingMatchId(null);
      setConfirmDeleteId(null);
    }
  };

  const handleDeleteLocal = (storageKey: string) => {
    clearGameState(storageKey);
    setLocalGames((prev) => prev.filter((g) => g.storageKey !== storageKey));
    setConfirmDeleteId(null);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts < 10000000000 ? ts * 1000 : ts);
    return d.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLegsProgress = (match: ResumableMatch) => {
    const legsToWin = match.settings.legsToWin || 3;
    const scores = match.players.map((p) => `${p.legsWon}`).join(' : ');
    return `${scores} (Best of ${legsToWin * 2 - 1})`;
  };

  const getGameTypeLabel = (gameType: LocalGameSummary['gameType']) => {
    switch (gameType) {
      case 'around-the-clock': return t('resume.game_type_atc');
      case 'shanghai': return t('resume.game_type_shanghai');
      case 'cricket': return t('resume.game_type_cricket');
    }
  };

  const getProgressText = (game: LocalGameSummary) => {
    switch (game.gameType) {
      case 'around-the-clock': {
        const [done, total] = game.progressText.split('/');
        return t('resume.progress_atc', { done, total });
      }
      case 'shanghai': {
        const [current, total] = game.progressText.split('/');
        return t('resume.progress_shanghai', { current, total });
      }
      case 'cricket':
        return t('resume.progress_cricket');
    }
  };

  const isEmpty = matches.length === 0 && localGames.length === 0;

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="text-3xl font-bold text-white mb-6">
          {t('resume.title')}
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-white" size={40} />
          </div>
        ) : isEmpty ? (
          <div className="glass-card rounded-2xl p-8 text-center">
            <Target size={48} className="text-dark-400 mx-auto mb-4" />
            <p className="text-dark-300 text-lg">{t('resume.no_matches')}</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {allItems.map((item, index) => {
              if (item.kind === 'api') {
                const match = item.match;
                return (
                  <motion.div
                    key={match.id}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    className="glass-card rounded-2xl p-5 mb-4 border border-white/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-white truncate">
                            {generateMatchName(match.id)}
                          </h3>
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
                              match.status === 'paused'
                                ? 'bg-amber-500/20 text-amber-400'
                                : 'bg-primary-500/20 text-primary-400'
                            }`}
                          >
                            {match.status === 'paused'
                              ? t('resume.paused')
                              : t('resume.in_progress')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-dark-300 text-sm mb-1">
                          <Users size={14} />
                          <span>
                            {match.players.map((p) => p.name).join(' vs ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-dark-400 text-sm mb-1">
                          <Target size={14} />
                          <span>
                            {match.settings.startScore || 501}
                            {match.settings.doubleOut !== false ? ' DO' : ''}
                            {' · '}
                            {getLegsProgress(match)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-dark-400 text-sm">
                          <Clock size={14} />
                          <span>{formatDate(match.startedAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => handleResume(match.id)}
                          disabled={loadingMatchId === match.id}
                          className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                          {loadingMatchId === match.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <Play size={16} />
                          )}
                          {t('resume.continue')}
                        </button>

                        {confirmDeleteId === match.id ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleDelete(match.id)}
                              disabled={deletingMatchId === match.id}
                              className="flex-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {deletingMatchId === match.id ? '...' : t('resume.confirm_delete')}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1.5 bg-dark-600 hover:bg-dark-500 text-white rounded text-xs transition-colors"
                            >
                              {t('common.cancel')}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(match.id)}
                            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 rounded-lg text-sm transition-colors"
                          >
                            <Trash2 size={16} />
                            {t('resume.delete')}
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              }

              // Local game card
              const game = item.game;
              const deleteKey = `local-${game.storageKey}`;

              return (
                <motion.div
                  key={game.storageKey}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -100 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="glass-card rounded-2xl p-5 mb-4 border border-white/5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {getGameTypeLabel(game.gameType)}
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0 bg-cyan-500/20 text-cyan-400">
                          {t('resume.local_game')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-dark-300 text-sm mb-1">
                        <Users size={14} />
                        <span>{game.players.join(' vs ')}</span>
                      </div>

                      {game.progressText && (
                        <div className="flex items-center gap-1.5 text-dark-400 text-sm mb-1">
                          <Target size={14} />
                          <span>{getProgressText(game)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-dark-400 text-sm">
                        <Clock size={14} />
                        <span>{formatDate(game.savedAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleResumeLocal(game)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Play size={16} />
                        {t('resume.continue')}
                      </button>

                      {confirmDeleteId === deleteKey ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDeleteLocal(game.storageKey)}
                            className="flex-1 px-2 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded text-xs font-medium transition-colors"
                          >
                            {t('resume.confirm_delete')}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 bg-dark-600 hover:bg-dark-500 text-white rounded text-xs transition-colors"
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(deleteKey)}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400/70 hover:text-red-400 rounded-lg text-sm transition-colors"
                        >
                          <Trash2 size={16} />
                          {t('resume.delete')}
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

export default ResumeGameScreen;
