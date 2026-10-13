import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Crosshair, Clock, TrendingUp, Award, Zap, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Card, PageShell } from '../common';
import { staggerChild } from '../../utils/motion';
import { motion } from 'framer-motion';

/**
 * Practice is secondary — the home screen's rule (0.38.0: play primary,
 * practice secondary, review tertiary). Until 0.43.0 the six modes cycled
 * through blue, purple and green, which read as categories that do not exist.
 */
const PRACTICE_CHIP = 'bg-secondary-container text-on-secondary-container';

const TrainingMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const trainingModes = [
    {
      title: t('training.doubles_practice'),
      icon: Target,
      description: t('training.doubles_practice_desc'),
      mode: 'doubles',
    },
    {
      title: t('training.triples_practice'),
      icon: Crosshair,
      description: t('training.triples_practice_desc'),
      mode: 'triples',
    },
    {
      title: t('training.around_the_clock'),
      icon: Clock,
      description: t('training.around_the_clock_desc'),
      mode: 'around-the-clock',
    },
    {
      title: t('training.checkout_training'),
      icon: Award,
      description: t('training.checkout_training_desc'),
      mode: 'checkout-121',
    },
    {
      title: t('training.bobs_27'),
      icon: TrendingUp,
      description: t('training.bobs_27_desc'),
      mode: 'bobs-27',
    },
    {
      title: t('training.score_training'),
      icon: Zap,
      description: t('training.score_training_desc'),
      mode: 'score-training',
    },
  ];

  return (
    <PageShell
      title={t('training.training_modes')}
      actions={
        <Button
          variant="tonal"
          icon={<BarChart size={20} />}
          onClick={() => navigate('/training-stats')}
        >
          <span className="sr-only sm:not-sr-only">{t('training_menu.statistics')}</span>
        </Button>
      }
    >
        <Card variant="elevated" className="p-6 md:p-8">

          <div className="grid md:grid-cols-2 gap-4">
            {trainingModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <motion.div key={mode.title} {...staggerChild(index)}>
                  <Card
                    variant="filled"
                    interactive
                    onClick={() => navigate(`/training/${mode.mode}`)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        data-testid="training-chip"
                        className={`flex-shrink-0 w-16 h-16 rounded-m3-lg flex items-center justify-center ${PRACTICE_CHIP}`}
                      >
                        <Icon size={30} />
                      </div>
                      <div className="min-w-0 text-left">
                        <h2 className="m3-title-large text-on-surface mb-0.5">{mode.title}</h2>
                        <p className="m3-body-medium text-on-surface-variant line-clamp-2">{mode.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-surface-container rounded-m3-lg">
            <h2 className="m3-title-medium text-on-surface mb-2">{t('training.benefits_title')}</h2>
            <ul className="space-y-1 m3-body-medium text-on-surface-variant">
              <li>• {t('training.benefit_1')}</li>
              <li>• {t('training.benefit_2')}</li>
              <li>• {t('training.benefit_3')}</li>
              <li>• {t('training.benefit_4')}</li>
            </ul>
          </div>
        </Card>
        </PageShell>
  );
};

export default TrainingMenu;
