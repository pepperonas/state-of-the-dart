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
import { BackButton, Button, Card, PageShell } from '../common';

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
    <PageShell
      width="sm"
      back={false}
    >
        <BackButton onClick={() => navigate('/')} />

        <h1 className="m3-headline-medium text-on-surface mb-6">
          {t('resume.title')}
        </h1>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-on-surface" size={40} />
          </div>
        ) : isEmpty ? (
          <Card variant="filled" className="p-8 text-center">
            <Target size={48} className="text-on-surface-variant mx-auto mb-4" />
            <p className="m3-body-large text-on-surface-variant">{t('resume.no_matches')}</p>
          </Card>
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
                    className="mb-4"
                  >
                    <Card variant="elevated" className="p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="m3-title-medium text-on-surface truncate">
                            {generateMatchName(match.id)}
                          </h3>
                          <span
                            className={`m3-label-large text-xs px-2 py-0.5 rounded-m3-full shrink-0 ${
                              match.status === 'paused'
                                ? 'bg-tertiary-container text-on-tertiary-container'
                                : 'bg-primary-container text-on-primary-container'
                            }`}
                          >
                            {match.status === 'paused'
                              ? t('resume.paused')
                              : t('resume.in_progress')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-on-surface-variant m3-body-medium mb-1">
                          <Users size={14} />
                          <span>
                            {match.players.map((p) => p.name).join(' vs ')}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-on-surface-variant m3-body-medium mb-1">
                          <Target size={14} />
                          <span>
                            {match.settings.startScore || 501}
                            {match.settings.doubleOut !== false ? ' DO' : ''}
                            {' · '}
                            {getLegsProgress(match)}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-on-surface-variant m3-body-medium">
                          <Clock size={14} />
                          <span>{formatDate(match.startedAt)}</span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          variant="filled"
                          size="sm"
                          onClick={() => handleResume(match.id)}
                          disabled={loadingMatchId === match.id}
                          loading={loadingMatchId === match.id}
                          icon={<Play size={16} />}
                        >
                          {t('resume.continue')}
                        </Button>

                        {confirmDeleteId === match.id ? (
                          <div className="flex gap-1">
                            <Button
                              variant="danger"
                              size="sm"
                              fullWidth
                              onClick={() => handleDelete(match.id)}
                              disabled={deletingMatchId === match.id}
                              loading={deletingMatchId === match.id}
                            >
                              {t('resume.confirm_delete')}
                            </Button>
                            <Button
                              variant="text"
                              size="sm"
                              onClick={() => setConfirmDeleteId(null)}
                            >
                              {t('common.cancel')}
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setConfirmDeleteId(match.id)}
                            icon={<Trash2 size={16} />}
                          >
                            {t('resume.delete')}
                          </Button>
                        )}
                      </div>
                    </div>
                    </Card>
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
                  className="mb-4"
                >
                  <Card variant="elevated" className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="m3-title-medium text-on-surface truncate">
                          {getGameTypeLabel(game.gameType)}
                        </h3>
                        <span className="m3-label-large text-xs px-2 py-0.5 rounded-m3-full shrink-0 bg-secondary-container text-on-secondary-container">
                          {t('resume.local_game')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-on-surface-variant m3-body-medium mb-1">
                        <Users size={14} />
                        <span>{game.players.join(' vs ')}</span>
                      </div>

                      {game.progressText && (
                        <div className="flex items-center gap-1.5 text-on-surface-variant m3-body-medium mb-1">
                          <Target size={14} />
                          <span>{getProgressText(game)}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-on-surface-variant m3-body-medium">
                        <Clock size={14} />
                        <span>{formatDate(game.savedAt)}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        variant="filled"
                        size="sm"
                        onClick={() => handleResumeLocal(game)}
                        icon={<Play size={16} />}
                      >
                        {t('resume.continue')}
                      </Button>

                      {confirmDeleteId === deleteKey ? (
                        <div className="flex gap-1">
                          <Button
                            variant="danger"
                            size="sm"
                            fullWidth
                            onClick={() => handleDeleteLocal(game.storageKey)}
                          >
                            {t('resume.confirm_delete')}
                          </Button>
                          <Button
                            variant="text"
                            size="sm"
                            onClick={() => setConfirmDeleteId(null)}
                          >
                            {t('common.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => setConfirmDeleteId(deleteKey)}
                          icon={<Trash2 size={16} />}
                        >
                          {t('resume.delete')}
                        </Button>
                      )}
                    </div>
                  </div>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
        </PageShell>
  );
};

export default ResumeGameScreen;
