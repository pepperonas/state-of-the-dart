import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Target,
  Users,
  TrendingUp,
  Award,
  Dumbbell,
  Bot,
  WifiOff,
  Globe2,
  Flame,
  Trophy,
  ArrowRight,
  LogIn,
  Smartphone,
  BarChart3,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Button, Card } from '../common';
import Footer from '../Footer';
import { LANDING_FACTS } from './landingFacts';

/**
 * The public face of the app.
 *
 * Reached at `/` when nobody is signed in (see `App.tsx` — `/` is a switch, not
 * a redirect, so the 30-odd `navigate('/')` calls inside the app keep meaning
 * "app home"), and at `/willkommen` always.
 *
 * Built from the same `--m3-*` tokens, type scale and motion layer as the rest
 * of the app on purpose: the walk from landing → login → app should look like
 * one product, not like a brochure that links to a tool.
 */

/** Copy lives in i18n under `landing.mode_<key>_*` / `landing.feature_<key>_*`. */
type Feature = { icon: typeof Target; key: string; tone: string; count?: number };

const MODES: Feature[] = [
  { icon: Target, key: 'x01', tone: 'primary' },
  { icon: Flame, key: 'cricket', tone: 'tertiary' },
  { icon: Trophy, key: 'atc', tone: 'secondary' },
  { icon: Award, key: 'shanghai', tone: 'success' },
  { icon: Globe2, key: 'online', tone: 'primary' },
];

const FEATURES: Feature[] = [
  { icon: BarChart3, key: 'stats', tone: 'primary' },
  { icon: Flame, key: 'heatmaps', tone: 'tertiary' },
  { icon: Award, key: 'achievements', tone: 'success', count: LANDING_FACTS.achievements },
  { icon: Bot, key: 'bots', tone: 'secondary', count: LANDING_FACTS.botLevels },
  { icon: Dumbbell, key: 'training', tone: 'primary', count: LANDING_FACTS.trainingModes },
  { icon: Users, key: 'profiles', tone: 'tertiary' },
];

/** Darts notation, not language. */
const CHECKOUT_EXAMPLE = 'T20 · T20 · Bull';

const TONE: Record<string, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  secondary: 'bg-secondary-container text-on-secondary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  success: 'bg-success-container text-on-success-container',
};

const Stat: React.FC<{ value: string; label: string }> = ({ value, label }) => (
  <div className="text-center">
    <div className="m3-display-small text-primary font-bold tabular-nums">{value}</div>
    <div className="m3-label-medium text-on-surface-variant uppercase tracking-wide">{label}</div>
  </div>
);

const Landing: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const signedIn = Boolean(user);

  return (
    <div className="min-h-dvh gradient-mesh overflow-x-hidden flex flex-col">
      {/* ---- Kopfzeile: die Naht zur App ------------------------------------ */}
      <header className="sticky top-0 z-30 border-b border-outline-variant bg-[color-mix(in_srgb,var(--m3-surface)_88%,transparent)] backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <Link to={signedIn ? '/' : '/willkommen'} className="flex items-center gap-2 min-w-0">
            <span className="w-9 h-9 rounded-m3-md bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
              <Target size={20} />
            </span>
            <span className="m3-title-medium text-on-surface truncate">{t('common.app_name')}</span>
          </Link>

          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button variant="filled" onClick={() => navigate('/')} icon={<ArrowRight size={18} />}>
                {t('landing.to_app')}
              </Button>
            ) : (
              <>
                <Button variant="text" onClick={() => navigate('/login')} icon={<LogIn size={18} />}>
                  {t('auth.login')}
                </Button>
                <Button variant="filled" onClick={() => navigate('/register')}>
                  {t('landing.start_free')}
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* ---- Hero --------------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 pt-14 pb-12 md:pt-24 md:pb-20">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div className="m3-enter">
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-m3-full bg-tertiary-container text-on-tertiary-container m3-label-large mb-5">
                <Smartphone size={16} />
                {t('landing.hero_badge')}
              </span>
              <h1 className="m3-display-medium text-on-surface mb-4 text-balance">
                {t('landing.hero_title')}
              </h1>
              <p className="m3-body-large text-on-surface-variant mb-8 max-w-xl text-pretty">
                {t('landing.hero_body')}
              </p>
              <div className="flex flex-wrap gap-3">
                {signedIn ? (
                  <Button variant="filled" size="lg" onClick={() => navigate('/')} icon={<ArrowRight size={20} />}>
                    {t('landing.to_app')}
                  </Button>
                ) : (
                  <>
                    <Button variant="filled" size="lg" onClick={() => navigate('/register')} icon={<Target size={20} />}>
                      {t('landing.start_free')}
                    </Button>
                    <Button variant="outlined" size="lg" onClick={() => navigate('/login')}>
                      {t('landing.have_account')}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Kennzahlen-Karte statt Screenshot: lädt sofort, kippt mit dem Theme */}
            <Card variant="elevated" className="p-6 md:p-8 m3-enter m3-delay-2">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <Stat value={String(LANDING_FACTS.gameModes)} label={t('landing.stat_game_modes')} />
                <Stat value={String(LANDING_FACTS.trainingModes)} label={t('landing.stat_training')} />
                <Stat value={String(LANDING_FACTS.achievements)} label={t('landing.stat_achievements')} />
                <Stat value={String(LANDING_FACTS.botLevels)} label={t('landing.stat_bot_levels')} />
              </div>
              <div className="rounded-m3-lg bg-surface-container-high p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="m3-label-large text-on-surface-variant">{t('landing.remaining')}</span>
                  <span className="m3-label-medium text-on-surface-variant">{t('landing.checkout')}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-5xl font-bold text-primary tabular-nums">170</span>
                  <span className="m3-title-medium text-tertiary">{CHECKOUT_EXAMPLE}</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ---- Spielmodi ---------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="m3-headline-medium text-on-surface mb-2">{t('landing.modes_title')}</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">
            {t('landing.modes_body')}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 m3-stagger">
            {MODES.map((m) => (
              <Card key={m.key} variant="elevated" className="p-6">
                <span className={`w-11 h-11 rounded-m3-md flex items-center justify-center mb-4 ${TONE[m.tone]}`}>
                  <m.icon size={22} />
                </span>
                <h3 className="m3-title-large text-on-surface mb-1">{t(`landing.mode_${m.key}_title`)}</h3>
                <p className="m3-body-medium text-on-surface-variant">{t(`landing.mode_${m.key}_text`)}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Funktionen --------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="m3-headline-medium text-on-surface mb-2">{t('landing.features_title')}</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">
            {t('landing.features_body')}
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 m3-stagger">
            {FEATURES.map((f) => (
              <Card key={f.key} variant="filled" className="p-6">
                <span className={`w-11 h-11 rounded-m3-md flex items-center justify-center mb-4 ${TONE[f.tone]}`}>
                  <f.icon size={22} />
                </span>
                <h3 className="m3-title-large text-on-surface mb-1">{t(`landing.feature_${f.key}_title`, { count: f.count })}</h3>
                <p className="m3-body-medium text-on-surface-variant">{t(`landing.feature_${f.key}_text`)}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Offline / PWA ------------------------------------------------ */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <Card variant="elevated" className="p-6 md:p-10 m3-enter">
            <div className="grid md:grid-cols-3 gap-8 items-center">
              <div className="md:col-span-2">
                <h2 className="m3-headline-small text-on-surface mb-3">
                  {t('landing.offline_title')}
                </h2>
                <p className="m3-body-large text-on-surface-variant">
                  {t('landing.offline_body')}
                </p>
              </div>
              <div className="flex md:justify-end gap-3">
                <span className="w-14 h-14 rounded-m3-lg bg-secondary-container text-on-secondary-container flex items-center justify-center">
                  <WifiOff size={26} />
                </span>
                <span className="w-14 h-14 rounded-m3-lg bg-primary-container text-on-primary-container flex items-center justify-center">
                  <Smartphone size={26} />
                </span>
                <span className="w-14 h-14 rounded-m3-lg bg-tertiary-container text-on-tertiary-container flex items-center justify-center">
                  <TrendingUp size={26} />
                </span>
              </div>
            </div>
          </Card>
        </section>

        {/* ---- Abschluss ---------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 pb-16 md:pb-24">
          <Card variant="filled" className="p-8 md:p-12 text-center m3-enter">
            <h2 className="m3-headline-medium text-on-surface mb-3">
              {signedIn ? t('landing.cta_title_signed_in') : t('landing.cta_title')}
            </h2>
            <p className="m3-body-large text-on-surface-variant mb-8 max-w-xl mx-auto">
              {signedIn
                ? t('landing.cta_body_signed_in')
                : t('landing.cta_body')}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {signedIn ? (
                <Button variant="filled" size="lg" onClick={() => navigate('/')} icon={<ArrowRight size={20} />}>
                  {t('landing.to_app')}
                </Button>
              ) : (
                <>
                  <Button variant="filled" size="lg" onClick={() => navigate('/register')} icon={<Target size={20} />}>
                    {t('landing.start_free')}
                  </Button>
                  <Button variant="text" size="lg" onClick={() => navigate('/login')}>
                    {t('auth.login')}
                  </Button>
                </>
              )}
            </div>
          </Card>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default Landing;
