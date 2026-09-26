import React, { useMemo, useState } from 'react';
import { Match, Throw } from '../../types';
import { Calendar, TrendingUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../common';
import { useChartTheme } from '../../utils/chartTheme';
import { formatDateTime, getTimestampForSort } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateAverage } from '../../utils/scoring';
import logger from '../../utils/logger';

interface MatchDetailModalProps {
  match: Match;
  onClose: () => void;
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose }) => {
  const { t } = useTranslation();
  const chart = useChartTheme();
  const matchPlayers = match.players || [];
  const [showThrowHistory, setShowThrowHistory] = useState(false);

  // Calculate statistics from throws if not present in player object
  const calculateStatsFromThrows = (playerId: string, throws: Throw[]) => {
    const playerThrows = throws.filter(t => t.playerId === playerId);
    if (playerThrows.length === 0) {
      return {
        matchAverage: 0,
        matchHighestScore: 0,
        match180s: 0,
        match171Plus: 0,
        match140Plus: 0,
        match100Plus: 0,
        match60Plus: 0,
        checkoutsHit: 0,
        checkoutAttempts: 0,
      };
    }

    // Use calculateAverage from utils for consistency
    const scores = playerThrows.map(t => t.score);
    const average = calculateAverage(playerThrows);
    const highestScore = scores.length > 0 ? Math.max(...scores, 0) : 0;
    const count180s = scores.filter((s: number) => s === 180).length;
    const count171Plus = scores.filter((s: number) => s >= 171).length;
    const count140Plus = scores.filter((s: number) => s >= 140).length;
    const count100Plus = scores.filter((s: number) => s >= 100).length;
    const count60Plus = scores.filter((s: number) => s >= 60).length;
    const checkoutsHit = playerThrows.filter(t => t.remaining === 0 && !t.isBust).length;
    const checkoutAttempts = playerThrows.filter(t => t.isCheckoutAttempt).length;

    return {
      matchAverage: average,
      matchHighestScore: highestScore,
      match180s: count180s,
      match171Plus: count171Plus,
      match140Plus: count140Plus,
      match100Plus: count100Plus,
      match60Plus: count60Plus,
      checkoutsHit,
      checkoutAttempts,
    };
  };

  // Filter players who actually played (have throws)
  const getPlayersWithThrows = (match: Match) => {
    const allThrows = match.legs?.flatMap(leg => leg.throws || []) || [];
    const playerIdsWithThrows = new Set(allThrows.map(t => t.playerId));
    const players = (match.players || []).filter(p => playerIdsWithThrows.has(p.playerId));
    
    // Calculate stats from throws if missing or zero
    return players.map(player => {
      // If stats are missing or all zero, recalculate from throws
      const hasStats = player.matchAverage !== undefined && player.matchAverage !== 0;
      if (!hasStats && allThrows.length > 0) {
        const calculatedStats = calculateStatsFromThrows(player.playerId, allThrows);
        return {
          ...player,
          ...calculatedStats,
        };
      }
      return player;
    });
  };

  // Prepare round-by-round data for chart
  const prepareRoundData = (match: Match) => {
    const allThrows: Throw[] = [];
    const legs = match.legs || [];
    const players = getPlayersWithThrows(match);

    logger.debug('🔍 MatchDetailModal - Debug:', {
      totalLegs: legs.length,
      totalPlayers: players.length,
      matchId: match.id,
      legs: legs.map(l => ({ id: l.id, throwsCount: (l.throws || []).length })),
      players: players.map(p => ({ name: p.name, playerId: p.playerId }))
    });

    if (legs.length === 0 || players.length === 0) {
      logger.warn('⚠️ No legs or players found for chart');
      return [];
    }

    legs.forEach((leg, index) => {
      const throws = leg.throws || [];
      logger.debug(`📊 Leg ${index + 1}: ${throws.length} throws`, throws.map(t => ({ playerId: t.playerId, score: t.score })));
      allThrows.push(...throws);
    });

    logger.debug(`📈 Total throws collected: ${allThrows.length}`);
    logger.debug(`🎯 Unique player IDs in throws:`, [...new Set(allThrows.map(t => t.playerId))]);

    if (allThrows.length === 0) {
      logger.warn('⚠️ No throws found in any leg');
      return [];
    }

    const sortedThrows = allThrows.sort((a, b) =>
      getTimestampForSort(a.timestamp) - getTimestampForSort(b.timestamp)
    );

    const playerRounds: Record<string, { round: number; score: number }[]> = {};

    players.forEach(player => {
      const playerThrows = sortedThrows.filter(t => t.playerId === player.playerId);

      // Skip players with no throws (they weren't in this specific match)
      if (playerThrows.length === 0) {
        logger.warn(`⚠️ Skipping ${player.name} - no throws in this match`);
        return;
      }

      const rounds: { round: number; score: number }[] = [];

      logger.debug(`👤 Player ${player.name} (ID: ${player.playerId}): ${playerThrows.length} throws`,
        playerThrows.slice(0, 5).map(t => ({ score: t.score, visitNumber: t.visitNumber })));

      // Each Throw already contains 3 darts (one complete round)
      for (let i = 0; i < playerThrows.length; i += 1) {
        const roundNumber = i + 1; // Each throw is already one round
        const throwScore = playerThrows[i].score ?? 0;

        rounds.push({ round: roundNumber, score: throwScore });
      }

      playerRounds[player.playerId] = rounds;
    });

    const roundCounts = Object.values(playerRounds).map(r => r.length);
    const maxRounds = roundCounts.length > 0 ? Math.max(...roundCounts) : 0;
    const chartData = [];

    logger.debug(`📊 Max rounds: ${maxRounds}`);

    for (let i = 1; i <= maxRounds; i++) {
      const dataPoint: any = { round: i };

      players.forEach(player => {
        const roundData = playerRounds[player.playerId]?.find(r => r.round === i);
        dataPoint[player.playerId] = roundData?.score || 0;
      });

      chartData.push(dataPoint);
    }

    logger.debug('✅ Chart data prepared:', chartData.length, 'data points');
    return chartData;
  };

  const chartData = prepareRoundData(match);
  const playersWithThrows = useMemo(() => getPlayersWithThrows(match), [match]);

  // Get all throws for a player across all legs
  const getPlayerThrows = (playerId: string): Throw[] => {
    const allThrows: Throw[] = [];
    const legs = match.legs || [];
    
    legs.forEach(leg => {
      const throws = leg.throws || [];
      const playerThrows = throws.filter(t => t.playerId === playerId);
      allThrows.push(...playerThrows);
    });
    
    // Sort by timestamp
    return allThrows.sort((a, b) =>
      getTimestampForSort(a.timestamp) - getTimestampForSort(b.timestamp)
    );
  };

  return (
    <Dialog
      open
      onClose={onClose}
      widthClassName="max-w-6xl"
      title={match.type === 'x01' || !match.type ? String(match.settings?.startScore ?? 'X01') : match.type}
    >
        <p className="m3-body-medium text-on-surface-variant flex items-center gap-2 -mt-3 mb-6">
          <Calendar size={14} aria-hidden="true" />
          {formatDateTime(match.startedAt)}
        </p>

        {/* Players */}
        <div className="mb-6 flex items-center justify-center gap-8">
          {playersWithThrows.map((player, index) => (
            <React.Fragment key={player.playerId}>
              <div className="text-center">
                <div className={`m3-display-small m3-emphasized ${match.winner === player.playerId ? 'text-success' : 'text-on-surface-variant'}`}>
                  {player.legsWon ?? 0}
                </div>
                <div className="text-on-surface font-semibold mt-1">{player.name}</div>
              </div>
              {index === 0 && matchPlayers.length > 1 && (
                <div className="text-on-surface-variant text-2xl font-bold self-center">vs</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Warning if some players were filtered out */}
        {matchPlayers.length > playersWithThrows.length && (
          <div className="mb-4 p-3 rounded-m3-md bg-secondary-container text-on-secondary-container">
            <p className="m3-body-medium">
              {t('match_detail.hidden_players', { count: matchPlayers.length - playersWithThrows.length })}
            </p>
          </div>
        )}

        {/* Round-by-Round Chart */}
        <div className="rounded-m3-lg bg-surface-container p-4 sm:p-6 mb-6">
          <h3 className="m3-title-medium text-on-surface mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" aria-hidden="true" />
            {t('match_detail.round_chart')}
          </h3>
          {chartData.length > 0 ? (
            <div className="rounded-m3-md p-2">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
                  <XAxis
                    dataKey="round"
                    stroke={chart.axis}
                    style={{ fontSize: '12px' }}
                    label={{ value: t('match_detail.round'), position: 'insideBottom', offset: -5, fill: chart.axis }}
                  />
                  <YAxis
                    stroke={chart.axis}
                    style={{ fontSize: '12px' }}
                    label={{ value: t('match_detail.points'), angle: -90, position: 'insideLeft', fill: chart.axis }}
                  />
                  <Tooltip
                    {...chart.tooltip}
                    formatter={(value: number) => [t('match_detail.points_value', { count: value }), '']}
                  />
                  <Legend
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {playersWithThrows.map((p, index) => (
                    <Line
                      key={p.playerId}
                      type="monotone"
                      dataKey={p.playerId}
                      stroke={chart.series[index % chart.series.length]}
                      strokeWidth={3}
                      dot={{ fill: chart.series[index % chart.series.length], r: 5 }}
                      activeDot={{ r: 7 }}
                      name={p.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-m3-md p-8 text-center">
              <TrendingUp size={48} className="mx-auto mb-3 text-on-surface-variant" aria-hidden="true" />
              <p className="m3-title-small text-on-surface-variant">{t('match_detail.no_rounds')}</p>
              <p className="m3-body-medium text-on-surface-variant mt-2">{t('match_detail.no_rounds_hint')}</p>
            </div>
          )}
        </div>

        {/* Player Stats */}
        <div className={`grid ${playersWithThrows.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 mb-6`}>
          {playersWithThrows.map((player) => (
            <div key={player.playerId}>
              <h3 className="m3-title-medium text-on-surface mb-3">{player.name}</h3>
              <div className="grid grid-cols-2 gap-3">
                <StatBox label="Average" value={(player.matchAverage ?? 0).toFixed(2)} />
                <StatBox label="Highest Score" value={player.matchHighestScore ?? 0} />
                <StatBox label="180s" value={player.match180s ?? 0} />
                <StatBox label="140+" value={player.match140Plus ?? 0} />
                <StatBox label="100+" value={player.match100Plus ?? 0} />
                <StatBox
                  label="Checkout %"
                  value={
                    (player.checkoutAttempts ?? 0) > 0
                      ? `${(((player.checkoutsHit ?? 0) / player.checkoutAttempts) * 100).toFixed(1)}%`
                      : '0%'
                  }
                />
              </div>
            </div>
          ))}
        </div>

        {/* Throw History - Collapsable */}
        <div className="mt-6">
          <button
            onClick={() => setShowThrowHistory(!showThrowHistory)}
            aria-expanded={showThrowHistory}
            className="m3-state-layer w-full rounded-m3-lg bg-surface-container p-4 flex items-center justify-between"
          >
            <span className="m3-title-medium text-on-surface">{t('match_detail.throw_history')}</span>
            <ChevronDown size={24} aria-hidden="true" className={`m3-chevron ${showThrowHistory ? 'm3-open' : ''}`} />
          </button>

          {showThrowHistory && (
            <div className="rounded-m3-lg bg-surface-container p-4 sm:p-6 mt-2 m3-enter space-y-4">
              {(match.legs || []).map((leg, legIdx) => {
                const throws = leg.throws || [];
                if (throws.length === 0) return null;

                // Group throws into rounds
                const rounds: Throw[][] = [];
                let currentRound: Throw[] = [];
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

                const formatDart = (dart: { segment: number; multiplier: number; score: number }) => {
                  if (dart.score === 0 && dart.multiplier === 0) return 'S0';
                  const prefix = dart.multiplier === 3 ? 'T' : dart.multiplier === 2 ? 'D' : 'S';
                  return `${prefix}${dart.segment}`;
                };

                return (
                  <div key={leg.id || legIdx}>
                    {(match.legs || []).length > 1 && (
                      <div className="text-xs text-on-surface-variant font-semibold mb-2">Leg {legIdx + 1}</div>
                    )}
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-outline-variant">
                            <th className="text-on-surface-variant text-left py-2 pr-1 w-8">#</th>
                            {playersWithThrows.map(p => (
                              <th key={p.playerId} className="text-on-surface font-bold text-center py-2 px-2 truncate max-w-[160px]">
                                {p.name}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rounds.map((round, rIdx) => (
                            <tr key={rIdx} className="border-b border-outline-variant/30">
                              <td className="text-on-surface-variant py-2 pr-1 align-top text-xs">{rIdx + 1}</td>
                              {playersWithThrows.map(p => {
                                const thr = round.find(r => r.playerId === p.playerId);
                                if (!thr) return <td key={p.playerId} className="py-2 px-2"></td>;
                                return (
                                  <td key={p.playerId} className="py-2 px-2 text-center">
                                    <div className="font-mono text-on-surface-variant text-xs">
                                      {(thr.darts || []).map((d, i) => (
                                        <span key={i} className={`${
                                          d.multiplier === 3 ? 'text-tertiary font-semibold' :
                                          d.multiplier === 2 ? 'text-primary font-semibold' : 'text-on-surface-variant'
                                        }${i > 0 ? ' ml-1' : ''}`}>
                                          {formatDart(d)}
                                        </span>
                                      ))}
                                    </div>
                                    <div className="flex items-center justify-center gap-1 mt-0.5">
                                      <span className={`font-bold ${
                                        thr.isBust ? 'text-error' :
                                        thr.score >= 140 ? 'text-tertiary' :
                                        thr.score >= 100 ? 'text-primary' : 'text-on-surface'
                                      }`}>
                                        {thr.isBust ? '0' : thr.score}
                                      </span>
                                      <span className="text-on-surface-variant text-xs">→{thr.remaining}</span>
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
        </div>

        {/* Leg-by-Leg Breakdown */}
        {match.legs && match.legs.length > 0 && (
          <div className="pt-4 border-t border-outline-variant">
            <h3 className="m3-title-small text-on-surface-variant mb-2">{t('match_detail.legs')}</h3>
            <div className="flex gap-2 flex-wrap">
              {match.legs.map((leg, index) => (
                <div
                  key={leg.id}
                  className={`px-3 py-1 rounded-m3-full m3-label-large ${
                    leg.winner === playersWithThrows[0]?.playerId
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-tertiary-container text-on-tertiary-container'
                  }`}
                >
                  {t('match_detail.leg_winner', { n: index + 1, name: playersWithThrows.find(p => p.playerId === leg.winner)?.name || t('match_detail.unknown') })}
                </div>
              ))}
            </div>
          </div>
        )}
    </Dialog>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-surface-container-high rounded-m3-sm p-2">
    <div className="text-xs text-on-surface-variant">{label}</div>
    <div className="text-lg font-bold text-on-surface">{value}</div>
  </div>
);

export default MatchDetailModal;
