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

type Feature = { icon: typeof Target; title: string; text: string; tone: string };

const MODES: Feature[] = [
  { icon: Target, title: 'X01', text: '301 · 501 · 701 mit Sets, Legs, Double-Out und Checkout-Vorschlägen.', tone: 'primary' },
  { icon: Flame, title: 'Cricket', text: 'Die 15 bis 20 und Bull — schließen, punkten, zumachen.', tone: 'tertiary' },
  { icon: Trophy, title: 'Around the Clock', text: '1 bis 20 der Reihe nach. Der Klassiker fürs Zielen.', tone: 'secondary' },
  { icon: Award, title: 'Shanghai', text: 'Single, Double, Triple derselben Zahl — der Sofortsieg.', tone: 'success' },
  { icon: Globe2, title: 'Online', text: 'Privater Raum per Code, Gegner überall, live synchron.', tone: 'primary' },
];

const FEATURES: Feature[] = [
  { icon: BarChart3, title: 'Statistik, die etwas sagt', text: 'Average, First-9, Checkout-Quote, 180er, Verlauf pro Leg und Match — nicht nur eine Zahl am Ende.', tone: 'primary' },
  { icon: Flame, title: 'Heatmaps', text: 'Wo landen deine Darts wirklich? Die Trefferverteilung auf dem Board, über Wochen gesammelt.', tone: 'tertiary' },
  { icon: Award, title: `${LANDING_FACTS.achievements} Achievements`, text: 'Von „erstes 180" bis zu Serien über Monate. Mit Fortschrittsanzeige statt Überraschungspopup.', tone: 'success' },
  { icon: Bot, title: `${LANDING_FACTS.botLevels} Bot-Stufen`, text: 'Vom Anfänger bis zum Profi — der Bot passt sich deinem Können an, wenn du willst.', tone: 'secondary' },
  { icon: Dumbbell, title: `${LANDING_FACTS.trainingModes} Trainingsmodi`, text: 'Doppel, Triple, Around the Clock, Checkout 121, Bob’s 27 und Score-Training.', tone: 'primary' },
  { icon: Users, title: 'Mehrere Profile', text: 'Ein Konto, getrennte Profile — Verein, Familie, du allein. Die Daten bleiben sauber getrennt.', tone: 'tertiary' },
];

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
            <span className="m3-title-medium text-on-surface truncate">State of the Dart</span>
          </Link>

          <nav className="flex items-center gap-2">
            {signedIn ? (
              <Button variant="filled" onClick={() => navigate('/')} icon={<ArrowRight size={18} />}>
                Zur App
              </Button>
            ) : (
              <>
                <Button variant="text" onClick={() => navigate('/login')} icon={<LogIn size={18} />}>
                  Anmelden
                </Button>
                <Button variant="filled" onClick={() => navigate('/register')}>
                  Kostenlos starten
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
                Läuft im Browser · installierbar · offline
              </span>
              <h1 className="m3-display-medium text-on-surface mb-4 text-balance">
                Dart zählen, ohne den Kopf zu benutzen.
              </h1>
              <p className="m3-body-large text-on-surface-variant mb-8 max-w-xl text-pretty">
                State of the Dart übernimmt das Rechnen, schlägt das Finish vor und merkt sich
                jeden Wurf — damit du am Board bleibst statt am Taschenrechner.
              </p>
              <div className="flex flex-wrap gap-3">
                {signedIn ? (
                  <Button variant="filled" size="lg" onClick={() => navigate('/')} icon={<ArrowRight size={20} />}>
                    Zur App
                  </Button>
                ) : (
                  <>
                    <Button variant="filled" size="lg" onClick={() => navigate('/register')} icon={<Target size={20} />}>
                      Kostenlos starten
                    </Button>
                    <Button variant="outlined" size="lg" onClick={() => navigate('/login')}>
                      Ich habe schon ein Konto
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Kennzahlen-Karte statt Screenshot: lädt sofort, kippt mit dem Theme */}
            <Card variant="elevated" className="p-6 md:p-8 m3-enter m3-delay-2">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <Stat value={String(LANDING_FACTS.gameModes)} label="Spielmodi" />
                <Stat value={String(LANDING_FACTS.trainingModes)} label="Trainings" />
                <Stat value={String(LANDING_FACTS.achievements)} label="Achievements" />
                <Stat value={String(LANDING_FACTS.botLevels)} label="Bot-Stufen" />
              </div>
              <div className="rounded-m3-lg bg-surface-container-high p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="m3-label-large text-on-surface-variant">Restpunkte</span>
                  <span className="m3-label-medium text-on-surface-variant">Checkout</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-5xl font-bold text-primary tabular-nums">170</span>
                  <span className="m3-title-medium text-tertiary">T20 · T20 · Bull</span>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* ---- Spielmodi ---------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="m3-headline-medium text-on-surface mb-2">Fünf Wege zu spielen</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">
            Jeder Modus zählt, prüft und beendet nach seinen eigenen Regeln — inklusive Bust,
            Double-Out und Set-Rechnung.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 m3-stagger">
            {MODES.map((m) => (
              <Card key={m.title} variant="elevated" className="p-6">
                <span className={`w-11 h-11 rounded-m3-md flex items-center justify-center mb-4 ${TONE[m.tone]}`}>
                  <m.icon size={22} />
                </span>
                <h3 className="m3-title-large text-on-surface mb-1">{m.title}</h3>
                <p className="m3-body-medium text-on-surface-variant">{m.text}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ---- Funktionen --------------------------------------------------- */}
        <section className="max-w-6xl mx-auto px-4 py-12 md:py-16">
          <h2 className="m3-headline-medium text-on-surface mb-2">Was danach passiert</h2>
          <p className="m3-body-large text-on-surface-variant mb-8 max-w-2xl">
            Das Zählen ist der Anfang. Interessant wird es, wenn genug Würfe zusammenkommen.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 m3-stagger">
            {FEATURES.map((f) => (
              <Card key={f.title} variant="filled" className="p-6">
                <span className={`w-11 h-11 rounded-m3-md flex items-center justify-center mb-4 ${TONE[f.tone]}`}>
                  <f.icon size={22} />
                </span>
                <h3 className="m3-title-large text-on-surface mb-1">{f.title}</h3>
                <p className="m3-body-medium text-on-surface-variant">{f.text}</p>
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
                  Der Keller hat kein WLAN. Die App stört das nicht.
                </h2>
                <p className="m3-body-large text-on-surface-variant">
                  Installier sie wie eine App auf dem Handy. Ein laufendes Match wird lokal
                  gehalten und synchronisiert sich, sobald wieder Netz da ist — mitten im Leg
                  abzubrechen ist keine Option.
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
              {signedIn ? 'Weiter geht’s.' : 'Nächstes Leg?'}
            </h2>
            <p className="m3-body-large text-on-surface-variant mb-8 max-w-xl mx-auto">
              {signedIn
                ? 'Dein Konto ist angemeldet — du bist einen Klick vom nächsten Match entfernt.'
                : 'Konto anlegen, Spieler eintragen, loslegen. Ohne Installation, ohne Karte.'}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              {signedIn ? (
                <Button variant="filled" size="lg" onClick={() => navigate('/')} icon={<ArrowRight size={20} />}>
                  Zur App
                </Button>
              ) : (
                <>
                  <Button variant="filled" size="lg" onClick={() => navigate('/register')} icon={<Target size={20} />}>
                    Kostenlos starten
                  </Button>
                  <Button variant="text" size="lg" onClick={() => navigate('/login')}>
                    Anmelden
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
