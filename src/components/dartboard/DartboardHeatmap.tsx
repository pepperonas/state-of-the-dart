import React, { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Flame, Target, TrendingUp, CircleDot, Percent, XCircle, Crosshair } from 'lucide-react';
import { HeatmapData } from '../../types';
import Card from '../common/Card';
import Button from '../common/Button';
import {
  aggregateBeds,
  boardStats,
  bedKey,
  formatSegmentName,
  heatLevel,
  BOARD_ORDER,
  HEAT_LEVELS,
} from '../../utils/heatmap';
import { ALL_BEDS, BOARD_RADIUS, NUMBER_RADIUS, bedShape, bedAngles } from '../../utils/boardGeometry';
import { effectsDefault } from '../../utils/motion';

interface DartboardHeatmapProps {
  heatmapData: HeatmapData;
  /** Largest width of the board in px; it shrinks with its container below that. */
  maxWidth?: number;
  /** Board, misses and top 3 only — for the in-game panel and match history. */
  compact?: boolean;
}

const heatFill = (level: number) =>
  level === 0 ? 'var(--m3-surface-container-highest)' : `var(--m3-heat-${level})`;

const VIEW = NUMBER_RADIUS + 8;

/**
 * Board heatmap: every real bed of the board coloured by how often it was hit.
 *
 * The app records which bed a dart hit, not where on it — there are no
 * coordinates. The previous canvas "cloud" therefore invented a scatter around
 * a fixed point per bed (and drew bulls and misses on the 6). Colouring the
 * beds themselves is the honest picture, stays sharp at any size and follows
 * the theme through the `--m3-heat-*` ramp.
 *
 * The SVG is a picture (role="img"); pointer users can tap a bed for details.
 * The keyboard and screen-reader path is the list of hit beds below it, whose
 * buttons highlight the same bed on the board.
 */
export const DartboardHeatmap: React.FC<DartboardHeatmapProps> = ({ heatmapData, maxWidth = 520, compact = false }) => {
  const { t } = useTranslation();
  const agg = useMemo(() => aggregateBeds(heatmapData), [heatmapData]);
  const stats = useMemo(() => boardStats(agg), [agg]);
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const focus = hovered ?? selected;

  const pct = (n: number) => (agg.total > 0 ? (n / agg.total) * 100 : 0);
  const nameOf = (id: string) => {
    const [s, m] = id.split('-').map(Number);
    return formatSegmentName(s, m, t);
  };

  const ranked = useMemo(
    () => Object.entries(agg.beds).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
    [agg],
  );
  const shown = compact ? ranked.slice(0, 3) : showAll ? ranked : ranked.slice(0, 5);

  // Beds grouped by colour step, so the hotter steps can fade in after the cooler ones.
  const byLevel = useMemo(() => {
    const groups: { segment: number; multiplier: number; id: string }[][] = Array.from({ length: HEAT_LEVELS + 1 }, () => []);
    for (const bed of ALL_BEDS) {
      const id = bedKey(bed.segment, bed.multiplier);
      groups[heatLevel(agg.beds[id] ?? 0, agg.max)].push({ ...bed, id });
    }
    return groups;
  }, [agg]);

  const bedFromEvent = (e: React.PointerEvent): string | null =>
    (e.target as Element).closest?.('[data-bed]')?.getAttribute('data-bed') ?? null;

  const focusShapes = focus ? bedShape(...(focus.split('-').map(Number) as [number, number])) : [];

  return (
    <div className="space-y-4">
      <div className="mx-auto w-full" style={{ maxWidth }}>
        <svg
          viewBox={`${-VIEW} ${-VIEW} ${VIEW * 2} ${VIEW * 2}`}
          className="block w-full h-auto select-none touch-manipulation"
          role="img"
          aria-label={t('heatmap.board_label', { hits: agg.hits, total: agg.total })}
          data-testid="heatmap-board"
          onPointerOver={e => setHovered(e.pointerType === 'mouse' ? bedFromEvent(e) : null)}
          onPointerLeave={() => setHovered(null)}
          onPointerDown={e => {
            const id = bedFromEvent(e);
            setSelected(prev => (id && prev !== id ? id : null));
          }}
        >
          <circle r={NUMBER_RADIUS + 7} fill="var(--m3-surface-container)" />
          {byLevel.map((beds, level) => (
            <motion.g
              key={level}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ ...effectsDefault, delay: level * 0.06 }}
            >
              {beds.map(bed =>
                bedShape(bed.segment, bed.multiplier).map((shape, i) => (
                  <path
                    key={`${bed.id}-${i}`}
                    d={shape.d}
                    fillRule="evenodd"
                    fill={heatFill(level)}
                    stroke="var(--m3-outline-variant)"
                    strokeWidth={0.4}
                    data-bed={bed.id}
                    data-level={level}
                    style={{ cursor: level > 0 ? 'pointer' : 'default' }}
                  />
                )),
              )}
            </motion.g>
          ))}
          {focusShapes.map((shape, i) => (
            <path
              key={`focus-${i}`}
              d={shape.d}
              fillRule="evenodd"
              fill="none"
              stroke="var(--m3-primary)"
              strokeWidth={1.8}
              strokeLinejoin="round"
              pointerEvents="none"
              data-testid="heatmap-focus"
            />
          ))}
          {BOARD_ORDER.map(n => {
            const { start, end } = bedAngles(n);
            const a = (((start + end) / 2) * Math.PI) / 180;
            const strong = stats.zone?.segment === n;
            return (
              <text
                key={n}
                x={NUMBER_RADIUS * Math.cos(a)}
                y={NUMBER_RADIUS * Math.sin(a)}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={9}
                fontWeight={strong ? 700 : 500}
                fill={strong ? 'var(--m3-on-surface)' : 'var(--m3-on-surface-variant)'}
                pointerEvents="none"
              >
                {n}
              </text>
            );
          })}
          <circle r={BOARD_RADIUS} fill="none" stroke="var(--m3-outline)" strokeWidth={0.6} pointerEvents="none" />
        </svg>

        {/* Details line: touch has no tooltips, so the tapped bed is described here. */}
        <p className="mt-2 text-center m3-body-medium text-on-surface-variant min-h-6" aria-live="polite" data-testid="heatmap-detail">
          {focus ? (
            <>
              <span className="m3-title-small text-on-surface">{nameOf(focus)}</span>
              {' · '}
              {t('heatmap.hits', { count: agg.beds[focus] ?? 0 })}
              {' · '}
              {pct(agg.beds[focus] ?? 0).toFixed(1)}%
            </>
          ) : (
            t('heatmap.tap_hint')
          )}
        </p>
      </div>

      {agg.misses > 0 && (
        <p className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-m3-full bg-surface-container-high px-3 py-1 m3-label-large text-on-surface" data-testid="heatmap-misses">
            <XCircle size={16} className="text-on-surface-variant" aria-hidden="true" />
            {t('heatmap.misses', { count: agg.misses, pct: pct(agg.misses).toFixed(1) })}
          </span>
        </p>
      )}

      {!compact && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="heatmap-stats">
          {[
            { icon: <Target size={18} className="text-primary" />, label: t('heatmap.triple_rate'), value: stats.tripleRate },
            { icon: <Percent size={18} className="text-primary" />, label: t('heatmap.double_rate'), value: stats.doubleRate },
            { icon: <CircleDot size={18} className="text-primary" />, label: t('heatmap.bull_rate'), value: stats.bullRate },
            { icon: <XCircle size={18} className="text-primary" />, label: t('heatmap.miss_rate'), value: stats.missRate },
          ].map(s => (
            <Card key={s.label} variant="filled" className="p-4">
              <div className="flex items-center gap-2 mb-1">
                {s.icon}
                <span className="m3-label-medium text-on-surface-variant">{s.label}</span>
              </div>
              <div className="m3-title-large m3-emphasized tabular-nums text-on-surface">{s.value.toFixed(1)}%</div>
            </Card>
          ))}
        </div>
      )}

      {!compact && stats.zone && (
        <Card variant="filled" className="p-4" data-testid="heatmap-zone">
          <div className="flex items-center gap-2 mb-2">
            <Crosshair size={18} className="text-primary" />
            <span className="m3-label-medium text-on-surface-variant">{t('heatmap.zone_title')}</span>
          </div>
          <div className="flex items-end justify-between gap-3">
            {[
              { n: stats.zone.left, c: stats.zone.leftCount, label: t('heatmap.zone_left') },
              { n: stats.zone.segment, c: stats.zone.count, label: t('heatmap.zone_target') },
              { n: stats.zone.right, c: stats.zone.rightCount, label: t('heatmap.zone_right') },
            ].map((z, i) => (
              <div key={z.label} className={`flex-1 text-center rounded-m3-md p-2 ${i === 1 ? 'bg-surface-container-high' : ''}`}>
                <div className="m3-label-small text-on-surface-variant">{z.label}</div>
                <div className={`${i === 1 ? 'm3-headline-small' : 'm3-title-medium'} m3-emphasized tabular-nums text-on-surface`}>{z.n}</div>
                <div className="m3-body-small text-on-surface-variant tabular-nums">{pct(z.c).toFixed(1)}%</div>
              </div>
            ))}
          </div>
          <p className="mt-2 m3-body-small text-on-surface-variant">{t('heatmap.zone_hint')}</p>
        </Card>
      )}

      {!compact && agg.max > 0 && (
        <Card variant="filled" className="p-4" data-testid="heatmap-legend">
          <h4 className="m3-title-medium text-on-surface mb-3 flex items-center gap-2">
            <Flame size={20} className="text-primary" aria-hidden="true" />
            {t('heatmap.legend')}
          </h4>
          <div className="flex items-center gap-1" aria-hidden="true">
            <span className="h-4 w-6 rounded-m3-xs border border-outline-variant" style={{ background: heatFill(0) }} />
            <span className="w-2" />
            {Array.from({ length: HEAT_LEVELS }, (_, i) => (
              <span key={i} className="h-4 flex-1 first:rounded-l-m3-xs last:rounded-r-m3-xs" style={{ background: heatFill(i + 1) }} />
            ))}
          </div>
          <div className="mt-2 flex justify-between gap-2 m3-body-small text-on-surface-variant">
            <span>{t('heatmap.legend_none')}</span>
            <span>{t('heatmap.legend_one')}</span>
            <span className="text-right">{t('heatmap.legend_max', { count: agg.max, pct: pct(agg.max).toFixed(1) })}</span>
          </div>
          <p className="mt-2 m3-body-small text-on-surface-variant">{t('heatmap.legend_hint')}</p>
        </Card>
      )}

      {shown.length > 0 && (
        <Card variant="filled" className="p-4">
          <h4 className="m3-title-medium text-on-surface mb-3 flex items-center gap-2">
            <TrendingUp size={20} className="text-primary" aria-hidden="true" />
            {showAll && !compact ? t('heatmap.all_beds', { count: ranked.length }) : t('heatmap.top_hotspots', { count: shown.length })}
          </h4>
          <ul className="space-y-1" data-testid="heatmap-list">
            {shown.map(([id, count]) => {
              const active = focus === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    aria-pressed={selected === id}
                    onClick={() => setSelected(prev => (prev === id ? null : id))}
                    onMouseEnter={() => setHovered(id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(id)}
                    onBlur={() => setHovered(null)}
                    className={`relative w-full min-h-12 overflow-hidden rounded-m3-md px-3 py-2 text-left flex items-center gap-3 m3-state-layer bg-surface-container-high ${active ? 'ring-2 ring-[var(--m3-primary)]' : ''}`}
                  >
                    <span
                      className="absolute inset-y-0 left-0 opacity-25"
                      style={{ width: `${(count / agg.max) * 100}%`, background: heatFill(heatLevel(count, agg.max)) }}
                      aria-hidden="true"
                    />
                    <span
                      className="relative h-4 w-4 shrink-0 rounded-m3-full border border-outline-variant"
                      style={{ background: heatFill(heatLevel(count, agg.max)) }}
                      aria-hidden="true"
                    />
                    <span className="relative flex-1 m3-title-small text-on-surface">{nameOf(id)}</span>
                    <span className="relative m3-body-medium tabular-nums text-on-surface-variant">
                      {t('heatmap.hits', { count })} · {pct(count).toFixed(1)}%
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {!compact && ranked.length > 5 && (
            <Button variant="text" size="sm" className="mt-2" onClick={() => setShowAll(v => !v)} aria-expanded={showAll}>
              {showAll ? t('heatmap.show_less') : t('heatmap.show_all', { count: ranked.length })}
            </Button>
          )}
        </Card>
      )}
    </div>
  );
};

export default DartboardHeatmap;
