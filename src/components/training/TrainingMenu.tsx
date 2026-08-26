import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Crosshair, Clock, TrendingUp, Award, Zap, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { BackButton, Button, Card, PageShell } from '../common';
import { staggerChild } from '../../utils/motion';
import { motion } from 'framer-motion';

const TONE_CHIP: Record<string, string> = {
  primary: 'bg-primary-container text-on-primary-container',
  tertiary: 'bg-tertiary-container text-on-tertiary-container',
  success: 'bg-success-container text-on-success-container',
};

const TrainingMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const trainingModes = [
    {
      title: t('training.doubles_practice'),
      icon: Target,
      description: t('training.doubles_practice_desc'),
      tone: 'primary',
      mode: 'doubles',
    },
    {
      title: t('training.triples_practice'),
      icon: Crosshair,
      description: t('training.triples_practice_desc'),
      tone: 'tertiary',
      mode: 'triples',
    },
    {
      title: t('training.around_the_clock'),
      icon: Clock,
      description: t('training.around_the_clock_desc'),
      tone: 'success',
      mode: 'around-the-clock',
    },
    {
      title: t('training.checkout_training'),
      icon: Award,
      description: t('training.checkout_training_desc'),
      tone: 'tertiary',
      mode: 'checkout-121',
    },
    {
      title: t('training.bobs_27'),
      icon: TrendingUp,
      description: t('training.bobs_27_desc'),
      tone: 'primary',
      mode: 'bobs-27',
    },
    {
      title: t('training.score_training'),
      icon: Zap,
      description: t('training.score_training_desc'),
      tone: 'success',
      mode: 'score-training',
    },
  ];

  return (
    <PageShell
      width="md"
      back={false}
    >
        <div className="flex items-center justify-between mb-6">
          <BackButton onClick={() => navigate('/')} inline />
          <Button
            variant="tonal"
            icon={<BarChart size={20} />}
            onClick={() => navigate('/training-stats')}
          >
            Statistiken
          </Button>
        </div>

        <Card variant="elevated" className="p-6 md:p-8">
          <h1 className="m3-headline-medium text-on-surface mb-6">{t('training.training_modes')}</h1>

          <div className="grid md:grid-cols-2 gap-4">
            {trainingModes.map((mode, index) => {
              const Icon = mode.icon;
              return (
                <motion.div key={mode.title} {...staggerChild(index)}>
                  <Card
                    variant="elevated"
                    interactive
                    onClick={() => navigate(`/training/${mode.mode}`)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`flex-shrink-0 w-16 h-16 rounded-m3-lg flex items-center justify-center ${TONE_CHIP[mode.tone]}`}
                      >
                        <Icon size={30} />
                      </div>
                      <div className="min-w-0 text-left">
                        <h3 className="m3-title-large text-on-surface mb-0.5">{mode.title}</h3>
                        <p className="m3-body-medium text-on-surface-variant line-clamp-2">{mode.description}</p>
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-success-container/40 rounded-m3-lg border border-outline-variant">
            <h3 className="m3-title-medium text-on-surface mb-2">{t('training.benefits_title')}</h3>
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
