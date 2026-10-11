import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import { Maximize, Minimize } from 'lucide-react';
import AnimatedNumber from '../common/AnimatedNumber';
import PlayerAvatar from '../player/PlayerAvatar';
import RankStamp from './RankStamp';
import Icon from '../icons/Icon';
import { burst } from '../../utils/celebration';
import { springSpatialDefault, springSpatialSlow, springStandardFast } from '../../utils/motion';
import { shapePolygon } from '../../utils/shapes';
import {
  isNewer, momentBetween, readScoreboard, subscribeScoreboard,
  type ScoreboardMoment, type ScoreboardPlayer, type ScoreboardSnapshot,
} from '../../utils/scoreboard';

/** How long each big-screen moment stays. A won match stays as its own panel. */
const MOMENT_MS: Record<ScoreboardMoment['kind'], number> = {
  visit: 1800, ton: 1800, '180': 2400, bust: 1400, leg: 2600, match: 0,
};
/** The pointer and the corner buttons hide after this long without movement. */
const IDLE_MS = 2500;

const CIRCLE = shapePolygon('circle', 144);
const BURST = shapePolygon('burst', 144);

type ShownMoment = ScoreboardMoment & { key: number };

const LegPips: React.FC<{ won: number; total: number; className?: string }> = ({ won, total, className = '' }) => (
  <span className={`inline-flex items-center gap-[0.6vmin] ${className}`} aria-hidden="true">
    {Array.from({ length: Math.min(total, 9) }, (_, i) => (
      <span
        key={i}
        className={`block rounded-full w-[1.6vmin] h-[1.6vmin] transition ${i < won ? 'bg-tertiary' : 'border-2 border-outline-variant'}`}
      />
    ))}
  </span>
);

/**
 * TV / second-screen scoreboard (`/scoreboard`). Display only: it renders the
 * snapshot the game screen publishes on this device and never writes a match.
 * Sized in viewport units so it reads from across the room — the remaining
 * score fills about a third of the screen height.
 */
const ScoreboardScreen: React.FC = () => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const [snap, setSnap] = useState<ScoreboardSnapshot | null>(() => readScoreboard());
  const [moment, setMoment] = useState<ShownMoment | null>(null);
  const shownRef = useRef<ScoreboardSnapshot | null>(snap);

  useEffect(() => subscribeScoreboard(next => {
    const shown = shownRef.current;
    if (!isNewer(shown, next)) return;
    const m = momentBetween(shown, next);
    shownRef.current = next;
    setSnap(next);
    if (m) setMoment({ ...m, key: next.updatedAt });
  }), []);

  // Particles for the big moments; each moment clears itself.
  useEffect(() => {
    if (!moment) return;
    if (moment.kind === '180') burst('hero');
    else if (moment.kind === 'ton') burst('spark', { x: 0.32, y: 0.45 });
    else if (moment.kind === 'leg') burst('radial', { x: 0.5, y: 0.45 });
    else if (moment.kind === 'match') burst('match');
    const ms = MOMENT_MS[moment.kind];
    if (!ms) return;
    const timer = setTimeout(() => setMoment(m => (m?.key === moment.key ? null : m)), ms);
    return () => clearTimeout(timer);
  }, [moment]);

  // A TV shows no pointer: it and the corner buttons fade after a moment.
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let timer = setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_MS);
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('keydown', wake);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  const [fullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  }, []);

  const active = snap?.players[snap.activeIndex];
  const legsLabel = snap ? t('scoreboard.legs_to_win', { count: snap.legsToWin }) : '';

  return (
    <div
      data-scoreboard
      data-testid="scoreboard"
      className={`fixed inset-0 z-40 flex flex-col overflow-hidden bg-surface text-on-surface ${idle ? 'cursor-none' : ''}`}
    >
      <header className="flex items-center gap-[2vmin] px-[3vmin] pt-[2.5vmin] pb-[1.5vmin]">
        <h1 className="m3-title-large tracking-wide text-on-surface-variant">{t('scoreboard.title')}</h1>
        {snap && (
          <p className="text-[2.6vmin] font-semibold text-on-surface-variant tabular-nums" data-testid="scoreboard-format">
            {snap.startScore} · {legsLabel}
            {snap.showSets && <> · {t('scoreboard.sets_to_win', { count: snap.setsToWin })}</>}
            {snap.rules && <> · {snap.rules}</>}
          </p>
        )}
        <span className="flex-1" />
        {snap?.status === 'in-progress' && (
          <span className="inline-flex items-center gap-[1vmin] text-[2.4vmin] font-bold uppercase text-error">
            <span className="block w-[1.4vmin] h-[1.4vmin] rounded-full bg-error sotd-ring-pulse" />
            {t('scoreboard.live')}
          </span>
        )}
        {snap?.status === 'paused' && (
          <span className="text-[2.4vmin] font-bold uppercase text-on-surface-variant">{t('scoreboard.paused')}</span>
        )}
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? t('scoreboard.exit_fullscreen') : t('scoreboard.fullscreen')}
          className={`m3-icon-button m3-state-layer ml-[1vmin] p-2 rounded-m3-full text-on-surface-variant transition ${idle ? 'opacity-0' : 'opacity-100'}`}
        >
          {fullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
        </button>
      </header>

      {!snap || !active ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-[2vmin] px-[6vmin] text-center" data-testid="scoreboard-waiting">
          <Icon name="target" size={96} className="text-primary" />
          <p className="text-[5vmin] font-bold">{t('scoreboard.waiting')}</p>
          <p className="text-[2.8vmin] text-on-surface-variant max-w-[70ch]">{t('scoreboard.waiting_hint')}</p>
        </div>
      ) : (
        <LayoutGroup id="scoreboard">
          <main className="flex-1 min-h-0 grid gap-[2.5vmin] px-[3vmin] pb-[3vmin] grid-rows-[auto_1fr] landscape:grid-rows-1 landscape:grid-cols-[1.55fr_1fr]">
            <Hero snap={snap} player={active} reduce={!!reduce} />
            <section aria-label={t('scoreboard.standings')} className="min-h-0 flex flex-col gap-[1.4vmin] overflow-hidden">
              <ol className="flex flex-col gap-[1.4vmin]" role="list">
                {snap.players.map((p, i) => (
                  <Row key={p.id} player={p} active={i === snap.activeIndex} snap={snap} />
                ))}
              </ol>
            </section>
          </main>
        </LayoutGroup>
      )}

      <AnimatePresence>
        {moment && moment.kind !== 'match' && <MomentOverlay key={moment.key} moment={moment} reduce={!!reduce} />}
      </AnimatePresence>
      <AnimatePresence>
        {snap?.status === 'completed' && <WinnerPanel key={snap.matchId} snap={snap} />}
      </AnimatePresence>
    </div>
  );
};

const Hero: React.FC<{ snap: ScoreboardSnapshot; player: ScoreboardPlayer; reduce: boolean }> = ({ snap, player, reduce }) => {
  const { t } = useTranslation();
  // Only a turn change rises in; opening or reloading the window shows the
  // player at once (state adjusted during render, no effect).
  const [shownId, setShownId] = useState(player.id);
  const [turnChanged, setTurnChanged] = useState(false);
  if (player.id !== shownId) {
    setShownId(player.id);
    setTurnChanged(true);
  }
  const animateIn = !reduce && turnChanged;
  return (
    <motion.section
      layoutId={`sb-hero`}
      transition={{ layout: springSpatialSlow }}
      data-testid="scoreboard-hero"
      aria-live="off"
      className="relative min-h-0 flex flex-col justify-between overflow-hidden rounded-[4vmin] bg-surface-container-high p-[3.5vmin] sotd-on-fire"
    >
      {/* The outgoing player leaves at once and the next one rises in. No exit
          animation: it runs on requestAnimationFrame, which sleeps in a window
          that is not in front — the old content would linger in the DOM. */}
      <motion.div
          key={player.id}
          initial={animateIn ? { opacity: 0, y: 24 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ opacity: { duration: 0.24, ease: [0.2, 0, 0, 1] }, y: springSpatialDefault }}
          className="flex flex-col gap-[1.5vmin] min-h-0 h-full"
        >
          <div className="flex items-center gap-[2vmin] min-w-0">
            <PlayerAvatar avatar={player.avatar} name={player.name} size="xl" />
            <h2 className="text-[6.5vmin] font-bold leading-tight truncate" data-testid="scoreboard-active-name">{player.name}</h2>
            <span className="flex-1" />
            {player.rank != null && <RankStamp rank={player.rank} size="strip" className="!text-[7vmin]" />}
          </div>

          <div className="flex-1 min-h-0 flex items-center">
            <span className="sr-only">{t('scoreboard.remaining')}</span>
            <AnimatedNumber
              value={player.remaining}
              numeral
              className="block font-bold leading-[0.85] tabular-nums text-[min(32vh,24vw)] portrait:text-[min(22vh,30vw)]"
            />
          </div>

          <div className="flex flex-wrap items-end gap-x-[3vmin] gap-y-[1.5vmin]">
            <div className="flex items-center gap-[1.4vmin]" data-testid="scoreboard-visit">
              <span className="text-[2.6vmin] uppercase font-semibold text-on-surface-variant">{t('scoreboard.visit')}</span>
              <span className="inline-flex gap-[0.8vmin]" aria-hidden="true">
                {[0, 1, 2].map(i => (
                  <span key={i} className={`block w-[1.8vmin] h-[1.8vmin] rounded-full transition ${i < snap.throwDarts ? 'bg-primary' : 'border-2 border-outline-variant'}`} />
                ))}
              </span>
              <AnimatedNumber value={snap.throwTotal} className="text-[5vmin] font-bold tabular-nums" />
            </div>
            {snap.checkoutRoute && snap.checkoutRoute.length > 0 && (
              <div className="flex items-center gap-[1.2vmin]" data-testid="scoreboard-checkout">
                <span className="text-[2.6vmin] uppercase font-semibold text-on-surface-variant">{t('scoreboard.checkout')}</span>
                {snap.checkoutRoute.map((d, i) => (
                  <motion.span
                    key={`${d}-${i}`}
                    initial={reduce ? false : { scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ ...springSpatialDefault, delay: i * 0.05 }}
                    className="px-[1.6vmin] py-[0.6vmin] rounded-m3-full bg-tertiary-container text-on-tertiary-container text-[3.6vmin] font-bold"
                  >
                    {d}
                  </motion.span>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-[3vmin] gap-y-[1vmin] text-[2.8vmin] text-on-surface-variant tabular-nums">
            <span>{t('scoreboard.average')} <b className="text-on-surface">{player.average.toFixed(1)}</b></span>
            <span>{t('scoreboard.darts_in_leg')} <b className="text-on-surface">{player.dartsInLeg}</b></span>
            <span className="inline-flex items-center gap-[1vmin]">
              {t('scoreboard.legs')} <LegPips won={player.legsWon} total={snap.legsToWin} />
            </span>
            {snap.showSets && <span>{t('scoreboard.sets')} <b className="text-on-surface">{player.setsWon}</b></span>}
            {player.visits.length > 0 && (
              <span className="inline-flex gap-[0.8vmin]">
                {player.visits.slice(-4).map((v, i) => (
                  <span
                    key={i}
                    className={`px-[1.2vmin] rounded-m3-full text-[2.4vmin] font-semibold ${v.bust ? 'bg-error-container text-on-error-container' : v.score >= 100 ? 'bg-tertiary-container text-on-tertiary-container' : 'bg-surface-container-highest text-on-surface'}`}
                  >
                    {v.bust ? t('scoreboard.bust') : v.score}
                  </span>
                ))}
              </span>
            )}
          </div>
        </motion.div>
    </motion.section>
  );
};

const Row: React.FC<{ player: ScoreboardPlayer; active: boolean; snap: ScoreboardSnapshot }> = ({ player, active, snap }) => (
  <motion.li
    layout="position"
    transition={{ layout: springSpatialDefault }}
    data-testid={`scoreboard-row-${player.name}`}
    data-active={active || undefined}
    aria-current={active || undefined}
    className={`flex items-center gap-[2vmin] rounded-[3vmin] px-[2.4vmin] py-[1.6vmin] transition ${active ? 'bg-primary-container text-on-primary-container' : 'bg-surface-container'}`}
  >
    <PlayerAvatar avatar={player.avatar} name={player.name} size="md" />
    <div className="min-w-0 flex-1">
      <p className="text-[3.6vmin] font-bold leading-tight truncate">{player.name}</p>
      <div className="flex items-center gap-[1.4vmin] mt-[0.4vmin] text-[2.2vmin] tabular-nums opacity-100">
        <LegPips won={player.legsWon} total={snap.legsToWin} />
        {snap.showSets && <span className="font-semibold">{player.setsWon}</span>}
        <span className="font-semibold">{player.average.toFixed(1)}</span>
      </div>
    </div>
    {player.rank != null && <RankStamp rank={player.rank} size="strip" className="!text-[4.5vmin]" />}
    <AnimatedNumber value={player.remaining} numeral className="text-[8vmin] font-bold leading-none tabular-nums" />
  </motion.li>
);

const MomentOverlay: React.FC<{ moment: ShownMoment; reduce: boolean }> = ({ moment, reduce }) => {
  const { t } = useTranslation();
  const big = moment.kind === '180' || moment.kind === 'leg';
  const text = moment.kind === 'bust' ? t('scoreboard.bust')
    : moment.kind === 'leg' ? t('scoreboard.leg_won', { name: moment.name })
    : String(moment.score);
  const tone = moment.kind === 'bust' ? 'bg-error-container text-on-error-container'
    : moment.kind === '180' || moment.kind === 'ton' ? 'bg-tertiary-container text-on-tertiary-container'
    : moment.kind === 'leg' ? 'bg-primary-container text-on-primary-container'
    : 'bg-surface-container-highest text-on-surface';

  // A plain visit is a small banner at the bottom; the rest take the stage.
  if (moment.kind === 'visit') {
    return (
      <motion.div
        data-testid="scoreboard-moment"
        data-kind={moment.kind}
        initial={reduce ? { opacity: 0 } : { opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        transition={springStandardFast}
        className={`pointer-events-none fixed left-1/2 -translate-x-1/2 bottom-[4vmin] px-[3vmin] py-[1.4vmin] rounded-m3-full shadow-m3-3 text-[3.6vmin] font-bold ${tone}`}
      >
        {moment.name} · {text}
      </motion.div>
    );
  }
  return (
    <motion.div
      data-testid="scoreboard-moment"
      data-kind={moment.kind}
      className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <motion.div
        className={`flex flex-col items-center justify-center text-center ${tone} ${big ? 'w-[70vmin] h-[70vmin]' : 'w-[48vmin] h-[48vmin]'}`}
        initial={reduce ? false : { clipPath: CIRCLE, scale: 0.4, rotate: -30 }}
        animate={moment.kind === 'bust'
          ? { clipPath: CIRCLE, scale: 1, rotate: 0, x: reduce ? 0 : [0, -18, 16, -10, 6, 0] }
          : { clipPath: big ? BURST : CIRCLE, scale: 1, rotate: 0 }}
        transition={{ ...springSpatialDefault, x: { duration: 0.45 } }}
      >
        <span className={`font-bold leading-none tabular-nums sotd-numeral ${moment.kind === 'leg' ? 'text-[7vmin] px-[6vmin]' : big ? 'text-[24vmin]' : 'text-[15vmin]'}`}>
          {text}
        </span>
        {moment.kind !== 'leg' && <span className="mt-[1vmin] text-[3.6vmin] font-semibold">{moment.name}</span>}
      </motion.div>
    </motion.div>
  );
};

const WinnerPanel: React.FC<{ snap: ScoreboardSnapshot }> = ({ snap }) => {
  const { t } = useTranslation();
  const winner = snap.players.find(p => p.name === snap.winnerName);
  return (
    <motion.div
      data-testid="scoreboard-winner"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[color-mix(in_srgb,var(--m3-scrim)_70%,transparent)]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="flex flex-col items-center gap-[2.5vmin] rounded-[5vmin] bg-surface-container-high px-[8vmin] py-[6vmin] shadow-m3-5 text-center"
        initial={{ scale: 0.7, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        transition={springSpatialDefault}
      >
        <Icon name="trophy" size={120} className="text-tertiary" />
        <p className="text-[6vmin] font-bold">{t('scoreboard.match_won', { name: snap.winnerName ?? '' })}</p>
        {winner && (
          <p className="text-[3.2vmin] text-on-surface-variant tabular-nums">
            {t('scoreboard.average')} {winner.average.toFixed(1)}
          </p>
        )}
      </motion.div>
    </motion.div>
  );
};

export default ScoreboardScreen;
