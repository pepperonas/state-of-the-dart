import React, { useMemo } from 'react';
import { useReducedMotion } from 'framer-motion';
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
import { CHART_MOTION } from '../../utils/motion';
import { useChartTheme } from '../../utils/chartTheme';

interface ThrowChartProps {
  players: MatchPlayer[];
  chartThrows: Throw[];
}



const ThrowChart: React.FC<ThrowChartProps> = ({ players, chartThrows }) => {
  const chart = useChartTheme();
  // Recharts animates SVG attributes from JS; the CSS reduced-motion rule cannot
  // reach it, so the switch has to be explicit.
  const reduce = useReducedMotion();

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
      stroke={chart.series[index % chart.series.length]}
      strokeWidth={2}
      dot={{ r: 4 }}
      activeDot={{ r: 6 }}
      connectNulls
      isAnimationActive={!reduce}
      animationDuration={CHART_MOTION.duration}
      animationEasing={CHART_MOTION.easing}
    />
  ));

  return (
    <>
      <div className="mb-8 bg-surface-container rounded-m3-md p-4">
        <h4 className="m3-title-small text-on-surface mb-4">Geworfene Punkte pro Aufnahme</h4>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={scoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                dataKey="throwNumber"
                stroke={chart.axis}
                label={{ value: 'Aufnahme', position: 'insideBottom', offset: -5, fill: chart.axis }}
              />
              <YAxis
                stroke={chart.axis}
                label={{ value: 'Punkte', angle: -90, position: 'insideLeft', fill: chart.axis }}
              />
              <Tooltip contentStyle={chart.tooltip.contentStyle} />
              <Legend />
              {lines}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-surface-container rounded-m3-md p-4">
        <h4 className="m3-title-small text-on-surface mb-4">Verbleibende Punkte</h4>
        <div className="h-[220px] sm:h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={remainingData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
              <XAxis
                dataKey="throwNumber"
                stroke={chart.axis}
                label={{ value: 'Aufnahme', position: 'insideBottom', offset: -5, fill: chart.axis }}
              />
              <YAxis
                stroke={chart.axis}
                label={{ value: 'Verbleibend', angle: -90, position: 'insideLeft', fill: chart.axis }}
                reversed
              />
              <Tooltip contentStyle={chart.tooltip.contentStyle} />
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
