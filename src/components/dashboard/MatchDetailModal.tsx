import React, { useMemo } from 'react';
import { Match, Throw } from '../../types';
import { X, Calendar, TrendingUp } from 'lucide-react';
import { formatDateTime, getTimestampForSort } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { calculateAverage } from '../../utils/scoring';
import logger from '../../utils/logger';

interface MatchDetailModalProps {
  match: Match;
  onClose: () => void;
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose }) => {
  const matchPlayers = match.players || [];

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
    const average = calculateAverage(playerThrows);
    const highestScore = Math.max(...scores, 0);
    const count180s = scores.filter(s => s === 180).length;
    const count171Plus = scores.filter(s => s >= 171).length;
    const count140Plus = scores.filter(s => s >= 140).length;
    const count100Plus = scores.filter(s => s >= 100).length;
    const count60Plus = scores.filter(s => s >= 60).length;
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

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 pt-16 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-card rounded-2xl p-6 max-w-6xl w-full mb-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {match.type || 'X01'}
            </h2>
            <p className="text-sm text-dark-400 flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {formatDateTime(match.startedAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700 rounded-lg transition-colors text-white"
          >
            <X size={24} />
          </button>
        </div>

        {/* Players */}
        <div className="mb-6 flex items-center justify-center gap-8">
          {playersWithThrows.map((player, index) => (
            <React.Fragment key={player.playerId}>
              <div className="text-center">
                <div className={`text-4xl font-bold ${match.winner === player.playerId ? 'text-success-400' : 'text-red-500'}`}>
                  {player.legsWon ?? 0}
                </div>
                <div className="text-white font-semibold mt-1">{player.name}</div>
              </div>
              {index === 0 && matchPlayers.length > 1 && (
                <div className="text-dark-400 text-2xl font-bold self-center">vs</div>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Warning if some players were filtered out */}
        {matchPlayers.length > playersWithThrows.length && (
          <div className="mb-4 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <p className="text-sm text-orange-300">
              ℹ️ Hinweis: {matchPlayers.length - playersWithThrows.length} Spieler ohne Würfe in diesem Match werden nicht angezeigt.
            </p>
          </div>
        )}

        {/* Round-by-Round Chart */}
        <div className="glass-card p-6 rounded-xl mb-6">
          <h4 className="font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary-400" />
            Runden-Verlauf
          </h4>
          {chartData.length > 0 ? (
            <div className="bg-dark-900 rounded-lg p-4">
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis
                    dataKey="round"
                    stroke="#737373"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Runde', position: 'insideBottom', offset: -5, fill: '#737373' }}
                  />
                  <YAxis
                    stroke="#737373"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Punkte', angle: -90, position: 'insideLeft', fill: '#737373' }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0a0a0a',
                      border: '1px solid #404040',
                      borderRadius: '8px',
                      padding: '12px'
                    }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                    itemStyle={{ color: '#fff' }}
                    formatter={(value: number) => [`${value} Punkte`, '']}
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
                      stroke={index === 0 ? '#0ea5e9' : '#a855f7'}
                      strokeWidth={3}
                      dot={{ fill: index === 0 ? '#0ea5e9' : '#a855f7', r: 5 }}
                      activeDot={{ r: 7 }}
                      name={p.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-dark-900 rounded-lg p-8 text-center">
              <div className="text-dark-500 mb-3">
                <TrendingUp size={48} className="mx-auto opacity-30" />
              </div>
              <p className="text-dark-400 font-medium">Keine Runden-Daten verfügbar</p>
              <p className="text-dark-500 text-sm mt-2">
                Dieses Match wurde möglicherweise vor dem Tracking-Update gespielt
              </p>
            </div>
          )}
        </div>

        {/* Player Stats */}
        <div className={`grid ${playersWithThrows.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 mb-6`}>
          {playersWithThrows.map((player) => (
            <div key={player.playerId}>
              <h4 className="font-bold text-gray-800 dark:text-white mb-3">
                {player.name}
              </h4>
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

        {/* Leg-by-Leg Breakdown */}
        {match.legs && match.legs.length > 0 && (
          <div className="pt-4 border-t border-dark-700">
            <h5 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
              Leg Details
            </h5>
            <div className="flex gap-2 flex-wrap">
              {match.legs.map((leg, index) => (
                <div
                  key={leg.id}
                  className={`px-3 py-1 rounded text-sm ${
                    leg.winner === playersWithThrows[0]?.playerId
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  Leg {index + 1}: {playersWithThrows.find(p => p.playerId === leg.winner)?.name || 'Unbekannt'}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const StatBox: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
  <div className="bg-gray-100 dark:bg-gray-700 rounded p-2">
    <div className="text-xs text-gray-600 dark:text-gray-400">{label}</div>
    <div className="text-lg font-bold text-gray-800 dark:text-white">{value}</div>
  </div>
);

export default MatchDetailModal;
