import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, Zap, AlertCircle } from 'lucide-react';
import { BackButton, Card, Chip, Button } from '../common';
import { enterPop, staggerChild } from '../../utils/motion';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Trans, useTranslation } from 'react-i18next';

const FEATURE_KEYS = ['unlimited_matches', 'stats_charts', 'heatmap', 'training', 'achievements', 'personal_bests', 'leaderboard', 'future_features'] as const;
const FAQ_KEYS = ['cancel', 'after_trial', 'payment_methods', 'secure'] as const;

const Pricing: React.FC = () => {
  const { t } = useTranslation();
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
      setError(err.message || t('pricing.checkout_failed'));
      setLoading(null);
    }
  };

  const features = FEATURE_KEYS.map((key) => t(`pricing.feature_${key}`));

  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <BackButton
          onClick={() => navigate(user ? '/' : '/login')}
          label={user ? t('common.back') : t('register.to_login')}
        />

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="m3-headline-medium text-on-surface mb-4">
            {t('pricing.title')}
          </h1>
          <p className="m3-body-large text-on-surface-variant">
            {hasActiveSubscription ? (
              t('pricing.upgrade_or_manage')
            ) : user?.subscriptionStatus === 'trial' ? (
              <Trans
                i18nKey="pricing.trial_left"
                count={trialDaysLeft}
                components={{ strong: <strong className="text-primary" /> }}
              />
            ) : (
              t('pricing.start_free')
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
                  <h3 className="m3-title-large text-on-surface">{t('pricing.monthly')}</h3>
                  <p className="m3-body-small text-on-surface-variant">{t('pricing.monthly_desc')}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="m3-display-small text-on-surface">{t('pricing.monthly_price')}</span>
                  <span className="m3-body-medium text-on-surface-variant">{t('pricing.per_month')}</span>
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
                {loading === 'monthly' ? t('pricing.redirecting') : t('pricing.subscribe_monthly')}
              </Button>
            </Card>
          </motion.div>

          {/* Lifetime Plan */}
          <motion.div {...enterPop}>
            <Card variant="elevated" className="p-8 relative overflow-hidden ring-2 ring-[var(--m3-primary)]">
              {/* Best Value Badge */}
              <div className="absolute top-4 right-4">
                <Chip selected>{t('pricing.best_value')}</Chip>
              </div>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-tertiary-container rounded-m3-full flex items-center justify-center">
                  <Crown className="text-tertiary" size={24} />
                </div>
                <div>
                  <h3 className="m3-title-large text-on-surface">{t('pricing.lifetime')}</h3>
                  <p className="m3-body-small text-on-surface-variant">{t('pricing.lifetime_desc')}</p>
                </div>
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-2">
                  <span className="m3-display-small text-on-surface">{t('pricing.lifetime_price')}</span>
                </div>
                <p className="m3-body-small text-tertiary mt-1">
                  {t('pricing.lifetime_saving')}
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
                  <span>{t('pricing.lifetime_access')}</span>
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
                {loading === 'lifetime' ? t('pricing.redirecting') : t('pricing.buy_lifetime')}
              </Button>
            </Card>
          </motion.div>
        </div>

        {/* FAQ */}
        <div className="mt-16 max-w-2xl mx-auto">
          <h2 className="m3-headline-small text-on-surface mb-6 text-center">
            {t('pricing.faq_title')}
          </h2>
          <div className="space-y-4">
            {FAQ_KEYS.map((key, index) => (
              <motion.div key={key} {...staggerChild(index)}>
                <Card variant="filled" className="p-6">
                  <h3 className="m3-title-medium text-on-surface mb-2">
                    {t(`pricing.faq_${key}_q`)}
                  </h3>
                  <p className="m3-body-medium text-on-surface-variant">
                    {t(`pricing.faq_${key}_a`)}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
