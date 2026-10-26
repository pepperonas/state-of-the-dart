import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useReducedMotion, type Transition } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Player } from '../../types';
import { audioSystem } from '../../utils/audio';
import { iconForEmoji, ICON_PATHS, AvatarGlyph, isGameIcon, gameIconName, useAvatarPaths, isEmojiAvatar, emojiOf, EMOJI_FONT } from '../icons';
import { randomIndex, randomBetween } from '../../utils/random';
import { planSpin, angleAt, landingAngle, crossings } from '../../utils/wheelPhysics';
import { shapePolygon } from '../../utils/shapes';
import { springSpatialDefault, springSpatialFast, springSpatialSlow } from '../../utils/motion';
import { burst, originOf } from '../../utils/celebration';
import { Button } from '../common';

interface SpinnerWheelProps {
  players: Player[];
  onComplete: (startingPlayerIndex: number) => void;
}

/** The intro line plays before the wheel starts; the choice buttons stay up throughout. */
const INTRO_MS = 1500;
/** How long the result stays before the game starts (tap to go on sooner). */
const RESULT_MS = 2500;

const INTRO_SOUNDS = [
  '/sounds/who-throws-first/spin-the-wheel/time_to_spin_the_wheel.mp3',
  '/sounds/who-throws-first/spin-the-wheel/spinning_the_wheel_now.mp3',
  '/sounds/who-throws-first/spin-the-wheel/who_gets_lucky_today.mp3',
  '/sounds/who-throws-first/spin-the-wheel/may_odds_spin_in_your_favor.mp3',
  '/sounds/who-throws-first/spin-the-wheel/luck_as_your_coffee.mp3',
];

/** Wedge colours from the theme's tonal palettes (fill, label) — readable in both themes. */
const TONES: [string, string][] = [
  ['var(--m3-primary-container)', 'var(--m3-on-primary-container)'],
  ['var(--m3-tertiary-container)', 'var(--m3-on-tertiary-container)'],
  ['var(--m3-secondary-container)', 'var(--m3-on-secondary-container)'],
  ['var(--m3-success-container)', 'var(--m3-on-success-container)'],
  ['var(--m3-error-container)', 'var(--m3-on-error-container)'],
];

const VIEW = 320;
const C = VIEW / 2;
const R = 150;
/** Label band (fraction of the radius): outside the hub, inside the avatar. */
const LABEL_INNER = 0.29;
const LABEL_OUTER = 0.76;
/** Avatar centre, as a fraction of the radius — close to the rim, out of the label's way. */
const AVATAR_AT = 0.87;
/** At least this many full turns, slowed by this much drag: ~6.5 s of spin (was ~4.3 s with 5 / 0.5). */
const SPIN_TURNS = 6;
const SPIN_DRAG = 0.32;
/** Furthest a peg can push the flapper aside, in degrees. */
const FLAP_MAX = 28;
const CIRCLE = shapePolygon('circle', 144);
const BURST = shapePolygon('burst', 144);

/** A point at `deg` (0 = top, clockwise) and radius `r`. */
const at = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)] as const;
};

const wedgePath = (from: number, to: number) => {
  const [x0, y0] = at(from, R);
  const [x1, y1] = at(to, R);
  const large = to - from > 180 ? 1 : 0;
  return `M ${C} ${C} L ${x0} ${y0} A ${R} ${R} 0 ${large} 1 ${x1} ${y1} Z`;
};

const vibrate = (pattern: number | number[]) => {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;
  try { navigator.vibrate(pattern); } catch { /* blocked by policy */ }
};

/**
 * "Who throws first?" — a prize wheel with real physics. The winner is drawn
 * first; the wheel winds up, launches and coasts out under friction and drag
 * (`utils/wheelPhysics`) exactly onto that wedge, crawling past the last pegs.
 * A flapper at the top clicks and springs on every peg (sound and haptics),
 * the winning wedge lifts while the rest dim, and the hub morphs into a burst
 * with the winner on it. Every player keeps an "X begins" button the whole
 * time, and the spin can be skipped.
 */
export const SpinnerWheel: React.FC<SpinnerWheelProps> = ({ players, onComplete }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const gamePaths = useAvatarPaths(players.some(p => isGameIcon(p.avatar)));
  const count = Math.max(1, players.length);
  const seg = 360 / count;
  const rot = useMotionValue(0);
  const flap = useMotionValue(0);
  const hubRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<'intro' | 'spinning' | 'result'>('intro');
  const [winner, setWinner] = useState<number | null>(null);

  // Everything pending, so a skip or a choice cancels the spin cleanly.
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const frame = useRef<number | null>(null);
  const done = useRef(false);
  const later = (fn: () => void, ms: number) => { timers.current.push(setTimeout(fn, ms)); };
  const stopAll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (frame.current != null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };
  useEffect(() => stopAll, []);

  /** Finishes exactly once — by the wheel, a skip, or a chosen starter. */
  const finish = useCallback((index: number) => {
    if (done.current) return;
    done.current = true;
    stopAll();
    onComplete(index);
  }, [onComplete]);

  // The flapper: knocked aside by a peg, it springs back and rattles.
  // Every peg restarts the flapper from rest: `jump` drops the velocity the
  // previous spring left behind. With `set`, each new spring inherited it and
  // the pegs pumped it up until the flapper spun through 10^13 degrees.
  const lastTick = useRef(0);
  const flapAnim = useRef<ReturnType<typeof animate> | null>(null);
  const knock = (deg: number, spring: Transition) => {
    flapAnim.current?.stop();
    flap.jump(Math.max(-FLAP_MAX, Math.min(0, deg)));
    flapAnim.current = animate(flap, 0, { ...spring, velocity: 0 });
  };
  const kick = (speed: number) => {
    knock(-Math.min(FLAP_MAX, 8 + speed * 0.018), { type: 'spring', stiffness: 900, damping: 14 });
    const now = performance.now();
    if (now - lastTick.current > 35) {
      lastTick.current = now;
      audioSystem.tick(Math.min(1, speed / 900));
      vibrate(6);
    }
  };

  const reveal = (index: number) => {
    setWinner(index);
    setPhase('result');
    audioSystem.playSound('/sounds/effects/accepted_invite.mp3', true);
    vibrate([30, 40, 60]);
    later(() => burst('spark', originOf(hubRef.current)), 120);
    later(() => finish(index), RESULT_MS);
  };

  const spin = async () => {
    if (done.current) return;
    const index = randomIndex(count);
    const start = rot.get();
    const target = landingAngle(start, index, count, randomBetween(0.2, 0.8), SPIN_TURNS);
    setPhase('spinning');
    if (reduce) {
      rot.set(target);
      later(() => reveal(index), 400);
      return;
    }
    audioSystem.playSound('/sounds/games/bullseye-summit/spinner.mp3', false);
    // Wind up: pull back a little before the launch (anticipation).
    await animate(rot, start - 14, { duration: 0.28, ease: [0.3, 0, 0.8, 0.15] });
    if (done.current) return;
    const from = rot.get();
    const plan = planSpin(target - from, SPIN_DRAG, 1.4);
    const t0 = performance.now();
    const step = () => {
      if (done.current) return;
      const t = (performance.now() - t0) / 1000;
      const prev = rot.get();
      const next = from + angleAt(t, plan.w0, plan.mu, plan.k);
      rot.set(next);
      const speed = Math.max(0, (plan.w0 + plan.mu / plan.k) * Math.exp(-plan.k * t) - plan.mu / plan.k);
      if (crossings(prev, next, seg) > 0) kick(speed);
      if (t < plan.duration) {
        frame.current = requestAnimationFrame(step);
      } else {
        frame.current = null;
        rot.set(target);
        // The last peg catches the flapper: one slow teeter, then rest.
        knock(-12, springSpatialSlow);
        later(() => reveal(index), 260);
      }
    };
    frame.current = requestAnimationFrame(step);
  };

  // The intro line, then the spin.
  const started = useRef(false);
  useEffect(() => {
    if (players.length === 0 || started.current) return;
    started.current = true;
    audioSystem.playSound(INTRO_SOUNDS[Math.floor(Math.random() * INTRO_SOUNDS.length)], true);
    later(() => { void spin(); }, INTRO_MS);
    // spin reads refs and motion values only; running it once is the point.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (players.length === 0) {
    onComplete(0);
    return null;
  }

  // Each name gets the largest size that fits the room between hub and avatar
  // (capped by the wedge's width); only a name too long even at the smallest
  // size is cut.
  const room = R * (LABEL_OUTER - LABEL_INNER);
  const widest = Math.min(24, ((R * 0.5 * Math.PI * seg) / 180) * 0.4);
  const label = (name: string) => {
    const size = Math.max(14, Math.min(widest, room / (name.length * 0.58)));
    const max = Math.floor(room / (size * 0.58));
    return { size, text: name.length > max ? `${name.slice(0, max - 1)}…` : name };
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="spinner-title"
      className="fixed inset-0 bg-[color-mix(in_srgb,var(--m3-scrim)_85%,transparent)] flex items-center justify-center z-50 m3-scrim-enter p-2 sm:p-4"
      onClick={() => { if (phase === 'result' && winner != null) finish(winner); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={springSpatialDefault}
        className="flex flex-col landscape:flex-row [align-items:safe_center] [justify-content:safe_center] gap-4 sm:gap-6 landscape:gap-8 lg:landscape:gap-16 phoneland:gap-4 p-4 phoneland:p-3 sm:p-8 bg-surface-container-high rounded-m3-xl shadow-m3-3 w-full max-w-[140rem] max-h-full overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Portrait: title, wheel, buttons stacked. Landscape: the wheel takes
            the height, title and buttons stand beside it. */}
        <div className="relative w-[min(88vw,calc(100dvh-23rem),72rem)] landscape:w-[min(52vw,78dvh,72rem)] aspect-square shrink-0 portrait:order-2" data-testid="spinner-wheel" data-phase={phase}>
          {/* Idle sway while the intro plays, so the wheel looks ready to go. */}
          {/* The shadow sits on a still circle behind the wheel: a drop-shadow
              filter on the turning SVG was re-rendered every frame (45 fps on
              a 2560 screen), and the turning square's corners changed the
              dialog's scroll height — text beside it flickered. */}
          <div className="absolute inset-[3%] rounded-full shadow-m3-4" aria-hidden="true" />
          <motion.div
            className="absolute inset-0 rounded-full overflow-hidden"
            animate={phase === 'intro' && !reduce ? { rotate: [0, -4, 0] } : { rotate: 0 }}
            transition={phase === 'intro' && !reduce ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' } : springSpatialFast}
          >
            <motion.svg viewBox={`0 0 ${VIEW} ${VIEW}`} className="w-full h-full will-change-transform" style={{ rotate: rot }} aria-hidden="true">
              {players.map((p, i) => {
                const [fill, ink] = TONES[i % TONES.length];
                const from = i * seg;
                const mid = from + seg / 2;
                const isWinner = winner === i;
                const dim = winner != null && !isWinner;
                const [ix, iy] = at(mid, R * AVATAR_AT);
                const name = label(p.name);
                const leftHalf = mid > 180;
                return (
                  <motion.g
                    key={p.id}
                    // 1.02: the lifted wedge stays inside the rim stroke (3 of 150 units).
                    animate={{ scale: isWinner ? 1.02 : 1, opacity: dim ? 0.38 : 1 }}
                    transition={springSpatialDefault}
                    style={{ transformOrigin: `${C}px ${C}px` }}
                  >
                    <path
                      d={count === 1 ? `M ${C} ${C - R} A ${R} ${R} 0 1 1 ${C - 0.01} ${C - R} Z` : wedgePath(from, from + seg)}
                      fill={fill}
                      stroke="var(--m3-surface-container-high)"
                      strokeWidth={3}
                    />
                    {/* Avatar near the rim, where the wedge is widest. */}
                    {isEmojiAvatar(p.avatar) ? (
                      // Emoji avatar: a text glyph, upright along the radius like the icons.
                      <text
                        transform={`rotate(${mid} ${ix} ${iy})`}
                        x={ix}
                        y={iy + 1}
                        textAnchor="middle"
                        dominantBaseline="central"
                        fontSize={26}
                        style={{ fontFamily: EMOJI_FONT }}
                      >
                        {emojiOf(p.avatar)}
                      </text>
                    ) : isGameIcon(p.avatar) ? (
                      // game-icons.net avatar: 512 grid, default nonzero fill.
                      <g transform={`translate(${ix - 15} ${iy - 15}) rotate(${mid} 15 15) scale(${30 / 512})`}>
                        {gamePaths?.[gameIconName(p.avatar)] && <path d={gamePaths[gameIconName(p.avatar)]} fill={ink} />}
                      </g>
                    ) : (
                      <g transform={`translate(${ix - 15} ${iy - 15}) rotate(${mid} 15 15) scale(${30 / 24})`}>
                        <path d={ICON_PATHS[iconForEmoji(p.avatar)]} fill={ink} fillRule="evenodd" />
                      </g>
                    )}
                    {/* Name along the radius, between hub and avatar, never upside
                        down: on the left half it is turned the other way. */}
                    <text
                      transform={`rotate(${leftHalf ? mid + 90 : mid - 90} ${C} ${C})`}
                      x={leftHalf ? C - R * LABEL_OUTER : C + R * LABEL_OUTER}
                      y={C}
                      textAnchor={leftHalf ? 'start' : 'end'}
                      dominantBaseline="middle"
                      fill={ink}
                      style={{ fontSize: name.size, fontWeight: 800 }}
                    >
                      {name.text}
                    </text>
                  </motion.g>
                );
              })}
              {/* Rim with a peg at every divider. */}
              <circle cx={C} cy={C} r={R} fill="none" stroke="var(--m3-outline-variant)" strokeWidth={6} />
              {players.map((p, i) => {
                const [px, py] = at(i * seg, R - 3);
                return <circle key={`peg-${p.id}`} cx={px} cy={py} r={4} fill="var(--m3-on-surface)" />;
              })}
            </motion.svg>
          </motion.div>

          {/* Hub: a circle that bursts open on the winner. */}
          <motion.div
            ref={hubRef}
            className="absolute left-1/2 top-1/2 w-1/4 h-1/4 -ml-[12.5%] -mt-[12.5%] flex items-center justify-center bg-tertiary text-on-tertiary shadow-m3-3"
            animate={{
              clipPath: phase === 'result' ? BURST : CIRCLE,
              scale: phase === 'result' ? 1.25 : 1,
              rotate: phase === 'result' ? 20 : 0,
            }}
            transition={springSpatialDefault}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              {phase === 'result' && winner != null ? (
                <motion.span key="winner" className="w-1/2 h-1/2 flex" initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={springSpatialFast}>
                  <AvatarGlyph avatar={players[winner].avatar} size="100%" />
                </motion.span>
              ) : (
                <motion.span key="spin" className="m3-title-large font-bold tracking-wider" style={{ fontSize: 'clamp(1.1rem, 2.6vmin, 2.75rem)' }} exit={{ scale: 0.4, opacity: 0 }}>
                  {t('spinner.spin')}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Flapper: knocked by every peg, springs back. */}
          <motion.div
            className="absolute left-1/2 -top-[2.5%] -ml-[5%] w-[10%] h-[13.75%] origin-top z-10"
            data-testid="spinner-flapper"
            style={{ rotate: flap }}
            aria-hidden="true"
          >
            <svg viewBox="0 0 32 44" className="w-full h-full drop-shadow-md">
              <path d="M16 44 C 6 30, 2 22, 2 14 A 14 14 0 0 1 30 14 C 30 22, 26 30, 16 44 Z" fill="var(--m3-tertiary)" />
              <circle cx="16" cy="14" r="5" fill="var(--m3-on-tertiary)" />
            </svg>
          </motion.div>
        </div>

        {/* The choice buttons and the result share one grid cell: they never
            show together, and the cell keeps the taller one's height, so the
            wheel does not jump when the result replaces the buttons. */}
        <div className="portrait:contents flex flex-col items-center gap-6 lg:gap-10 phoneland:gap-3 landscape:flex-1 landscape:max-w-xl min-w-0">
        <h2 id="spinner-title" className="m3-display-small m3-emphasized text-on-surface text-center portrait:order-1"
          // Sized by the shorter side, so a phone on its side does not get a desktop headline.
          style={{ fontSize: 'clamp(1.75rem, min(3.8vw, 6vh), 4rem)', lineHeight: 1.1 }}>
          {t('game.who_starts')}
        </h2>
        <div className="grid w-full place-items-center [&>*]:[grid-area:1/1] portrait:order-3">
        {/* Result: the winner's name springs in. */}
        <div className="flex items-center justify-center" aria-live="polite">
          <AnimatePresence>
            {phase === 'result' && winner != null && (
              <motion.div
                key="result"
                data-testid="spinner-result"
                initial={{ opacity: 0, y: 14, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={springSpatialDefault}
                className="text-center"
              >
                <div className="m3-display-medium m3-emphasized text-tertiary break-words" style={{ fontSize: 'clamp(2.5rem, min(6.5vw, 10vh), 6.5rem)', lineHeight: 1.05 }}>{players[winner].name}</div>
                <div className="m3-headline-small text-on-surface-variant" style={{ fontSize: 'clamp(1.25rem, min(2vw, 3.2vh), 2.5rem)' }}>{t('spinner.throws_first')}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* The wheel runs on every game — never force it: anyone can be picked directly. */}
        {/* Kept in the layout (hidden, inert) once the result shows, so the cell keeps its height. */}
          <div className={`flex flex-col items-center gap-2 sm:gap-3 w-full ${phase === 'result' ? 'invisible' : ''}`} inert={phase === 'result'}>
            {/* Five players and more on a phone: two buttons a line instead of
                eight full-width pills below the fold (0.45.0). */}
            <div
              className={`gap-2 sm:gap-3 ${players.length >= 5 ? 'grid grid-cols-2 w-full sm:flex sm:flex-wrap sm:justify-center' : 'flex flex-wrap justify-center'}`}
              role="group"
              aria-label={t('game.who_starts')}
              data-testid="starter-buttons"
            >
              {players.map((p, i) => (
                <motion.button
                  key={p.id}
                  type="button"
                  onClick={() => finish(i)}
                  aria-label={players.length >= 5 ? t('game.starts', { name: p.name }) : undefined}
                  whileTap={{ scale: 0.94 }}
                  transition={springSpatialFast}
                  className="m3-state-layer m3-ripple inline-flex min-w-0 items-center gap-[0.6em] min-h-[max(48px,3em)] phoneland:min-h-[44px] pl-[0.4em] pr-[1.1em] rounded-m3-full border border-outline-variant bg-surface-container text-on-surface m3-title-medium"
                  // Grows with the screen like the wheel; never below the 48 px touch target.
                  style={{ fontSize: 'clamp(1rem, 1.7vmin, 1.75rem)' }}
                >
                  <span
                    className="shrink-0 w-[2.2em] h-[2.2em] rounded-m3-full flex items-center justify-center"
                    style={{ background: TONES[i % TONES.length][0], color: TONES[i % TONES.length][1] }}
                  >
                    <AvatarGlyph avatar={p.avatar} size="1.2em" />
                  </span>
                  {/* Two a line: the name alone fits; the heading says the rest. */}
                  <span className="truncate">{players.length >= 5 ? p.name : t('game.starts', { name: p.name })}</span>
                </motion.button>
              ))}
            </div>
            <Button variant="text" size="lg" onClick={() => finish(randomIndex(players.length))}>
              {t('game.skip_spinner')}
            </Button>
          </div>
        </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SpinnerWheel;
