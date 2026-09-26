import React, { useState } from 'react';
import { X, Target, Users, TrendingUp, Dumbbell, Settings, Award, Shield, ChevronRight, Play, Gamepad2, BarChart3 } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';
import { IconButton, Dialog } from '../common';

interface UserGuideModalProps {
  onClose: () => void;
}

type GuideSection =
  | 'overview'
  | 'quickstart'
  | 'game'
  | 'players'
  | 'training'
  | 'stats'
  | 'achievements'
  | 'settings'
  | 'admin'
  | 'tips';

/** One translated string; `<b>…</b>` inside it renders as <strong>. */
const Rich: React.FC<{ k: string }> = ({ k }) => (
  <Trans i18nKey={k} components={{ b: <strong /> }} />
);

const CARD = 'bg-surface-container-high rounded-m3-md p-4 shadow-m3-1';
const TITLE = 'm3-title-medium text-on-surface mb-2';
const BODY = 'text-on-surface-variant m3-body-medium';

const UserGuideModal: React.FC<UserGuideModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [activeSection, setActiveSection] = useState<GuideSection>('overview');

  /** Indices of a translated array — empty until the resources are loaded. */
  const indices = (key: string): number[] => {
    const value = t(key, { returnObjects: true }) as unknown;
    return Array.isArray(value) ? value.map((_, i) => i) : [];
  };

  /** A bulleted list read from a translated array of strings. */
  const bullets = (k: string, className = `${BODY} space-y-1`) => (
    <ul className={className}>
      {indices(k).map(i => (
        <li key={i}>• <Rich k={`${k}.${i}`} /></li>
      ))}
    </ul>
  );

  const sections: { id: GuideSection; icon: typeof Target }[] = [
    { id: 'overview', icon: Target },
    { id: 'quickstart', icon: Play },
    { id: 'game', icon: Gamepad2 },
    { id: 'players', icon: Users },
    { id: 'training', icon: Dumbbell },
    { id: 'stats', icon: TrendingUp },
    { id: 'achievements', icon: Award },
    { id: 'settings', icon: Settings },
    { id: 'admin', icon: Shield },
    { id: 'tips', icon: BarChart3 },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.overview.heading')}</h3>
            <p className="text-on-surface-variant leading-relaxed">{t('guide.overview.intro')}</p>

            <div className="rounded-m3-md p-4 bg-primary-container text-on-primary-container">
              <h4 className={`${TITLE} flex items-center gap-2`}>
                <Target size={20} className="text-primary" />
                {t('guide.overview.featuresTitle')}
              </h4>
              {bullets('guide.overview.features', 'space-y-2 text-on-surface-variant')}
            </div>

            <div className="rounded-m3-md p-4 bg-tertiary-container text-on-tertiary-container">
              <h4 className={TITLE}>{t('guide.overview.tipTitle')}</h4>
              <p className="text-on-surface-variant"><Rich k="guide.overview.tip" /></p>
            </div>
          </div>
        );

      case 'quickstart':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.quickstart.heading')}</h3>

            <div className="space-y-4">
              {indices('guide.quickstart.steps').map(i => (
                <div key={i} className={CARD}>
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 rounded-m3-full bg-primary text-on-primary flex items-center justify-center m3-title-medium flex-shrink-0">
                      {i + 1}
                    </div>
                    <div>
                      <h4 className="m3-title-medium text-on-surface mb-1">{t(`guide.quickstart.steps.${i}.title`)}</h4>
                      <p className={BODY}><Rich k={`guide.quickstart.steps.${i}.text`} /></p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-m3-md p-4 bg-success-container text-on-success-container">
              <p className="m3-body-medium"><Rich k="guide.quickstart.done" /></p>
            </div>
          </div>
        );

      case 'game':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.game.heading')}</h3>

            <div className="space-y-4">
              <div className={CARD}>
                <h4 className={`${TITLE} flex items-center gap-2`}>
                  <Target className="text-primary" size={20} />
                  {t('guide.game.x01.title')}
                </h4>
                <p className={`${BODY} mb-3`}>{t('guide.game.x01.text')}</p>
                <div className="bg-surface-container p-3 rounded-m3-sm space-y-1 m3-body-small text-on-surface-variant">
                  <p><strong>{t('guide.game.x01.settingsTitle')}</strong></p>
                  {indices('guide.game.x01.settings').map(i => (
                    <p key={i}>• {t(`guide.game.x01.settings.${i}`)}</p>
                  ))}
                </div>
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.game.cricket.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.game.cricket.text')}</p>
                <div className="bg-surface-container p-3 rounded-m3-sm space-y-1 m3-body-small text-on-surface-variant">
                  {indices('guide.game.cricket.rules').map(i => (
                    <p key={i}>• {t(`guide.game.cricket.rules.${i}`)}</p>
                  ))}
                </div>
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.game.atc.title')}</h4>
                <p className={BODY}>{t('guide.game.atc.text')}</p>
              </div>

              <div className="rounded-m3-md p-4 bg-tertiary-container text-on-tertiary-container">
                <h4 className={`${TITLE} flex items-center gap-2`}>
                  <Gamepad2 className="text-tertiary" size={20} />
                  {t('guide.game.bots.title')}
                </h4>
                <p className={`${BODY} mb-2`}>{t('guide.game.bots.text')}</p>
                {bullets('guide.game.bots.levels', 'text-on-surface-variant m3-body-small space-y-1')}
              </div>
            </div>
          </div>
        );

      case 'players':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.players.heading')}</h3>

            <div className="space-y-4">
              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.players.create.title')}</h4>
                <p className={`${BODY} mb-3`}><Rich k="guide.players.create.path" /></p>
                {bullets('guide.players.create.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.players.main.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.players.main.text')}</p>
                <p className={BODY}><Rich k="guide.players.main.hint" /></p>
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.players.profiles.title')}</h4>
                <p className={`${BODY} mb-3`}><Rich k="guide.players.profiles.intro" /></p>
                {bullets('guide.players.profiles.items')}
                <p className={`${BODY} mt-2`}><Rich k="guide.players.profiles.tip" /></p>
              </div>

              <div className="rounded-m3-md p-4 bg-primary-container text-on-primary-container">
                <h4 className={TITLE}>{t('guide.players.search.title')}</h4>
                <p className={`${BODY} mb-2`}><Rich k="guide.players.search.search" /></p>
                <p className={`${BODY} mb-2`}><Rich k="guide.players.search.paging" /></p>
              </div>

              <div className="rounded-m3-md p-4 bg-secondary-container text-on-secondary-container">
                <h4 className={TITLE}>{t('guide.players.tenant.title')}</h4>
                <p className={BODY}><Rich k="guide.players.tenant.text" /></p>
              </div>
            </div>
          </div>
        );

      case 'training':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.training.heading')}</h3>

            <div className="space-y-4">
              {indices('guide.training.modes').map(i => {
                const goal = t(`guide.training.modes.${i}.goal`, { defaultValue: '' });
                return (
                  <div key={i} className={CARD}>
                    <h4 className={TITLE}>{t(`guide.training.modes.${i}.title`)}</h4>
                    <p className={`${BODY}${goal ? ' mb-2' : ''}`}>{t(`guide.training.modes.${i}.text`)}</p>
                    {goal && <p className={BODY}><Rich k={`guide.training.modes.${i}.goal`} /></p>}
                  </div>
                );
              })}

              <div className="rounded-m3-md p-4 bg-success-container text-on-success-container">
                <h4 className={TITLE}>{t('guide.training.statsTitle')}</h4>
                <p className={BODY}><Rich k="guide.training.stats" /></p>
              </div>
            </div>
          </div>
        );

      case 'stats':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.stats.heading')}</h3>

            <div className="space-y-4">
              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.stats.heatmap.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.stats.heatmap.intro')}</p>
                {bullets('guide.stats.heatmap.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.stats.average.title')}</h4>
                <p className={BODY}>{t('guide.stats.average.text')}</p>
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.stats.checkout.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.stats.checkout.intro')}</p>
                {bullets('guide.stats.checkout.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.stats.history.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.stats.history.text')}</p>
                {bullets("guide.stats.history.items", `${BODY} space-y-1 mt-2`)}
              </div>

              <div className="rounded-m3-md p-4 bg-primary-container text-on-primary-container">
                <h4 className={TITLE}>{t('guide.stats.export.title')}</h4>
                <p className={BODY}>{t('guide.stats.export.text')}</p>
              </div>
            </div>
          </div>
        );

      case 'achievements':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.achievements.heading')}</h3>

            <p className="text-on-surface-variant"><Rich k="guide.achievements.intro" /></p>

            <div className="space-y-4">
              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.achievements.categoriesTitle')}</h4>
                {bullets("guide.achievements.categories", `${BODY} space-y-2`)}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.achievements.examplesTitle')}</h4>
                <div className="space-y-3">
                  {indices('guide.achievements.examples').map(i => (
                    <div key={i} className="bg-surface-container p-3 rounded-m3-sm">
                      <p className="text-on-surface m3-title-medium">{t(`guide.achievements.examples.${i}.name`)}</p>
                      <p className={BODY}>{t(`guide.achievements.examples.${i}.desc`)}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-m3-md p-4 bg-tertiary-container text-on-tertiary-container">
                <h4 className={TITLE}>{t('guide.achievements.notifyTitle')}</h4>
                <p className={BODY}>{t('guide.achievements.notify')}</p>
              </div>
            </div>
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.settings.heading')}</h3>

            <div className="space-y-4">
              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.settings.audio.title')}</h4>
                {bullets('guide.settings.audio.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.settings.theme.title')}</h4>
                <p className={BODY}><Rich k="guide.settings.theme.text" /></p>
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.settings.language.title')}</h4>
                <p className={BODY}><Rich k="guide.settings.language.text" /></p>
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.settings.pwa.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.settings.pwa.intro')}</p>
                {bullets('guide.settings.pwa.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.settings.data.title')}</h4>
                {bullets('guide.settings.data.items')}
              </div>

              <div className="rounded-m3-md p-4 bg-error-container text-on-error-container">
                <h4 className={TITLE}>{t('guide.settings.danger.title')}</h4>
                <p className={BODY}><Rich k="guide.settings.danger.text" /></p>
              </div>
            </div>
          </div>
        );

      case 'admin':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.admin.heading')}</h3>

            <div className="rounded-m3-md p-4 bg-tertiary-container text-on-tertiary-container">
              <p className="m3-body-medium"><Rich k="guide.admin.notice" /></p>
            </div>

            <div className="space-y-4">
              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.admin.users.title')}</h4>
                {bullets('guide.admin.users.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.admin.subscriptions.title')}</h4>
                <p className={`${BODY} mb-2`}>{t('guide.admin.subscriptions.intro')}</p>
                {bullets('guide.admin.subscriptions.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.admin.bugs.title')}</h4>
                {bullets('guide.admin.bugs.items')}
              </div>

              <div className={CARD}>
                <h4 className={TITLE}>{t('guide.admin.stats.title')}</h4>
                <p className={BODY}>{t('guide.admin.stats.text')}</p>
              </div>
            </div>
          </div>
        );

      case 'tips':
        return (
          <div className="space-y-6">
            <h3 className="m3-headline-small text-on-surface">{t('guide.tips.heading')}</h3>

            <div className="space-y-4">
              {(['beginners', 'stats', 'input', 'farm'] as const).map(group => (
                <div key={group} className={CARD}>
                  <h4 className={TITLE}>{t(`guide.tips.${group}.title`)}</h4>
                  {bullets(`guide.tips.${group}.items`, `${BODY} space-y-2`)}
                </div>
              ))}

              <div className="rounded-m3-md p-4 bg-secondary-container text-on-secondary-container">
                <h4 className={TITLE}>{t('guide.tips.report.title')}</h4>
                <p className={BODY}><Rich k="guide.tips.report.text" /></p>
              </div>

              <div className="rounded-m3-md p-4 bg-success-container text-on-success-container">
                <h4 className={TITLE}>{t('guide.tips.pro.title')}</h4>
                <p className={BODY}><Rich k="guide.tips.pro.text" /></p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      hideClose
      ariaLabel={t('guide.title')}
      widthClassName="!max-w-6xl !p-0 overflow-hidden flex flex-col"
    >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-outline-variant">
          <h2 className="m3-headline-small text-on-surface flex items-center gap-3">
            <Target className="text-primary" size={32} />
            {t('guide.title')}
          </h2>
          <IconButton label={t('common.close')} onClick={onClose} className="-mr-2">
            <X size={24} />
          </IconButton>
        </div>

        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
          {/* Sidebar: horizontal scroll on mobile, vertical sidebar on md+ */}
          <div className="border-b md:border-b-0 md:border-r border-outline-variant md:w-64 overflow-x-auto md:overflow-x-visible md:overflow-y-auto p-2 md:p-4 bg-surface-container-low flex-shrink-0">
            <nav className="flex md:flex-col gap-1 md:gap-1 min-w-max md:min-w-0">
              {sections.map((section) => {
                const Icon = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex items-center gap-2 md:gap-3 px-3 md:px-4 py-2 md:py-3 rounded-m3-md transition-all text-left whitespace-nowrap md:whitespace-normal md:w-full ${
                      activeSection === section.id
                        ? 'bg-primary-container text-on-primary-container'
                        : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                    }`}
                  >
                    <Icon size={18} className="flex-shrink-0 md:[&]:w-5 md:[&]:h-5" />
                    <span className="m3-label-large m3-body-medium md:text-base">{t(`guide.nav.${section.id}`)}</span>
                    {activeSection === section.id && (
                      <ChevronRight size={16} className="ml-auto hidden md:block" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Content */}
          <div key={activeSection} className="flex-1 overflow-y-auto p-4 md:p-6 m3-enter-fade">
            {renderContent()}
          </div>
        </div>
    </Dialog>
  );
};

export default UserGuideModal;
