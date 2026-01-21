import React from 'react';
import { Match, Throw } from '../../types';
import { X, Calendar, TrendingUp } from 'lucide-react';
import { formatDate, getTimestampForSort } from '../../utils/dateUtils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface MatchDetailModalProps {
  match: Match;
  onClose: () => void;
}

const MatchDetailModal: React.FC<MatchDetailModalProps> = ({ match, onClose }) => {
  const matchPlayers = match.players || [];

  // Prepare round-by-round data for chart
  const prepareRoundData = (match: Match) => {
    const allThrows: Throw[] = [];
    const legs = match.legs || [];
    const players = match.players || [];

    if (legs.length === 0 || players.length === 0) {
      return [];
    }

    legs.forEach(leg => {
      const throws = leg.throws || [];
      allThrows.push(...throws);
    });

    const sortedThrows = allThrows.sort((a, b) =>
      getTimestampForSort(a.timestamp) - getTimestampForSort(b.timestamp)
    );

    const playerRounds: Record<string, { round: number; score: number }[]> = {};

    players.forEach(player => {
      const playerThrows = sortedThrows.filter(t => t.playerId === player.playerId);
      const rounds: { round: number; score: number }[] = [];

      for (let i = 0; i < playerThrows.length; i += 1) {
        const roundNumber = Math.floor(i / 3) + 1;
        const throwScore = playerThrows[i].score ?? 0;

        const existingRound = rounds.find(r => r.round === roundNumber);
        if (existingRound) {
          existingRound.score += throwScore;
        } else {
          rounds.push({ round: roundNumber, score: throwScore });
        }
      }

      playerRounds[player.playerId] = rounds;
    });

    const roundCounts = Object.values(playerRounds).map(r => r.length);
    const maxRounds = roundCounts.length > 0 ? Math.max(...roundCounts) : 0;
    const chartData = [];

    for (let i = 1; i <= maxRounds; i++) {
      const dataPoint: any = { round: i };

      players.forEach(player => {
        const roundData = playerRounds[player.playerId]?.find(r => r.round === i);
        dataPoint[player.playerId] = roundData?.score || 0;
      });

      chartData.push(dataPoint);
    }

    return chartData;
  };

  const chartData = prepareRoundData(match);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="glass-card rounded-2xl p-6 max-w-6xl w-full my-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              {match.type || 'X01'}
            </h2>
            <p className="text-sm text-dark-400 flex items-center gap-2 mt-1">
              <Calendar size={14} />
              {formatDate(match.startedAt)}
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
          {matchPlayers.map((player, index) => (
            <div key={player.playerId} className="text-center">
              <div className={`text-4xl font-bold ${match.winner === player.playerId ? 'text-success-400' : 'text-red-500'}`}>
                {player.legsWon ?? 0}
              </div>
              <div className="text-white font-semibold mt-1">{player.name}</div>
              {index === 0 && matchPlayers.length > 1 && (
                <div className="text-dark-500 text-sm mt-2">vs</div>
              )}
            </div>
          ))}
        </div>

        {/* Round-by-Round Chart */}
        {chartData.length > 0 && (
          <div className="glass-card p-6 rounded-xl mb-6">
            <h4 className="font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-primary-400" />
              Runden-Verlauf
            </h4>
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
                  {matchPlayers.map((p, index) => (
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
          </div>
        )}

        {/* Player Stats */}
        <div className={`grid ${matchPlayers.length > 1 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6 mb-6`}>
          {matchPlayers.map((player) => (
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
                    leg.winner === matchPlayers[0]?.playerId
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  Leg {index + 1}: {matchPlayers.find(p => p.playerId === leg.winner)?.name || 'Unbekannt'}
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
