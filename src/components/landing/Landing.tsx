import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Target, Users, TrendingUp, Award, Dumbbell, Bot, WifiOff, Globe2, Flame, Trophy, Smartphone, BarChart3, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../common';
import GoogleMark from '../auth/GoogleMark';
import LegDemo from './LegDemo';
import { LANDING_FACTS } from './landingFacts';

/**
 * The public face of the app, at `/` for everyone signed out (0.48.0; the
 * second entrance `/willkommen` redirects here).
 *
 * The first screen does the two jobs a visitor comes with: see what the app
 * does (a nine-darter played out on a real board, the scoreboard counting
 * along) and get in (Google, email, or sign in) — without leaving the page.
 * Built from the app's own tokens and type, so landing → app is one product.
 */

type Feature = { icon: typeof Target; key: string; tone: string; count?: number };

const MODES: Feature[] = [
  { icon: Target, key: 'x01', tone: 'primary' },
  { icon: Flame, key: 'cricket', tone: 'tertiary' },
  { icon: Trophy, key: 'atc', tone: 'secondary' },
  { icon: Award, key: 'shanghai', tone: 'secondary' },
  { icon: Globe2, key: 'online', tone: 'primary' },
];

const FEATURES: Feature[] = [
  { icon: BarChart3, key: 'stats', tone: 'primary' },
  { icon: Flame, key: 'heatmaps', tone: 'tertiary' },
  { icon: Award, key: 'achievements', tone: 'tertiary', count: LANDING_FACTS.achievements },
  { icon: Bot, key: 'bots', tone: 'secondary', count: LANDING_FACTS.botLevels },
  { icon: Dumbbell, key: 'training', tone: 'primary', count: LANDING_FACTS.trainingModes },
  { icon: Users, key: 'profiles', tone: 'secondary' },
];

const TONE: Record<string, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
};

/** The way in: Google in one tap, email, or sign in. Used in the hero and at the end. */
const JoinPanel: React.FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { googleAuth } = useAuth();
  return (
    <div data-testid={`join-${id}`} className="w-full max-w-md">
      <div className="flex flex-col gap-3">
        <Button variant="filled" size="lg" fullWidth icon={<Mail size={20} />} onClick={() => navigate('/register')}>
          {t('landing.join_email')}
        </Button>
        <Button variant="outlined" size="lg" fullWidth icon={<GoogleMark />} onClick={googleAuth}>
          {t('landing.join_google')}
        </Button>
      </div>
      <p className="mt-4 m3-body-medium text-on-surface-variant">
        {t('landing.have_account')}{' '}
        <Link to="/login" className="m3-label-large text-primary underline underline-offset-4">
          {t('auth.login')}
        </Link>
      </p>
      <p className="mt-1 m3-body-small text-on-surface-variant">{t('landing.trial_note')}</p>
    </div>
  );
};

const SCREENS = {
  desktop: { src: '/landing/game-desktop.webp', w: 1440, h: 900 },
  tv: { src: '/landing/scoreboard-tv.webp', w: 1440, h: 810 },
  phone: { src: '/landing/game-phone.webp', w: 780, h: 1688 },
} as const;

/** One real screen from the app with what it shows. */
const Screen: React.FC<{ id: keyof typeof SCREENS }> = ({ id }) => {
  const { t } = useTranslation();
  const s = SCREENS[id];
  return (
    <figure className="rounded-m3-xl bg-surface-container overflow-hidden">
      <img src={s.src} width={s.w} height={s.h} loading="lazy" decoding="async"
        alt={t(`landing.screen_${id}_alt`)} className="block w-full h-auto" />
      <figcaption className="p-4 m3-body-medium text-on-surface-variant">
        <span className="block m3-title-medium text-on-surface">{t(`landing.screen_${id}_title`)}</span>
        {t(`landing.screen_${id}_text`)}
      </figcaption>
    </figure>
  );
};

const Landing: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="gradient-mesh overflow-x-hidden flex flex-col">
      {/* ---- Kopfzeile -------------------------------------------------------- */}
      <header className="sticky top-0 z-30 bg-[color-mix(in_srgb,var(--m3-surface)_82%,transparent)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center gap-2 min-w-0">
            <img src="/icon.svg" alt="" width={36} height={36} className="w-9 h-9 rounded-m3-md shrink-0" />
            <span className="m3-headline-medium text-on-surface truncate">{t('common.app_name')}</span>
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button variant="text" onClick={() => navigate('/login')}>{t('auth.login')}</Button>
            {/* Phones: the hero's join panel sits right below — one sign-up button is enough up here. */}
            <span className="hidden sm:inline-flex">
              <Button variant="filled" onClick={() => navigate('/register')}>{t('auth.register')}</Button>
            </span>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ---- Hero ------------------------------------------------------------ */}
        <section className="max-w-6xl mx-auto px-4 pt-8 pb-14 md:pt-14 md:pb-20">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] gap-10 lg:gap-12 items-center">
            <div>
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-m3-full bg-tertiary-container text-on-tertiary-container m3-label-large mb-5">
                <Smartphone size={16} aria-hidden="true" />
                {t('landing.hero_badge')}
              </span>
              <h1 className="m3-display-large text-on-surface mb-5 text-[clamp(3rem,8vw,5.75rem)] leading-[0.95] text-balance">
                {t('landing.hero_title')}
              </h1>
              <p className="m3-body-large text-on-surface-variant mb-8 max-w-xl text-pretty">
                {t('landing.hero_body')}
              </p>
              <JoinPanel id="hero" />
            </div>
            <LegDemo />
          </div>
        </section>

        {/* ---- So sieht es aus -------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16" aria-labelledby="landing-screens">
          <h2 id="landing-screens" className="m3-headline-medium text-on-surface mb-2">{t('landing.screens_title')}</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">{t('landing.screens_body')}</p>
          {/* Two columns that pack on their own: laptop and TV left, the tall phone right. */}
          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-start">
            <div className="grid gap-4">
              <Screen id="desktop" />
              <Screen id="tv" />
            </div>
            <div className="max-w-sm w-full mx-auto md:max-w-none">
              <Screen id="phone" />
            </div>
          </div>
        </section>

        {/* ---- Spielmodi --------------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16" aria-labelledby="landing-modes">
          <h2 id="landing-modes" className="m3-headline-medium text-on-surface mb-2">{t('landing.modes_title')}</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">{t('landing.modes_body')}</p>
          <ul className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {MODES.map(m => (
              <li key={m.key} className="rounded-m3-xl bg-surface-container p-5">
                <span className={`w-11 h-11 rounded-m3-md flex items-center justify-center mb-3 ${TONE[m.tone]}`}>
                  <m.icon size={22} aria-hidden="true" />
                </span>
                <h3 className="m3-title-large text-on-surface mb-1">{t(`landing.mode_${m.key}_title`)}</h3>
                <p className="m3-body-medium text-on-surface-variant">{t(`landing.mode_${m.key}_text`)}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* ---- Funktionen -------------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16" aria-labelledby="landing-features">
          <h2 id="landing-features" className="m3-headline-medium text-on-surface mb-2">{t('landing.features_title')}</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">{t('landing.features_body')}</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-8">
            {FEATURES.map(f => (
              <div key={f.key} className="flex gap-4">
                <span className={`shrink-0 w-11 h-11 rounded-m3-md flex items-center justify-center ${TONE[f.tone]}`}>
                  <f.icon size={22} aria-hidden="true" />
                </span>
                <div>
                  <h3 className="m3-title-large text-on-surface mb-1">{t(`landing.feature_${f.key}_title`, { count: f.count })}</h3>
                  <p className="m3-body-medium text-on-surface-variant">{t(`landing.feature_${f.key}_text`)}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ---- Offline ----------------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <Card variant="filled" className="p-6 md:p-10">
            <div className="flex flex-col md:flex-row gap-6 md:items-center">
              <span className="shrink-0 w-14 h-14 rounded-m3-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                <WifiOff size={26} aria-hidden="true" />
              </span>
              <div>
                <h2 className="m3-headline-medium text-on-surface mb-2">{t('landing.offline_title')}</h2>
                <p className="m3-body-large text-on-surface-variant max-w-3xl">{t('landing.offline_body')}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Abschluss --------------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
          <div className="rounded-m3-2xl bg-surface-container-high p-6 md:p-12 grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="m3-headline-medium text-on-surface mb-3">{t('landing.cta_title')}</h2>
              <p className="m3-body-large text-on-surface-variant flex items-center gap-2">
                <TrendingUp size={20} aria-hidden="true" className="shrink-0 text-primary" />
                {t('landing.cta_body')}
              </p>
            </div>
            <JoinPanel id="end" />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Landing;
