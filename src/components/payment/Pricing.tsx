import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, ArrowLeft, Loader, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const Pricing: React.FC = () => {
  const navigate = useNavigate();
  const { user, hasActiveSubscription, trialDaysLeft } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleCheckout = async (plan: 'monthly' | 'lifetime') => {
    setLoading(plan);
    setError('');

    try {
      const response = await api.payment.createCheckout(plan);
      // Redirect to Stripe Checkout
      if (response.url) {
        window.location.href = response.url;
      }
    } catch (err: any) {
      setError(err.message || 'Checkout fehlgeschlagen');
      setLoading(null);
    }
  };

  const features = [
    'Unbegrenzte Matches tracken',
    'Detaillierte Statistiken & Charts',
    'Heatmap-Analyse',
    'Trainingsmodi',
    'Achievement System',
    'Personal Bests Tracking',
    'Leaderboard',
    'Alle zukünftigen Features',
  ];

  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <button
          onClick={() => navigate(user ? '/' : '/login')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {user ? 'Zurück' : 'Zum Login'}
        </button>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Wähle deinen Plan
          </h1>
          <p className="text-xl text-dark-300">
            {hasActiveSubscription ? (
              'Upgraden oder verwalten'
            ) : user?.subscriptionStatus === 'trial' ? (
              <>
                🎁 Du hast noch <strong className="text-primary-400">{trialDaysLeft} Tage</strong> Trial
              </>
            ) : (
              'Starte jetzt mit 30 Tagen kostenlos'
            )}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-500/10 border border-error-500/30 rounded-lg flex items-center gap-2 text-error-400 max-w-2xl mx-auto">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <div className="glass-card p-8 rounded-2xl border-2 border-dark-600 hover:border-primary-500 transition-all">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-primary-500/20 rounded-full flex items-center justify-center">
                <Zap className="text-primary-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Monatlich</h3>
                <p className="text-dark-400 text-sm">Flexibel, jederzeit kündbar</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">4,99€</span>
                <span className="text-dark-400">/Monat</span>
              </div>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-white">
                  <Check className="text-success-400 flex-shrink-0" size={20} />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleCheckout('monthly')}
              disabled={loading !== null}
              className="w-full py-4 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading === 'monthly' ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Weiterleitung...
                </>
              ) : (
                'Monatlich abonnieren'
              )}
            </button>
          </div>

          {/* Lifetime Plan */}
          <div className="glass-card p-8 rounded-2xl border-2 border-amber-500 relative overflow-hidden hover:border-amber-400 transition-all">
            {/* Best Value Badge */}
            <div className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              BESTER WERT
            </div>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-amber-500/20 rounded-full flex items-center justify-center">
                <Crown className="text-amber-400" size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Lifetime</h3>
                <p className="text-dark-400 text-sm">Einmalige Zahlung</p>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold text-white">29,99€</span>
              </div>
              <p className="text-sm text-amber-400 mt-1">
                Spare über 50% vs. 6 Monate
              </p>
            </div>

            <ul className="space-y-3 mb-8">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center gap-2 text-white">
                  <Check className="text-success-400 flex-shrink-0" size={20} />
                  <span>{feature}</span>
                </li>
              ))}
              <li className="flex items-center gap-2 text-amber-400 font-semibold">
                <Crown className="flex-shrink-0" size={20} />
                <span>Lebenslanger Zugriff</span>
              </li>
            </ul>

            <button
              onClick={() => handleCheckout('lifetime')}
              disabled={loading !== null}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20"
            >
              {loading === 'lifetime' ? (
                <>
                  <Loader className="animate-spin" size={20} />
                  Weiterleitung...
                </>
              ) : (
                <>
                  <Crown size={20} />
                  Lifetime kaufen
                </>
              )}
            </button>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">
            Häufige Fragen
          </h2>
          <div className="space-y-4">
            <div className="glass-card p-6 rounded-lg">
              <h3 className="font-bold text-white mb-2">
                Kann ich jederzeit kündigen?
              </h3>
              <p className="text-dark-300">
                Ja! Das monatliche Abo kannst du jederzeit kündigen. Du hast bis zum Ende des Abrechnungszeitraums vollen Zugriff.
              </p>
            </div>

            <div className="glass-card p-6 rounded-lg">
              <h3 className="font-bold text-white mb-2">
                Was passiert nach dem Trial?
              </h3>
              <p className="text-dark-300">
                Nach 30 Tagen endet dein kostenloses Trial. Du kannst dann ein Abo abschließen oder Lifetime kaufen. Deine Daten bleiben gespeichert.
              </p>
            </div>

            <div className="glass-card p-6 rounded-lg">
              <h3 className="font-bold text-white mb-2">
                Welche Zahlungsmethoden werden akzeptiert?
              </h3>
              <p className="text-dark-300">
                Wir akzeptieren alle gängigen Kreditkarten, SEPA-Lastschrift und weitere Zahlungsmethoden über Stripe.
              </p>
            </div>

            <div className="glass-card p-6 rounded-lg">
              <h3 className="font-bold text-white mb-2">
                Ist meine Zahlung sicher?
              </h3>
              <p className="text-dark-300">
                Ja! Alle Zahlungen werden über Stripe abgewickelt - einer der sichersten Zahlungsanbieter weltweit. Wir speichern keine Kreditkartendaten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
