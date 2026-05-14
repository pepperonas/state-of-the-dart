import React from 'react';
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

interface MatchChartPlayer {
  playerId: string;
  name: string;
}

interface MatchChartProps {
  data: Array<Record<string, number | string>>;
  players: MatchChartPlayer[];
}

const PLAYER_COLORS = ['#0ea5e9', '#a855f7', '#f59e0b', '#ef4444'];

const TOOLTIP_STYLE = {
  backgroundColor: '#0a0a0a',
  border: '1px solid #404040',
  borderRadius: '8px',
  padding: '8px',
};

const MatchChart: React.FC<MatchChartProps> = ({ data, players }) => (
  <div className="h-[180px] sm:h-[250px]">
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
        <XAxis dataKey="round" stroke="#737373" style={{ fontSize: '11px' }} />
        <YAxis stroke="#737373" style={{ fontSize: '11px' }} />
        <Tooltip
          contentStyle={TOOLTIP_STYLE}
          labelStyle={{ color: '#fff', fontWeight: 'bold', fontSize: '12px' }}
        />
        <Legend wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }} iconType="line" />
        {players.map((p, idx) => (
          <Line
            key={p.playerId}
            type="monotone"
            dataKey={p.playerId}
            stroke={PLAYER_COLORS[idx % PLAYER_COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            name={p.name}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  </div>
);

export default MatchChart;
