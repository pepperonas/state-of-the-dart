import React, { useId } from 'react';
import { activityBars, activityTotal, activeDays } from '../../utils/activity';

interface ActivitySparklineProps {
  /** One count per day, oldest first. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
}

/**
 * A 30-day usage bar chart, sized for a table cell.
 *
 * Admin-only: it is rendered from `/api/admin/users`, which sits behind
 * `requireAdmin`, so the data never reaches a non-admin client.
 *
 * The bars are token-coloured (`currentColor`) rather than a fixed palette, so
 * the chart follows the light/dark theme like everything else.
 */
const ActivitySparkline: React.FC<ActivitySparklineProps> = ({
  values,
  width = 104,
  height = 26,
  className = '',
}) => {
  const titleId = useId();

  if (!values || values.length === 0) {
    return <span className="m3-body-small text-on-surface-variant">–</span>;
  }

  const bars = activityBars(values, { width, height, gap: 1, minHeight: 1.5 });
  const total = activityTotal(values);
  const days = activeDays(values);
  const peak = Math.max(...values);

  const label =
    total === 0
      ? `Keine Aktivität in den letzten ${values.length} Tagen`
      : `${total} Spiele an ${days} von ${values.length} Tagen, Spitze ${peak} an einem Tag`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className={`overflow-visible ${className}`.trim()}
      role="img"
      aria-labelledby={titleId}
      preserveAspectRatio="none"
    >
      <title id={titleId}>{label}</title>
      {bars.map((b) => (
        <rect
          key={b.index}
          x={b.x}
          y={b.y}
          width={b.width}
          height={b.height}
          rx={0.75}
          // An idle day stays visible as a faint baseline tick, so the row reads
          // as a timeline rather than as missing data.
          className={b.value > 0 ? 'text-primary' : 'text-outline-variant'}
          fill="currentColor"
        />
      ))}
    </svg>
  );
};

export default ActivitySparkline;
