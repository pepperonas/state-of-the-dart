import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Crown } from 'lucide-react';
import PageShell from '../common/PageShell';
import Button from '../common/Button';
import PremiumPerks from './PremiumPerks';
import type { PremiumFeature } from '../../utils/plan';

/**
 * Shown instead of a premium-only screen (online, tournaments, TV scoreboard)
 * for a free account: what it is, what premium adds, the way there. Not a
 * redirect — the address stays, and an upgrade reveals the screen in place.
 */
const PremiumGate: React.FC<{ feature: PremiumFeature }> = ({ feature }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <PageShell title={t('plan.gate_title')} width="md">
      <section data-testid="premium-gate" className="rounded-m3-xl bg-surface-container-high p-6 md:p-8">
        <span className="w-14 h-14 rounded-m3-lg bg-tertiary-container text-on-tertiary-container grid place-items-center mb-4">
          <Crown size={28} aria-hidden="true" />
        </span>
        <h2 className="m3-title-large text-on-surface mb-2">{t(`plan.gate_${feature}`)}</h2>
        <p className="m3-body-large text-on-surface-variant mb-6">{t('plan.gate_body')}</p>
        <PremiumPerks className="mb-6" />
        <div className="flex flex-wrap gap-3">
          <Button variant="filled" icon={<Crown size={18} />} onClick={() => navigate('/pricing')}>{t('plan.see_premium')}</Button>
          <Button variant="text" onClick={() => navigate('/')}>{t('plan.back_home')}</Button>
        </div>
      </section>
    </PageShell>
  );
};

export default PremiumGate;
