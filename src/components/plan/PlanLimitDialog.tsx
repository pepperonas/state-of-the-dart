import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFeedback } from '../common';
import { PLAN_LIMIT_EVENT, type PlanLimitDetail } from '../../utils/plan';

/**
 * The server refused a change because of the free tier (402). Say what and
 * offer the way to premium — instead of a silent failure (0.49.0).
 */
const PlanLimitDialog: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { confirm } = useFeedback();
  useEffect(() => {
    const onLimit = async (e: Event) => {
      const { feature, limit } = (e as CustomEvent<PlanLimitDetail>).detail ?? {};
      const ok = await confirm({
        title: t('plan.limit_title'),
        message: t(`plan.limit_${feature ?? 'generic'}`, { limit, defaultValue: t('plan.limit_generic') }),
        confirmLabel: t('plan.see_premium'),
        cancelLabel: t('plan.later'),
      });
      if (ok) navigate('/pricing');
    };
    window.addEventListener(PLAN_LIMIT_EVENT, onLimit);
    return () => window.removeEventListener(PLAN_LIMIT_EVENT, onLimit);
  }, [confirm, navigate, t]);
  return null;
};

export default PlanLimitDialog;
