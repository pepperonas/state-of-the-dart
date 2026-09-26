import React from 'react';
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
import { CHART_MOTION } from '../../utils/motion';
import { useChartTheme } from '../../utils/chartTheme';

interface MatchChartPlayer {
  playerId: string;
  name: string;
}

interface MatchChartProps {
  data: Array<Record<string, number | string>>;
  players: MatchChartPlayer[];
}



const MatchChart: React.FC<MatchChartProps> = ({ data, players }) => {
  const chart = useChartTheme();
  // Recharts animates SVG attributes from JS; the CSS reduced-motion rule cannot
  // reach it, so the switch has to be explicit.
  const reduce = useReducedMotion();

  return (
  <div className="h-[180px] sm:h-[250px]">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={chart.grid} />
        <XAxis dataKey="round" stroke={chart.axis} style={{ fontSize: '11px' }} />
        <YAxis stroke={chart.axis} style={{ fontSize: '11px' }} />
        <Tooltip
          contentStyle={chart.tooltip.contentStyle}
          labelStyle={{ color: chart.text, fontWeight: 'bold', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="line" />
        {players.map((p, idx) => (
          <Line
            key={p.playerId}
            type="monotone"
            dataKey={p.playerId}
            stroke={chart.series[idx % chart.series.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            name={p.name}
            isAnimationActive={!reduce}
            animationDuration={CHART_MOTION.duration}
            animationEasing={CHART_MOTION.easing}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
  );
};

export default MatchChart;
