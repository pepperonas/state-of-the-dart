import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { shapePolygon } from '../../utils/shapes';
import { springSpatialDefault } from '../../utils/motion';
import type { PersonalBestHit } from '../../utils/feedback';

export interface HeroMomentState {
  /** Changes with every moment so it replays. */
  key: number;
  /** The number to celebrate: 180 or the checkout value. */
  value: number;
  kind: '180' | 'checkout';
  name: string;
  /** New personal bests set by this visit. */
  bests: PersonalBestHit[];
}

/** How long a hero moment stays. */
export const HERO_MOMENT_MS = 1600;

// 144 points: twelve rays need about a dozen points each to stay soft.
const CIRCLE = shapePolygon('circle', 144);
const BURST = shapePolygon('burst', 144);

/**
 * Stage 3 of the feedback ladder: a 180 or a big checkout gets the screen for
 * a beat — the number swells out of a soft-burst shape that morphs and turns.
 * It never blocks input (`pointer-events: none`) and clears itself; the live
 * region already announces the visit, so this is decorative.
 */
const HeroMoment: React.FC<{ moment: HeroMomentState | null; onDone: () => void }> = ({ moment, onDone }) => {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!moment) return;
    const timer = setTimeout(onDone, HERO_MOMENT_MS);
    return () => clearTimeout(timer);
  }, [moment, onDone]);

  return (
    <AnimatePresence>
      {moment && (
        <motion.div
          key={moment.key}
          data-testid="hero-moment"
          aria-hidden="true"
          className="fixed inset-0 z-[10000] pointer-events-none flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="relative flex flex-col items-center">
            <motion.div
              className="absolute w-[min(70vw,26rem)] aspect-square bg-tertiary-container shadow-m3-5"
              initial={reduce ? false : { clipPath: CIRCLE, scale: 0.3, rotate: -30 }}
              animate={reduce ? { clipPath: BURST } : { clipPath: [CIRCLE, BURST, BURST], scale: [0.3, 1.08, 1], rotate: [-30, 10, 0] }}
              transition={{ duration: 0.7, times: [0, 0.6, 1], ease: [0.2, 0, 0, 1] }}
              style={{ top: '50%', left: '50%', x: '-50%', y: '-50%' }}
            />
            <motion.div
              className="relative sotd-numeral text-on-tertiary-container leading-none text-[clamp(4.5rem,20vw,9.5rem)]"
              initial={reduce ? false : { scale: 0.4, fontWeight: 600, fontStretch: '80%' }}
              animate={{ scale: 1, fontWeight: 950, fontStretch: '108%' }}
              transition={springSpatialDefault}
            >
              {moment.value}
            </motion.div>
            <div className="relative m3-title-large text-on-tertiary-container mt-1">
              {moment.kind === 'checkout' ? t('game_screen.hero_checkout', { name: moment.name }) : moment.name}
            </div>
            {moment.bests.map(b => (
              <motion.div
                key={b.kind}
                data-testid="pb-chip"
                initial={reduce ? false : { y: 12, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                transition={{ ...springSpatialDefault, delay: 0.35 }}
                className="relative mt-3 px-4 py-1.5 rounded-m3-full bg-primary text-on-primary m3-label-large"
              >
                {t(b.kind === 'visit' ? 'game_screen.pb_visit' : 'game_screen.pb_leg', { value: b.value })}
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HeroMoment;
