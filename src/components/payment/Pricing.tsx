import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, AlertCircle } from 'lucide-react';
import { BackButton, Card, Chip, Button } from '../common';
import { enterPop, staggerChild } from '../../utils/motion';
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
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <BackButton
          onClick={() => navigate(user ? '/' : '/login')}
          label={user ? 'Zurück' : 'Zum Login'}
        />

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="m3-display-small text-on-surface mb-4">
            Wähle deinen Plan
          </h1>
          <p className="m3-body-large text-on-surface-variant">
            {hasActiveSubscription ? (
              'Upgraden oder verwalten'
            ) : user?.subscriptionStatus === 'trial' ? (
              <>
                🎁 Du hast noch <strong className="text-primary">{trialDaysLeft} Tage</strong> Trial
              </>
            ) : (
              'Starte jetzt mit 30 Tagen kostenlos'
            )}
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-error-container text-on-error-container border border-outline-variant rounded-m3-md flex items-center gap-2 max-w-2xl mx-auto">
            <AlertCircle size={20} />
            <span className="m3-body-medium">{error}</span>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Monthly Plan */}
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-container rounded-m3-full flex items-center justify-center">
                  <Zap className="text-primary" size={24} />
                </div>
                <div>
                  <h3 className="m3-title-large text-on-surface">Monatlich</h3>
                  <p className="m3-body-small text-on-surface-variant">Flexibel, jederzeit kündbar</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="m3-display-small text-on-surface">4,99€</span>
                  <span className="m3-body-medium text-on-surface-variant">/Monat</span>
                </div>
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-on-surface m3-body-medium">
                    <Check className="text-success flex-shrink-0" size={20} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                variant="filled"
                fullWidth
                onClick={() => handleCheckout('monthly')}
                disabled={loading !== null}
                loading={loading === 'monthly'}
              >
                {loading === 'monthly' ? 'Weiterleitung...' : 'Monatlich abonnieren'}
              </Button>
            </Card>
          </motion.div>

          {/* Lifetime Plan */}
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8 relative overflow-hidden ring-2 ring-[var(--m3-primary)]">
              {/* Best Value Badge */}
              <div className="absolute top-4 right-4">
                <Chip selected>BESTER WERT</Chip>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-tertiary-container rounded-m3-full flex items-center justify-center">
                  <Crown className="text-tertiary" size={24} />
                </div>
                <div>
                  <h3 className="m3-title-large text-on-surface">Lifetime</h3>
                  <p className="m3-body-small text-on-surface-variant">Einmalige Zahlung</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="m3-display-small text-on-surface">29,99€</span>
                </div>
                <p className="m3-body-small text-tertiary mt-1">
                  Spare über 50% vs. 6 Monate
                </p>
              </div>

              <ul className="space-y-3 mb-8">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2 text-on-surface m3-body-medium">
                    <Check className="text-success flex-shrink-0" size={20} />
                    <span>{feature}</span>
                  </li>
                ))}
                <li className="flex items-center gap-2 text-tertiary m3-label-large">
                  <Crown className="flex-shrink-0" size={20} />
                  <span>Lebenslanger Zugriff</span>
                </li>
              </ul>

              <Button
                variant="filled"
                fullWidth
                icon={loading === 'lifetime' ? undefined : <Crown size={20} />}
                onClick={() => handleCheckout('lifetime')}
                disabled={loading !== null}
                loading={loading === 'lifetime'}
              >
                {loading === 'lifetime' ? 'Weiterleitung...' : 'Lifetime kaufen'}
              </Button>
            </Card>
          </motion.div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="m3-headline-small text-on-surface mb-6 text-center">
            Häufige Fragen
          </h2>
          <div className="space-y-4">
            <motion.div {...staggerChild(0)}>
              <Card variant="filled" className="p-6">
                <h3 className="m3-title-medium text-on-surface mb-2">
                  Kann ich jederzeit kündigen?
                </h3>
                <p className="m3-body-medium text-on-surface-variant">
                  Ja! Das monatliche Abo kannst du jederzeit kündigen. Du hast bis zum Ende des Abrechnungszeitraums vollen Zugriff.
                </p>
              </Card>
            </motion.div>

            <motion.div {...staggerChild(1)}>
              <Card variant="filled" className="p-6">
                <h3 className="m3-title-medium text-on-surface mb-2">
                  Was passiert nach dem Trial?
                </h3>
                <p className="m3-body-medium text-on-surface-variant">
                  Nach 30 Tagen endet dein kostenloses Trial. Du kannst dann ein Abo abschließen oder Lifetime kaufen. Deine Daten bleiben gespeichert.
                </p>
              </Card>
            </motion.div>

            <motion.div {...staggerChild(2)}>
              <Card variant="filled" className="p-6">
                <h3 className="m3-title-medium text-on-surface mb-2">
                  Welche Zahlungsmethoden werden akzeptiert?
                </h3>
                <p className="m3-body-medium text-on-surface-variant">
                  Wir akzeptieren alle gängigen Kreditkarten, SEPA-Lastschrift und weitere Zahlungsmethoden über Stripe.
                </p>
              </Card>
            </motion.div>

            <motion.div {...staggerChild(3)}>
              <Card variant="filled" className="p-6">
                <h3 className="m3-title-medium text-on-surface mb-2">
                  Ist meine Zahlung sicher?
                </h3>
                <p className="m3-body-medium text-on-surface-variant">
                  Ja! Alle Zahlungen werden über Stripe abgewickelt - einer der sichersten Zahlungsanbieter weltweit. Wir speichern keine Kreditkartendaten.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
