import React, { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { MatchPlayer, Throw } from '../../types/index';

interface ThrowChartProps {
  players: MatchPlayer[];
  chartThrows: Throw[];
}

const PLAYER_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'];

const TOOLTIP_STYLE = {
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  borderRadius: '8px',
  color: '#fff',
};

const ThrowChart: React.FC<ThrowChartProps> = ({ players, chartThrows }) => {
  const { scoreData, remainingData } = useMemo(() => {
    const maxThrows = Math.max(
      ...players.map((p) => chartThrows.filter((t) => t.playerId === p.playerId).length),
      0
    );

    const scoreData: Array<Record<string, number | string | null>> = [];
    const remainingData: Array<Record<string, number | string | null>> = [];

    for (let i = 0; i < maxThrows; i++) {
      const scorePoint: Record<string, number | string | null> = { throwNumber: i + 1 };
      const remainingPoint: Record<string, number | string | null> = { throwNumber: i + 1 };

      for (const player of players) {
        const playerThrows = chartThrows.filter((t) => t.playerId === player.playerId);
        const td = playerThrows[i];
        scorePoint[player.name] = td ? td.score : null;
        remainingPoint[player.name] = td ? td.remaining : null;
      }

      scoreData.push(scorePoint);
      remainingData.push(remainingPoint);
    }

    return { scoreData, remainingData };
  }, [players, chartThrows]);

  const lines = players.map((player, index) => (
    <Line
      key={player.playerId}
      type="monotone"
      dataKey={player.name}
      stroke={PLAYER_COLORS[index % PLAYER_COLORS.length]}
      strokeWidth={2}
      dot={{ r: 4 }}
      activeDot={{ r: 6 }}
      connectNulls
    />
  ));

  return (
    <>
      <div className="mb-8">
        <h4 className="text-white font-bold mb-4">Geworfene Punkte pro Aufnahme</h4>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="throwNumber"
                stroke="#9ca3af"
                label={{ value: 'Aufnahme', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
              />
              <YAxis
                stroke="#9ca3af"
                label={{ value: 'Punkte', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div>
        <h4 className="text-white font-bold mb-4">Verbleibende Punkte</h4>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={remainingData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis
                dataKey="throwNumber"
                stroke="#9ca3af"
                label={{ value: 'Aufnahme', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
              />
              <YAxis
                stroke="#9ca3af"
                label={{ value: 'Verbleibend', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                reversed
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default ThrowChart;
