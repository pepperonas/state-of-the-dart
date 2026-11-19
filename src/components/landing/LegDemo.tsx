import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { BOARD_ORDER } from '../../utils/heatmap';
import { RINGS, NUMBER_RADIUS, bedAngles, bedShape, wedgePath, discPath } from '../../utils/boardGeometry';
import AnimatedNumber from '../common/AnimatedNumber';
import { buildDemoFrames, DEMO_AVERAGE, DEMO_DARTS, STILL_FRAME_INDEX, type DemoDart } from './legScript';

/**
 * The landing page's hero: a nine-darter played out on a real board, the
 * scoreboard counting down beside it — what the app does, shown instead of
 * described. Geometry from boardGeometry (the heatmap's), numbers from
 * legScript (tested). Runs only while on screen; reduced motion gets one
 * still frame.
 */

// Regulation board colours — the board is the subject, not a theme surface.
const BOARD = { black: '#1b1a1c', cream: '#efe6cf', red: '#d7263d', green: '#1f8a4c', wire: '#9a9aa0', surround: '#121113' };

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: r * Math.cos(a), y: r * Math.sin(a) };
};

/** Where a dart in this bed lands; `n` spreads darts that share a bed. */
const landing = (d: DemoDart, n: number) => {
  const { start, end } = bedAngles(d.segment);
  const mid = (start + end) / 2 + (n - 1) * 4.5;
  const r = d.multiplier === 3 ? (RINGS.tripleInner + RINGS.tripleOuter) / 2
    : d.multiplier === 2 ? (RINGS.doubleInner + RINGS.doubleOuter) / 2
      : (RINGS.tripleOuter + RINGS.doubleInner) / 2;
  return pt(r, mid);
};

const Board: React.FC = React.memo(() => (
  <g>
    <circle r={124} fill={BOARD.surround} />
    {BOARD_ORDER.map((seg, i) => {
      const { start, end } = bedAngles(seg);
      const dark = i % 2 === 0;
      const single = dark ? BOARD.black : BOARD.cream;
      const ring = dark ? BOARD.red : BOARD.green;
      return (
        <g key={seg}>
          <path d={wedgePath(start, end, RINGS.outerBull, RINGS.tripleInner)} fill={single} />
          <path d={wedgePath(start, end, RINGS.tripleInner, RINGS.tripleOuter)} fill={ring} />
          <path d={wedgePath(start, end, RINGS.tripleOuter, RINGS.doubleInner)} fill={single} />
          <path d={wedgePath(start, end, RINGS.doubleInner, RINGS.doubleOuter)} fill={ring} />
        </g>
      );
    })}
    <path d={discPath(RINGS.bull, RINGS.outerBull)} fill={BOARD.green} fillRule="evenodd" />
    <path d={discPath(0, RINGS.bull)} fill={BOARD.red} />
    {/* Spider wire */}
    <g stroke={BOARD.wire} strokeWidth={0.45} fill="none" opacity={0.7}>
      {[RINGS.outerBull, RINGS.tripleInner, RINGS.tripleOuter, RINGS.doubleInner, RINGS.doubleOuter].map(r => <circle key={r} r={r} />)}
      {BOARD_ORDER.map(seg => {
        const a = pt(RINGS.outerBull, bedAngles(seg).start);
        const b = pt(RINGS.doubleOuter, bedAngles(seg).start);
        return <line key={seg} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      })}
    </g>
    {BOARD_ORDER.map(seg => {
      const { start, end } = bedAngles(seg);
      const p = pt(NUMBER_RADIUS, (start + end) / 2);
      return (
        <text key={seg} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fill="#f4f1ea"
          style={{ fontFamily: 'var(--sotd-font-display)', fontSize: 12, letterSpacing: '0.02em' }}>
          {seg}
        </text>
      );
    })}
    {/* Soft light from above-left, so the board sits in the arena. */}
    <circle r={124} fill="url(#legdemo-light)" pointerEvents="none" />
  </g>
));
Board.displayName = 'Board';

/** A dart stuck in the board: the tip at (0,0), barrel and flight towards the viewer. */
const Dart: React.FC = () => (
  <g transform="scale(1.7)">
    <line x1={0} y1={0} x2={9} y2={-11} stroke="#2a2a2e" strokeWidth={2.6} strokeLinecap="round" />
    <line x1={0} y1={0} x2={9} y2={-11} stroke="#d9dbe0" strokeWidth={1.6} strokeLinecap="round" />
    <polygon points="8,-10 21,-15 15,-23" fill="var(--m3-tertiary)" stroke="#2a1608" strokeWidth={0.6} />
    <polygon points="8,-10 13,-24 6,-19" fill="var(--m3-primary)" stroke="#2a1608" strokeWidth={0.6} />
  </g>
);

const LegDemo: React.FC = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const frames = useMemo(() => buildDemoFrames(), []);
  const [index, setIndex] = useState(reduce ? STILL_FRAME_INDEX : 0);
  const [visible, setVisible] = useState(true);
  const rootRef = useRef<HTMLElement>(null);

  // Play only while the demo is on screen and the tab is in front.
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (reduce || !visible) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) return;
      setIndex(i => (i + 1) % frames.length);
    }, frames[index].hold);
    return () => window.clearTimeout(timer);
  }, [index, visible, reduce, frames]);

  const frame = frames[reduce ? STILL_FRAME_INDEX : index];
  const visitKey = frames.slice(0, index + 1).filter(f => f.darts.length === 0).length;

  return (
    <figure
      ref={rootRef}
      data-testid="leg-demo"
      className="relative grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)] items-center"
    >
      <figcaption className="sr-only">{t('landing.demo_label', { darts: DEMO_DARTS, average: DEMO_AVERAGE })}</figcaption>

      <svg viewBox="-134 -134 268 276" className="w-full max-w-[26rem] mx-auto h-auto" aria-hidden="true">
        <defs>
          <radialGradient id="legdemo-light" cx="30%" cy="22%" r="80%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity={0.14} />
            <stop offset="55%" stopColor="#ffffff" stopOpacity={0} />
            <stop offset="100%" stopColor="#000000" stopOpacity={0.35} />
          </radialGradient>
          <filter id="legdemo-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        {/* The board hangs a little off the wall. */}
        <circle r={122} cy={9} fill="#000000" opacity={0.45} filter="url(#legdemo-shadow)" />
        <Board />
        {/* The beds of this visit light up gold. */}
        {frame.darts.map((d, i) =>
          bedShape(d.segment, d.multiplier).map((s, k) => (
            <motion.path key={`hit-${visitKey}-${i}-${k}`} d={s.d} fill="var(--m3-tertiary)"
              initial={{ opacity: reduce ? 0.55 : 0 }} animate={{ opacity: 0.55 }} transition={{ duration: 0.25 }} />
          )),
        )}
        <AnimatePresence>
          {frame.darts.map((d, i) => {
            const p = landing(d, frame.darts.filter((o, j) => j < i && o.label === d.label).length);
            return (
              <g key={`dart-${visitKey}-${i}`} transform={`translate(${p.x} ${p.y})`}>
                <motion.g
                  initial={reduce ? false : { x: 34, y: -40, scale: 1.5, opacity: 0 }}
                  animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                  exit={{ opacity: 0, transition: { duration: 0.25 } }}
                  transition={{ type: 'spring', stiffness: 520, damping: 30 }}
                >
                  <Dart />
                </motion.g>
              </g>
            );
          })}
        </AnimatePresence>
      </svg>

      {/* The scoreboard, as the app shows it. */}
      <div aria-hidden="true" className="rounded-m3-xl bg-surface-container-high shadow-m3-3 p-4 sm:p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="m3-label-large text-on-surface-variant">{t('landing.demo_remaining')}</span>
          <span className="m3-label-medium text-on-surface-variant">{t('landing.demo_rules')}</span>
        </div>
        <AnimatedNumber numeral value={frame.remaining}
          className={`block text-[clamp(3.5rem,8vw,5rem)] leading-none mt-1 ${frame.checkout ? 'text-primary' : 'text-on-surface'}`} />
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[0, 1, 2].map(i => (
            <span key={i} className="h-10 rounded-m3-md bg-surface-container-highest grid place-items-center m3-title-medium text-on-surface tabular-nums">
              {frame.darts[i]?.label ?? '–'}
            </span>
          ))}
        </div>
        <div className="mt-3 min-h-[2.5rem] flex items-center">
          {frame.done ? (
            <span className="flex flex-col">
              <span className="m3-headline-medium text-tertiary">{t('landing.demo_gameshot')}</span>
              <span className="m3-label-large text-on-surface-variant">{t('landing.demo_stats', { darts: DEMO_DARTS, average: DEMO_AVERAGE })}</span>
            </span>
          ) : frame.checkout ? (
            <span className="flex items-center gap-1.5 flex-wrap">
              <span className="m3-label-medium text-on-surface-variant mr-1">{t('landing.demo_checkout')}</span>
              {frame.checkout.map(c => (
                <span key={c} className="px-2 py-0.5 rounded-m3-sm bg-tertiary-container text-on-tertiary-container m3-label-large tabular-nums">{c}</span>
              ))}
            </span>
          ) : (
            <span className="m3-label-large text-on-surface-variant">
              {t('landing.demo_visit')} <span className="text-on-surface tabular-nums">{frame.visitTotal}</span>
            </span>
          )}
        </div>
      </div>
    </figure>
  );
};

export default LegDemo;
