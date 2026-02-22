import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, Target, Award, ChevronDown, ChevronUp, TrendingUp, Loader, Search, ChevronLeft, ChevronRight, Clock, Users, Filter } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Match, Throw } from '../../types';
import { formatDate, getTimestampForSort } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../../services/api';
import { DartboardHeatmapBlur } from '../dartboard/DartboardHeatmapBlur';
import PlayerAvatar from '../player/PlayerAvatar';

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
      <div className="min-h-screen p-4 md:p-8 gradient-mesh flex items-center justify-center">
        <Loader className="animate-spin text-primary-400" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-5xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => { window.location.href = '/'; }}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('common.back')}
        </button>

        <h1 className="text-3xl font-bold text-white mb-6">{t('match_history.title', 'Spielhistorie')}</h1>

        {/* Filters */}
        <div className="mb-6 space-y-3">
          <div className="flex flex-wrap gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-dark-400" size={18} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('match_history.search_placeholder', 'Spieler, Datum oder Spieltyp suchen...')}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-dark-700 bg-dark-800 text-white placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
              />
            </div>

            {/* Game type filter */}
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-dark-400" />
              <select
                value={gameTypeFilter}
                onChange={(e) => setGameTypeFilter(e.target.value)}
                className="px-3 py-2 rounded-lg border border-dark-700 bg-dark-800 text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {gameTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? t('match_history.all_types', 'Alle Spieltypen') : getGameTypeLabel(type)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-dark-400">{t('match_history.showing', 'Zeige')}:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                className="px-2 py-1 rounded-lg border border-dark-700 bg-dark-800 text-white text-sm"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span className="text-sm text-dark-400">
                {t('match_history.of', 'von')} {filteredMatches.length} {t('match_history.matches', 'Matches')}
              </span>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-dark-700 bg-dark-800 text-white disabled:opacity-30 hover:bg-dark-700"
                >
                  <ChevronLeft size={16} />
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-2.5 py-1 rounded-lg text-sm font-semibold ${
                        currentPage === pageNum
                          ? 'bg-primary-500 text-white'
                          : 'bg-dark-800 text-white hover:bg-dark-700 border border-dark-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-dark-700 bg-dark-800 text-white disabled:opacity-30 hover:bg-dark-700"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Match list */}
        {filteredMatches.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Target size={48} className="mx-auto mb-3 text-dark-600 opacity-30" />
            <p className="text-dark-400">{searchQuery ? t('match_history.no_results', 'Keine Matches gefunden') : t('match_history.no_matches', 'Noch keine abgeschlossenen Spiele')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedMatches.map((match) => {
              const players = match.players || [];
              const isExpanded = expandedMatch === match.id;
              const detail = matchDetails[match.id];
              const duration = formatDuration(match);
              const winnerPlayer = players.find(p => p.playerId === match.winner);

              return (
                <div key={match.id} className="glass-card rounded-xl overflow-hidden">
                  {/* Match summary row */}
                  <button
                    onClick={() => toggleMatch(match.id)}
                    className="w-full p-4 flex items-center gap-4 hover:bg-white/5 transition-colors text-left"
                  >
                    {/* Game type badge */}
                    <div className="px-2.5 py-1 rounded-lg bg-primary-500/20 text-primary-300 text-xs font-bold flex-shrink-0">
                      {getGameTypeLabel(match.type || 'x01')}
                    </div>

                    {/* Players */}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-white text-sm truncate">
                        {players.map(p => p.name).join(' vs ')}
                      </div>
                      <div className="text-xs text-dark-400 flex items-center gap-3 mt-0.5">
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
                    <div className="text-sm text-dark-300 flex-shrink-0 hidden sm:block">
                      {players.map((p, i) => (
                        <span key={p.playerId}>
                          {i > 0 && ' : '}
                          <span className={p.playerId === match.winner ? 'text-success-400 font-bold' : ''}>
                            {p.legsWon}
                          </span>
                        </span>
                      ))}
                    </div>

                    {/* Winner badge */}
                    {winnerPlayer && (
                      <div className="px-2 py-0.5 rounded bg-success-500/20 text-success-300 text-xs font-bold flex-shrink-0 hidden md:block">
                        {winnerPlayer.name}
                      </div>
                    )}

                    {isExpanded ? <ChevronUp size={18} className="text-dark-400 flex-shrink-0" /> : <ChevronDown size={18} className="text-dark-400 flex-shrink-0" />}
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-dark-700 p-4 space-y-6">
                      {loadingDetails[match.id] ? (
                        <div className="flex items-center justify-center py-12">
                          <Loader className="animate-spin text-primary-400" size={32} />
                        </div>
                      ) : detail ? (
                        <>
                          {/* Player stats grid */}
                          <div className={`grid gap-4 ${players.length === 2 ? 'md:grid-cols-2' : `md:grid-cols-${Math.min(players.length, 3)}`}`}>
                            {(detail.players || players).map((p: any) => (
                              <div key={p.playerId} className={`rounded-xl p-4 ${p.playerId === match.winner ? 'bg-success-500/10 border border-success-500/30' : 'bg-dark-800/50 border border-dark-700'}`}>
                                <div className="flex items-center gap-2 mb-3">
                                  <PlayerAvatar avatar={p.avatar} name={p.name} size="sm" />
                                  <div>
                                    <div className="font-bold text-white text-sm">{p.name}</div>
                                    {p.playerId === match.winner && (
                                      <span className="text-xs text-success-400 font-semibold">{t('match_history.winner')}</span>
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
                              <div className="bg-dark-800/50 rounded-xl p-4">
                                <h4 className="font-bold text-white mb-3 flex items-center gap-2 text-sm">
                                  <TrendingUp size={16} className="text-primary-400" />
                                  {t('match_history.round_chart', 'Runden-Verlauf')}
                                </h4>
                                <ResponsiveContainer width="100%" height={250}>
                                  <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                                    <XAxis dataKey="round" stroke="#737373" style={{ fontSize: '11px' }} />
                                    <YAxis stroke="#737373" style={{ fontSize: '11px' }} />
                                    <Tooltip
                                      contentStyle={{ backgroundColor: '#0a0a0a', border: '1px solid #404040', borderRadius: '8px', padding: '8px' }}
                                      labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="line" />
                                    {(detail.players || players).map((p: any, idx: number) => (
                                      <Line
                                        key={p.playerId}
                                        type="monotone"
                                        dataKey={p.playerId}
                                        stroke={['#0ea5e9', '#a855f7', '#f59e0b', '#ef4444'][idx % 4]}
                                        strokeWidth={2}
                                        dot={{ r: 3 }}
                                        name={p.name}
                                      />
                                    ))}
                                  </LineChart>
                                </ResponsiveContainer>
                              </div>
                            );
                          })()}

                          {/* Per-player heatmaps */}
                          <div className={`grid gap-4 ${players.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
                            {(detail.players || players).map((p: any) => {
                              const segments = buildMatchHeatmap(detail, p.playerId);
                              const totalDarts = Object.values(segments).reduce((s: number, v: any) => s + (v as number), 0);
                              if (totalDarts === 0) return null;
                              return (
                                <div key={p.playerId} className="bg-dark-800/50 rounded-xl p-4">
                                  <h4 className="font-bold text-white mb-3 text-sm flex items-center gap-2">
                                    <Target size={16} className="text-primary-400" />
                                    {t('match_history.heatmap')} — {p.name}
                                  </h4>
                                  <div className="flex justify-center">
                                    <DartboardHeatmapBlur
                                      heatmapData={{ playerId: p.playerId, segments, totalDarts, lastUpdated: new Date() }}
                                      size={220}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Leg breakdown */}
                          {detail.legs && detail.legs.length > 0 && (
                            <div className="bg-dark-800/50 rounded-xl p-4">
                              <h4 className="font-bold text-white mb-3 text-sm">{t('match_history.leg_breakdown')}</h4>
                              <div className="flex gap-2 flex-wrap">
                                {detail.legs.map((leg: any, idx: number) => {
                                  const legWinner = players.find((p: any) => p.playerId === leg.winner);
                                  return (
                                    <div
                                      key={leg.id || idx}
                                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                                        legWinner
                                          ? 'bg-success-500/20 text-success-300 border border-success-500/30'
                                          : 'bg-dark-700 text-dark-400'
                                      }`}
                                    >
                                      {t('match_history.leg_number', { number: idx + 1 })}: {legWinner?.name || '?'}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Throw history (collapsible) */}
                          <ThrowHistory detail={detail} players={detail.players || players} />
                        </>
                      ) : (
                        <div className="text-center py-8 text-dark-400">
                          {t('match_history.no_details', 'Details konnten nicht geladen werden')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
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

  return (
    <div className="bg-dark-800/50 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <span className="font-bold text-white text-sm">{t('match_history.throw_details')}</span>
        {open ? <ChevronUp size={16} className="text-dark-400" /> : <ChevronDown size={16} className="text-dark-400" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-4">
          {legs.map((leg: any, legIdx: number) => (
            <div key={leg.id || legIdx}>
              <div className="text-xs text-dark-400 font-semibold mb-2">{t('match_history.leg_number', { number: legIdx + 1 })}</div>
              <div className="space-y-1">
                {(leg.throws || []).map((t: any, tIdx: number) => {
                  const p = players.find((pl: any) => pl.playerId === t.playerId);
                  return (
                    <div key={tIdx} className="flex items-center gap-3 text-xs">
                      <span className="text-dark-500 w-16 truncate">{p?.name || '?'}</span>
                      <span className="text-dark-400 font-mono w-24">
                        {(t.darts || []).map((d: any) => {
                          const prefix = d.multiplier === 3 ? 'T' : d.multiplier === 2 ? 'D' : 'S';
                          return `${prefix}${d.segment}`;
                        }).join(' ')}
                      </span>
                      <span className={`font-bold w-8 text-right ${t.isBust ? 'text-red-400' : 'text-white'}`}>
                        {t.isBust ? '0' : t.score}
                      </span>
                      <span className="text-dark-500">&rarr; {t.remaining}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-dark-900/50 rounded-lg p-2">
    <div className="text-[10px] text-dark-500 uppercase tracking-wider">{label}</div>
    <div className="text-sm font-bold text-white">{value}</div>
  </div>
);

export default MatchHistoryPage;
