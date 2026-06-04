import React, { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Target, Award, ChevronDown, ChevronUp, TrendingUp, Loader, Search, ChevronLeft, ChevronRight, Clock, Users, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Match, Throw } from '../../types';
import { formatDate, getTimestampForSort } from '../../utils/dateUtils';
import { api } from '../../services/api';

const MatchChart = lazy(() => import('./MatchChart'));
import { DartboardHeatmapBlur } from '../dartboard/DartboardHeatmapBlur';
import PlayerAvatar from '../player/PlayerAvatar';
import { BackButton, Card, Chip, TextField, IconButton, Button } from '../common';
import { staggerChild } from '../../utils/motion';

const MatchHistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMatch, setExpandedMatch] = useState<string | null>(null);
  const [matchDetails, setMatchDetails] = useState<Record<string, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [gameTypeFilter, setGameTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  // Load all matches
  useEffect(() => {
    const loadMatches = async () => {
      setLoading(true);
      try {
        const data = await api.matches.getAll({ limit: '500' });
        setMatches(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load matches:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMatches();
  }, []);

  // Get unique game types for filter
  const gameTypes = useMemo(() => {
    const types = new Set(matches.map(m => m.type || 'x01'));
    return ['all', ...Array.from(types)];
  }, [matches]);

  // Sort and filter matches
  const filteredMatches = useMemo(() => {
    let result = [...matches]
      .filter(m => m.status === 'completed')
      .sort((a, b) => getTimestampForSort(b.startedAt) - getTimestampForSort(a.startedAt));

    if (gameTypeFilter !== 'all') {
      result = result.filter(m => (m.type || 'x01') === gameTypeFilter);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(match => {
        const players = match.players || [];
        const dateStr = formatDate(match.startedAt).toLowerCase();
        return (
          players.some(p => p.name?.toLowerCase().includes(query)) ||
          dateStr.includes(query) ||
          (match.type || '').toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [matches, gameTypeFilter, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredMatches.length / itemsPerPage);
  const paginatedMatches = filteredMatches.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  useEffect(() => { setCurrentPage(1); }, [searchQuery, gameTypeFilter]);

  // Load match details
  const toggleMatch = useCallback(async (matchId: string) => {
    if (expandedMatch === matchId) {
      setExpandedMatch(null);
      return;
    }
    setExpandedMatch(matchId);
    if (!matchDetails[matchId] && !loadingDetails[matchId]) {
      setLoadingDetails(prev => ({ ...prev, [matchId]: true }));
      try {
        const detail = await api.matches.getById(matchId);
        setMatchDetails(prev => ({ ...prev, [matchId]: detail }));
      } catch (error) {
        console.error('Failed to load match details:', error);
      } finally {
        setLoadingDetails(prev => ({ ...prev, [matchId]: false }));
      }
    }
  }, [expandedMatch, matchDetails, loadingDetails]);

  // Chart data from match detail
  const prepareChartData = (detail: any) => {
    const legs = detail.legs || [];
    const players = detail.players || [];
    if (legs.length === 0 || players.length === 0) return [];

    const allThrows: Throw[] = [];
    legs.forEach((leg: any) => {
      (leg.throws || []).forEach((t: any) => allThrows.push(t));
    });

    const sorted = allThrows.sort((a, b) => getTimestampForSort(a.timestamp) - getTimestampForSort(b.timestamp));
    const playerRounds: Record<string, { round: number; score: number }[]> = {};

    players.forEach((p: any) => {
      const pt = sorted.filter((t: any) => t.playerId === p.playerId);
      const rounds: { round: number; score: number }[] = [];
      pt.forEach((t: any, i: number) => {
        const rn = Math.floor(i / 3) + 1;
        const existing = rounds.find(r => r.round === rn);
        if (existing) existing.score += (t.score ?? 0);
        else rounds.push({ round: rn, score: t.score ?? 0 });
      });
      playerRounds[p.playerId] = rounds;
    });

    const maxRounds = Math.max(...Object.values(playerRounds).map(r => r.length), 0);
    const data = [];
    for (let i = 1; i <= maxRounds; i++) {
      const point: any = { round: i };
      players.forEach((p: any) => {
        point[p.playerId] = playerRounds[p.playerId]?.find(r => r.round === i)?.score || 0;
      });
      data.push(point);
    }
    return data;
  };

  // Build heatmap from match throws
  const buildMatchHeatmap = (detail: any, playerId: string): Record<string, number> => {
    const segments: Record<string, number> = {};
    const legs = detail.legs || [];
    legs.forEach((leg: any) => {
      (leg.throws || []).forEach((t: any) => {
        if (t.playerId !== playerId) return;
        (t.darts || []).forEach((d: any) => {
          const key = `${d.multiplier}-${d.segment}`;
          segments[key] = (segments[key] || 0) + 1;
        });
      });
    });
    return segments;
  };

  const formatDuration = (match: Match) => {
    const start = getTimestampForSort(match.startedAt);
    const end = getTimestampForSort(match.completedAt);
    if (!start || !end || start === 0 || end === 0) return null;
    const mins = Math.round((end - start) / 60000);
    if (mins < 1) return '<1 min';
    if (mins < 60) return `${mins} min`;
    return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  };

  const getGameTypeLabel = (type: string) => {
    switch (type) {
      case 'x01': return 'X01';
      case 'cricket': return 'Cricket';
      case 'around-the-clock': return 'Around the Clock';
      case 'shanghai': return 'Shanghai';
      default: return type || 'X01';
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh p-4 md:p-8 gradient-mesh flex items-center justify-center">
        <Loader className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <BackButton onClick={() => { window.location.href = '/'; }} />

        <h1 className="m3-headline-medium font-bold text-on-surface mb-6">{t('match_history.title', 'Spielhistorie')}</h1>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          {/* Search */}
          <TextField
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('match_history.search_placeholder', 'Spieler, Datum oder Spieltyp suchen...')}
            icon={<Search size={18} />}
          />

          {/* Game type filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Filter size={16} className="text-on-surface-variant" />
            {gameTypes.map(type => (
              <Chip
                key={type}
                selected={gameTypeFilter === type}
                onClick={() => setGameTypeFilter(type)}
              >
                {type === 'all' ? t('match_history.all_types', 'Alle Spieltypen') : getGameTypeLabel(type)}
              </Chip>
            ))}
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="m3-body-small text-on-surface-variant">{t('match_history.showing', 'Zeige')}:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 rounded-m3-sm border border-outline-variant bg-surface-container text-on-surface m3-body-small"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="m3-body-small text-on-surface-variant">
                {t('match_history.of', 'von')} {filteredMatches.length} {t('match_history.matches', 'Matches')}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <IconButton
                  variant="outlined"
                  label={t('common.previous', 'Zurück')}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft size={16} />
                </IconButton>
                {Array.from({ length: Math.min(3, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 3) pageNum = i + 1;
                  else if (currentPage <= 2) pageNum = i + 1;
                  else if (currentPage >= totalPages - 1) pageNum = totalPages - 2 + i;
                  else pageNum = currentPage - 1 + i;
                  return (
                    <Button
                      key={pageNum}
                      size="sm"
                      variant={currentPage === pageNum ? 'tonal' : 'text'}
                      onClick={() => setCurrentPage(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                <IconButton
                  variant="outlined"
                  label={t('common.next', 'Weiter')}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight size={16} />
                </IconButton>
              </div>
            )}
          </div>
        </div>

        {/* Match list */}
        {filteredMatches.length === 0 ? (
          <Card variant="elevated" className="p-12 text-center">
            <Target size={48} className="mx-auto mb-3 text-on-surface-variant opacity-30" />
            <p className="text-on-surface-variant m3-body-large">{searchQuery ? t('match_history.no_results', 'Keine Matches gefunden') : t('match_history.no_matches', 'Noch keine abgeschlossenen Spiele')}</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {paginatedMatches.map((match, index) => {
              const players = match.players || [];
              const isExpanded = expandedMatch === match.id;
              const detail = matchDetails[match.id];
              const duration = formatDuration(match);
              const winnerPlayer = players.find(p => p.playerId === match.winner);

              return (
                <motion.div key={match.id} {...staggerChild(Math.min(index, 12))}>
                <Card variant="elevated" className="overflow-hidden">
                  {/* Match summary row */}
                  <button
                    onClick={() => toggleMatch(match.id)}
                    className="m3-state-layer w-full p-4 flex items-center gap-4 text-left"
                  >
                    {/* Game type badge */}
                    <div className="px-2.5 py-1 rounded-m3-sm bg-primary-container text-on-primary-container m3-label-large font-bold flex-shrink-0">
                      {getGameTypeLabel(match.type || 'x01')}
                    </div>

                    {/* Players */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-on-surface m3-title-medium truncate">
                        {players.map(p => p.name).join(' vs ')}
                      </div>
                      <div className="m3-body-small text-on-surface-variant flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(match.startedAt)}
                        </span>
                        {duration && (
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {duration}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Users size={12} />
                          {players.length}
                        </span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="m3-body-medium text-on-surface-variant flex-shrink-0 hidden sm:block">
                      {players.map((p, i) => (
                        <span key={p.playerId}>
                          {i > 0 && ' : '}
                          <span className={p.playerId === match.winner ? 'text-success font-bold' : ''}>
                            {p.legsWon}
                          </span>
                        </span>
                      ))}
                    </div>

                    {/* Winner badge */}
                    {winnerPlayer && (
                      <div className="px-2 py-0.5 rounded-m3-sm bg-success-container text-on-success-container m3-label-large font-bold flex-shrink-0 hidden md:block">
                        {winnerPlayer.name}
                      </div>
                    )}

                    {isExpanded ? <ChevronUp size={18} className="text-on-surface-variant flex-shrink-0" /> : <ChevronDown size={18} className="text-on-surface-variant flex-shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-outline-variant p-4 space-y-6">
                      {loadingDetails[match.id] ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader className="animate-spin text-primary" size={32} />
                        </div>
                      ) : detail ? (
                        <>
                          {/* Player stats grid */}
                          <div className={`grid gap-4 ${{ 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3' }[Math.min(players.length, 3)] || 'md:grid-cols-3'}`}>
                            {(detail.players || players).map((p: any) => (
                              <div key={p.playerId} className={`rounded-m3-lg p-4 ${p.playerId === match.winner ? 'bg-success-container/40 border border-success' : 'bg-surface-container border border-outline-variant'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                  <PlayerAvatar avatar={p.avatar} name={p.name} size="sm" />
                                  <div>
                                    <div className="font-bold text-on-surface m3-title-medium">{p.name}</div>
                                    {p.playerId === match.winner && (
                                      <span className="m3-body-small text-success font-semibold">{t('match_history.winner')}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <StatBox label="Average" value={(p.matchAverage ?? 0).toFixed(1)} />
                                  <StatBox label="Legs" value={p.legsWon ?? 0} />
                                  <StatBox label="180s" value={p.match180s ?? 0} />
                                  <StatBox label="High" value={p.matchHighestScore ?? 0} />
                                  <StatBox label="140+" value={p.match140Plus ?? 0} />
                                  <StatBox
                                    label="Checkout %"
                                    value={
                                      (p.checkoutAttempts ?? 0) > 0
                                        ? `${(((p.checkoutsHit ?? 0) / p.checkoutAttempts) * 100).toFixed(0)}%`
                                        : '-'
                                    }
                                  />
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Round-by-round chart */}
                          {(() => {
                            const chartData = prepareChartData(detail);
                            if (chartData.length === 0) return null;
                            return (
                              <Card variant="filled" className="p-4">
                                <h4 className="font-bold text-on-surface mb-3 flex items-center gap-2 m3-title-medium">
                                  <TrendingUp size={16} className="text-primary" />
                                  {t('match_history.round_chart', 'Runden-Verlauf')}
                                </h4>
                                <Suspense fallback={<div className="h-[180px] sm:h-[250px] flex items-center justify-center text-on-surface-variant m3-body-small">Lade…</div>}>
                                  <MatchChart data={chartData} players={detail.players || players} />
                                </Suspense>
                              </Card>
                            );
                          })()}

                          {/* Per-player heatmaps */}
                          <div className={`grid gap-4 ${players.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                            {(detail.players || players).map((p: any) => {
                              const segments = buildMatchHeatmap(detail, p.playerId);
                              const totalDarts = Object.values(segments).reduce((s: number, v: any) => s + (v as number), 0);
                              if (totalDarts === 0) return null;
                              return (
                                <Card key={p.playerId} variant="filled" className="p-4">
                                  <h4 className="font-bold text-on-surface mb-3 m3-title-medium flex items-center gap-2">
                                    <Target size={16} className="text-primary" />
                                    {t('match_history.heatmap')} — {p.name}
                                  </h4>
                                  <div className="flex justify-center">
                                    <DartboardHeatmapBlur
                                      heatmapData={{ playerId: p.playerId, segments, totalDarts, lastUpdated: new Date() }}
                                      size={220}
                                    />
                                  </div>
                                </Card>
                              );
                            })}
                          </div>

                          {/* Leg breakdown */}
                          {detail.legs && detail.legs.length > 0 && (
                            <Card variant="filled" className="p-4">
                              <h4 className="font-bold text-on-surface mb-3 m3-title-medium">{t('match_history.leg_breakdown')}</h4>
                              <div className="flex gap-2 flex-wrap">
                                {detail.legs.map((leg: any, idx: number) => {
                                  const legWinner = players.find((p: any) => p.playerId === leg.winner);
                                  return (
                                    <div
                                      key={leg.id || idx}
                                      className={`px-3 py-1.5 rounded-m3-sm m3-body-small font-semibold ${
                                        legWinner
                                          ? 'bg-success-container text-on-success-container'
                                          : 'bg-surface-container-highest text-on-surface-variant'
                                      }`}
                                    >
                                      {t('match_history.leg_number', { number: idx + 1 })}: {legWinner?.name || '?'}
                                    </div>
                                  );
                                })}
                              </div>
                            </Card>
                          )}

                          {/* Throw history (collapsible) */}
                          <ThrowHistory detail={detail} players={detail.players || players} />
                        </>
                      ) : (
                        <div className="text-center py-8 text-on-surface-variant m3-body-medium">
                          {t('match_history.no_details', 'Details konnten nicht geladen werden')}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Collapsible throw history
const ThrowHistory: React.FC<{ detail: any; players: any[] }> = ({ detail, players }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const legs = detail.legs || [];
  if (legs.length === 0) return null;

  // Get unique player IDs in throw order
  const playerIds: string[] = [];
  for (const leg of legs) {
    for (const thr of (leg.throws || [])) {
      if (!playerIds.includes(thr.playerId)) {
        playerIds.push(thr.playerId);
      }
    }
  }

  const getPlayerName = (pid: string) => {
    const p = players.find((pl: any) => pl.playerId === pid);
    return p?.name || '?';
  };

  // Group throws into rounds (one throw per player per round)
  const groupIntoRounds = (throws: any[]) => {
    const rounds: any[][] = [];
    let currentRound: any[] = [];
    let seenInRound = new Set<string>();

    for (const thr of throws) {
      if (seenInRound.has(thr.playerId)) {
        rounds.push(currentRound);
        currentRound = [thr];
        seenInRound = new Set([thr.playerId]);
      } else {
        currentRound.push(thr);
        seenInRound.add(thr.playerId);
      }
    }
    if (currentRound.length > 0) rounds.push(currentRound);
    return rounds;
  };

  const formatDarts = (darts: any[]) => {
    return (darts || []).map((d: any) => {
      if (d.score === 0 && d.multiplier === 0) return 'S0';
      const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : 'S';
      return `${prefix}${d.segment}`;
    }).join(' ');
  };

  return (
    <Card variant="filled" className="overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="m3-state-layer w-full p-4 flex items-center justify-between"
      >
        <span className="font-bold text-on-surface m3-title-medium">{t('match_history.throw_details')}</span>
        {open ? <ChevronUp size={16} className="text-on-surface-variant" /> : <ChevronDown size={16} className="text-on-surface-variant" />}
      </button>
      {open && (
        <div className="px-2 sm:px-4 pb-4 space-y-4">
          {legs.map((leg: any, legIdx: number) => {
            const rounds = groupIntoRounds(leg.throws || []);
            return (
              <div key={leg.id || legIdx}>
                <div className="m3-body-small text-on-surface-variant font-semibold mb-2">{t('match_history.leg_number', { number: legIdx + 1 })}</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-outline-variant">
                        <th className="text-on-surface-variant text-left py-1 pr-1 w-6">#</th>
                        {playerIds.map(pid => (
                          <th key={pid} className="text-on-surface font-bold text-center py-1 px-1 truncate max-w-[120px]">
                            {getPlayerName(pid)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rounds.map((round, rIdx) => (
                        <tr key={rIdx} className="border-b border-outline-variant/30">
                          <td className="text-on-surface-variant py-1 pr-1 align-top">{rIdx + 1}</td>
                          {playerIds.map(pid => {
                            const thr = round.find((r: any) => r.playerId === pid);
                            if (!thr) return <td key={pid} className="py-1 px-1"></td>;
                            return (
                              <td key={pid} className="py-1 px-1 text-center">
                                <div className="font-mono text-on-surface-variant text-[11px]">{formatDarts(thr.darts)}</div>
                                <div className="flex items-center justify-center gap-1">
                                  <span className={`font-bold ${thr.isBust ? 'text-error' : thr.score >= 100 ? 'text-tertiary' : 'text-on-surface'}`}>
                                    {thr.isBust ? '0' : thr.score}
                                  </span>
                                  <span className="text-on-surface-variant opacity-70">→{thr.remaining}</span>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-surface-container-highest rounded-m3-sm p-2">
    <div className="text-[10px] text-on-surface-variant uppercase tracking-wider">{label}</div>
    <div className="m3-body-medium font-bold text-on-surface">{value}</div>
  </div>
);

export default MatchHistoryPage;
