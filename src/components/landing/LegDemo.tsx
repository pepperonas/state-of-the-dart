import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { RINGS, bedAngles, bedShape } from '../../utils/boardGeometry';
import BoardFace from '../dartboard/BoardFace';
import AnimatedNumber from '../common/AnimatedNumber';
import { buildDemoFrames, DEMO_AVERAGE, DEMO_DARTS, STILL_FRAME_INDEX, type DemoDart } from './legScript';

/**
 * The landing page's hero: a nine-darter played out on a real board, the
 * scoreboard counting down beside it — what the app does, shown instead of
 * described. Geometry from boardGeometry (the heatmap's), numbers from
 * legScript (tested). Runs only while on screen; reduced motion gets one
 * still frame.
 */

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

/**
 * A steel-tip dart stuck in the board, seen from the oche: the tip at (0,0),
 * the dart rising up and to the right towards the viewer, so the flights are
 * drawn larger than the barrel (perspective). Drawn along +x, then tilted.
 * Parts: steel point, knurled tungsten barrel, shaft, three flights (two seen
 * at an angle, one edge-on).
 */
const DART_TILT = -62;
const DartBody: React.FC<{ id: string }> = ({ id }) => (
  <g transform={`scale(1.55) rotate(${DART_TILT})`}>
    {/* point — mostly in the board, a short glint shows */}
    <path d="M0 0 L5.5 -0.55 L5.5 0.55 Z" fill={`url(#${id}-steel)`} />
    {/* barrel: tapered, tungsten, grip rings */}
    <path d="M5 -1.05 C9 -1.5 15 -1.75 18.5 -1.45 L18.5 1.45 C15 1.75 9 1.5 5 1.05 Z" fill={`url(#${id}-barrel)`} />
    <g stroke="#2b2d32" strokeWidth={0.32} opacity={0.85}>
      {[8, 9.2, 10.4, 11.6, 12.8, 14].map(x => <line key={x} x1={x} y1={-1.55} x2={x} y2={1.55} />)}
    </g>
    <path d="M6 -0.7 C10 -1.05 15 -1.15 18 -0.95" stroke="#ffffff" strokeOpacity={0.55} strokeWidth={0.35} fill="none" />
    {/* shaft */}
    <path d="M18.5 -0.9 L27 -1.05 L27 1.05 L18.5 0.9 Z" fill="#1d1c21" />
    <path d="M18.5 -0.55 L27 -0.65" stroke="#ffffff" strokeOpacity={0.25} strokeWidth={0.3} />
    {/* flights: the far one darker, the near one bright, the third edge-on */}
    <path d="M22 -0.6 L24.6 -5 Q26 -7.5 29 -8.1 L35 -9 L35.5 -0.6 Z" fill="var(--m3-primary-container)" stroke="#0e0a0b" strokeWidth={0.35} strokeLinejoin="round" />
    <path d="M22 0.6 L25 6 Q26.6 9 30 9.8 L36.5 11.2 L36.5 0.6 Z" fill="var(--m3-primary)" stroke="#0e0a0b" strokeWidth={0.35} strokeLinejoin="round" />
    <path d="M23.5 1.4 L35.5 1.4" stroke="#ffffff" strokeOpacity={0.35} strokeWidth={0.5} />
    <path d="M28 5.2 L34.5 7" stroke="var(--m3-tertiary)" strokeWidth={0.9} strokeLinecap="round" />
    <path d="M22 0 L36 0" stroke="#0e0a0b" strokeWidth={1.1} strokeLinecap="round" />
    <path d="M22 0 L36 0" stroke="var(--m3-tertiary)" strokeWidth={0.5} strokeLinecap="round" />
  </g>
);

/** The dart's shadow on the board: light from above-left, so it falls down-right of the dart. */
const DartShadow: React.FC<{ id: string }> = ({ id }) => (
  <g transform={`scale(1.55) rotate(${DART_TILT + 14})`} filter={`url(#${id}-blur)`} opacity={0.5}>
    <path d="M1 0 L19 -1.4 L27 -1 L27 1 L19 1.4 Z" fill="#000000" />
    <path d="M22 0 L27 7 L35 8.5 L35 -7 L27 -6 Z" fill="#000000" />
  </g>
);

/** Invisible square centred on the tip, so framer's transform origin (bbox centre) is the tip. */
const TipAnchor = () => <rect x={-60} y={-60} width={120} height={120} fill="none" />;

/** Flight in, strike, then the flights shiver and settle — keyframe times share one clock. */
const FLIGHT = { duration: 0.9, times: [0, 0.34, 0.48, 0.62, 0.76, 0.9, 1], ease: 'easeOut' as const };

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
          <filter id="legdemo-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          <filter id="legdemo-dart-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="0.9" />
          </filter>
          <linearGradient id="legdemo-dart-barrel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5d6067" />
            <stop offset="28%" stopColor="#d6d9de" />
            <stop offset="55%" stopColor="#8b8f97" />
            <stop offset="100%" stopColor="#3a3c42" />
          </linearGradient>
          <linearGradient id="legdemo-dart-steel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#9fa3aa" />
            <stop offset="45%" stopColor="#f2f3f5" />
            <stop offset="100%" stopColor="#6c7077" />
          </linearGradient>
        </defs>
        {/* The board hangs a little off the wall. */}
        <circle r={122} cy={9} fill="#000000" opacity={0.45} filter="url(#legdemo-shadow)" />
        <BoardFace />
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
              <motion.g key={`dart-${visitKey}-${i}`} exit={{ opacity: 0, transition: { duration: 0.25 } }}>
                <g transform={`translate(${p.x} ${p.y})`}>
                <motion.g
                  initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                  animate={reduce ? { opacity: 1 } : { opacity: [0, 0, 1, 1, 1, 1, 1], scale: [0.6, 0.6, 1, 1, 1, 1, 1] }}
                  transition={FLIGHT}
                >
                  <TipAnchor />
                  <DartShadow id="legdemo-dart" />
                </motion.g>
                <motion.g
                  initial={reduce ? false : { x: 26, y: 70, scale: 2.8, rotate: 10, opacity: 0 }}
                  animate={reduce ? { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 } : {
                    x: [26, 0, 0, 0, 0, 0, 0],
                    y: [70, 0, 0, 0, 0, 0, 0],
                    scale: [2.8, 1, 1.04, 1, 1, 1, 1],
                    rotate: [10, 0, 7, -4.5, 2.5, -1, 0],
                    opacity: [0, 1, 1, 1, 1, 1, 1],
                  }}
                  transition={FLIGHT}
                >
                  <TipAnchor />
                  <DartBody id="legdemo-dart" />
                </motion.g>
                </g>
              </motion.g>
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
