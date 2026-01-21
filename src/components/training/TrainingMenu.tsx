import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Target, Crosshair, Clock, TrendingUp, Award, Zap, BarChart } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TrainingMenu: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const trainingModes = [
    {
      title: t('training.doubles_practice'),
      icon: Target,
      description: t('training.doubles_practice_desc'),
      gradient: 'from-primary-500 to-primary-600',
      mode: 'doubles',
    },
    {
      title: t('training.triples_practice'),
      icon: Crosshair,
      description: t('training.triples_practice_desc'),
      gradient: 'from-accent-500 to-accent-600',
      mode: 'triples',
    },
    {
      title: t('training.around_the_clock'),
      icon: Clock,
      description: t('training.around_the_clock_desc'),
      gradient: 'from-success-500 to-success-600',
      mode: 'around-the-clock',
    },
    {
      title: t('training.checkout_training'),
      icon: Award,
      description: t('training.checkout_training_desc'),
      gradient: 'from-accent-600 to-accent-700',
      mode: 'checkout-121',
    },
    {
      title: t('training.bobs_27'),
      icon: TrendingUp,
      description: t('training.bobs_27_desc'),
      gradient: 'from-primary-600 to-accent-600',
      mode: 'bobs-27',
    },
    {
      title: t('training.score_training'),
      icon: Zap,
      description: t('training.score_training_desc'),
      gradient: 'from-success-600 to-success-700',
      mode: 'score-training',
    },
  ];
  
  return (
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <ArrowLeft size={20} />
            Zurück
          </button>
          <button
            onClick={() => navigate('/training-stats')}
            className="flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
          >
            <BarChart size={20} />
            Statistiken
          </button>
        </div>
        
        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-3xl font-bold mb-6 text-white">{t('training.training_modes')}</h2>

          <div className="grid md:grid-cols-2 gap-4">
            {trainingModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.title}
                  onClick={() => navigate(`/training/${mode.mode}`)}
                  className={`bg-gradient-to-br ${mode.gradient} rounded-lg p-6 text-white hover:shadow-lg transition-all card-hover-effect`}
                >
                  <div className="flex items-center gap-4">
                    <Icon size={32} />
                    <div className="text-left">
                      <h3 className="text-lg font-bold">{mode.title}</h3>
                      <p className="text-sm opacity-90">{mode.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-8 p-4 bg-success-500/10 rounded-lg border border-success-500/30">
            <h3 className="font-semibold mb-2 text-white">{t('training.benefits_title')}</h3>
            <ul className="space-y-1 text-sm text-dark-300">
              <li>• {t('training.benefit_1')}</li>
              <li>• {t('training.benefit_2')}</li>
              <li>• {t('training.benefit_3')}</li>
              <li>• {t('training.benefit_4')}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrainingMenu;