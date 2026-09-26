import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Volume2, Bell, Globe, User, Play, Download, Upload, Smartphone, Palette, Check, Sparkles, AlertCircle, ChevronDown } from 'lucide-react';
import { Button, Switch, Card, Dialog, PageShell, Select } from './common';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { revealTheme } from '../utils/theme';
import { useTenant } from '../context/TenantContext';
import audioSystem from '../utils/audio';
import { exportTenantData, importTenantData } from '../utils/exportImport';
import { useInstallPrompt } from '../pwa/installPrompt';
import { api } from '../services/api';
import type { BugReport } from '../types';
import BugReportModal from './bugReport/BugReportModal';
import { Icon, iconForEmoji } from './icons';
import { useFeedback } from './common/feedbackContext';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode }) => {
  const { notify, confirm } = useFeedback();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { currentTenant, setCurrentTenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // PWA installation — the offer is captured app-wide (pwa/installPrompt).
  const { installed: isInstalled, canPrompt, needsManualInstall, promptInstall } = useInstallPrompt();
  const isInstallable = canPrompt || needsManualInstall;
  const [showIosHint, setShowIosHint] = useState(false);

  // Bug Reports
  const [bugReports, setBugReports] = useState<BugReport[]>([]);
  const [showBugReportModal, setShowBugReportModal] = useState(false);
  const [isLoadingReports, setIsLoadingReports] = useState(false);
  const [selectedBugReport, setSelectedBugReport] = useState<BugReport | null>(null);
  const [bugReportsOpen, setBugReportsOpen] = useState(false);

  // Load bug reports
  useEffect(() => {
    const loadBugReports = async () => {
      setIsLoadingReports(true);
      try {
        const reports = await api.bugReports.getMyReports();
        setBugReports(reports);
      } catch (error) {
        console.error('Failed to load bug reports:', error);
      } finally {
        setIsLoadingReports(false);
      }
    };

    loadBugReports();
  }, [showBugReportModal]); // Reload when modal closes


  const statusLabel = (status: BugReport['status']) =>
    status === 'in_progress' ? t('admin.status_in_progress') :
    status === 'resolved' ? t('admin.status_resolved') :
    status === 'closed' ? t('admin.status_closed') : t('admin.status_open');

  const severityLabel = (severity: BugReport['severity']) =>
    severity === 'critical' ? t('bug.severity_critical') :
    severity === 'high' ? t('bug.severity_high') :
    severity === 'medium' ? t('bug.severity_medium') : t('bug.severity_low');

  const categoryLabel = (category: BugReport['category']) =>
    category === 'gameplay' ? t('bug.category_gameplay') :
    category === 'ui' ? t('bug.category_ui') :
    category === 'audio' ? t('bug.category_audio') :
    category === 'performance' ? t('bug.category_performance') :
    category === 'auth' ? t('bug.category_auth') :
    category === 'data' ? t('bug.category_data') : t('bug.category_other');

  const handleInstallClick = async () => {
    if (canPrompt) {
      await promptInstall();
    } else {
      setShowIosHint(true);
    }
  };

  const handleExport = () => {
    if (!currentTenant) return;
    
    try {
      exportTenantData(currentTenant.id, currentTenant.name);
      notify(t('settings.export_done'));
    } catch (error) {
      notify(t('settings.export_failed'));
      console.error(error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentTenant) return;

    if (!file.name.endsWith('.json')) {
      notify(t('settings.import_pick_json'));
      return;
    }

    const confirmed = await confirm({
      title: t('settings.import_confirm_title'),
      message: t('settings.import_confirm_body'),
      confirmLabel: t('settings.import_confirm_action'),
      danger: true,
    });

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    try {
      await importTenantData(file, currentTenant.id);
      notify(t('settings.import_done'));
      setTimeout(() => window.location.reload(), 1200);
    } catch (error) {
      notify(t('settings.import_failed'));
      console.error(error);
    }

    event.target.value = '';
  };
  
  return (
    <PageShell
      title={t('settings.settings')}
      width="md"
      onBack={() => navigate('/')}
      backLabel={t('menu.back_to_menu')}
    >
        <Card variant="elevated" className="p-6 md:p-8">

          <div className="space-y-6">
            {/* PWA Installation */}
            {(isInstallable || isInstalled) && (
              <div className="pb-6 border-b border-outline-variant">
                <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                  <Smartphone size={20} />
                  {t('settings.pwa_title')}
                </h3>

                {isInstalled ? (
                  <div className="p-4 bg-success-container rounded-m3-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success rounded-full flex items-center justify-center">
                        <Smartphone size={20} className="text-on-success-container" />
                      </div>
                      <div>
                        <p className="text-on-success-container font-semibold">{t('settings.app_installed')} </p>
                        <p className="text-on-success-container m3-body-medium">{t('settings_page.app_standalone')}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="filled"
                      size="lg"
                      fullWidth
                      icon={<Smartphone size={24} />}
                      onClick={handleInstallClick}
                    >
                      {t('settings.install_app')}
                    </Button>
                    {showIosHint && (
                      <p role="status" className="mt-3 m3-body-medium text-on-surface-variant">{t('pwa.install_ios')}</p>
                    )}

                    <div className="mt-3 p-3 bg-primary-container rounded-m3-md">
                      <p className="m3-body-medium text-on-primary-container">
                        <strong className="text-on-primary-container">{t('settings.pwa_benefits')}</strong>
                      </p>
                      <ul className="m3-body-medium text-on-primary-container mt-2 space-y-1 ml-4 list-disc">
                        <li>{t('settings.pwa_benefit_offline')}</li>
                        <li>{t('settings.pwa_benefit_homescreen')}</li>
                        <li>{t('settings.pwa_benefit_native')}</li>
                        <li>{t('settings.pwa_benefit_no_browser')}</li>
                      </ul>
                    </div>

                    <div className="mt-3 p-3 bg-surface-container rounded-m3-md">
                      <p className="m3-body-small text-on-surface-variant">
                        {t('settings.pwa_ios_tip')}<br/>
                        {t('settings.pwa_android_tip')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Theme Selection */}
            <div className="pb-6 border-b border-outline-variant">
              <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                <Palette size={20} />
                {t('settings.theme')}
              </h3>

              <div className="space-y-3">
                {/* Modern Theme */}
                <button
                  onClick={(e) => revealTheme('modern', e, () => updateSettings({ theme: 'modern' }))}
                  className={`w-full p-4 rounded-m3-lg border-2 transition ${
                    settings.theme === 'modern'
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-m3-md bg-gradient-to-br from-gray-900 to-gray-800 border border-outline-variant flex items-center justify-center">
                      <Moon size={24} className="text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${settings.theme === 'modern' ? 'text-on-primary-container' : 'text-on-surface'}`}>{t('settings.modern_minimalist')}</p>
                      <p className={`text-sm ${settings.theme === 'modern' ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>{t('settings.modern_desc')}</p>
                    </div>
                    {settings.theme === 'modern' && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={16} className="text-on-primary-container" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Modern Light Theme */}
                <button
                  onClick={(e) => revealTheme('modern-light', e, () => updateSettings({ theme: 'modern-light' }))}
                  className={`w-full p-4 rounded-m3-lg border-2 transition ${
                    settings.theme === 'modern-light'
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-m3-md bg-gradient-to-br from-gray-100 to-gray-300 border border-outline-variant flex items-center justify-center">
                      <Sun size={24} className="text-primary" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-semibold ${settings.theme === 'modern-light' ? 'text-on-primary-container' : 'text-on-surface'}`}>{t('settings.modern_light')}</p>
                      <p className={`text-sm ${settings.theme === 'modern-light' ? 'text-on-primary-container' : 'text-on-surface-variant'}`}>{t('settings.modern_light_desc')}</p>
                    </div>
                    {settings.theme === 'modern-light' && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check size={16} className="text-on-primary-container" />
                      </div>
                    )}
                  </div>
                </button>

                <div className="mt-3 p-3 bg-primary-container rounded-m3-md">
                  <p className="m3-body-small text-on-primary-container flex items-center gap-2">
                    <Sparkles size={14} />
                    {t('settings.theme_instant')}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Sound */}
            <div className="pb-6 border-b border-outline-variant">
              <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                <Volume2 size={20} />
                {t('settings.sound')}
              </h3>

              <div className="space-y-4">
                {/* Caller Volume */}
                <div>
                  <label htmlFor="caller-volume" className="flex items-center justify-between mb-2">
                    <span className="text-on-surface-variant">{t('settings.caller_volume')}</span>
                    <span className="m3-body-medium text-on-surface-variant">{settings.callerVolume ?? settings.soundVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    id="caller-volume"
                    value={settings.callerVolume ?? settings.soundVolume}
                    onChange={(e) => {
                      const volume = parseInt(e.target.value);
                      updateSettings({ callerVolume: volume });
                      audioSystem.setCallerVolume(volume);
                    }}
                    className="w-full h-6 accent-primary"
                  />
                </div>

                {/* Effects Volume */}
                <div>
                  <label htmlFor="effects-volume" className="flex items-center justify-between mb-2">
                    <span className="text-on-surface-variant">{t('settings.effects_volume')}</span>
                    <span className="m3-body-medium text-on-surface-variant">{settings.effectsVolume ?? settings.soundVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    id="effects-volume"
                    value={settings.effectsVolume ?? settings.soundVolume}
                    onChange={(e) => {
                      const volume = parseInt(e.target.value);
                      updateSettings({ effectsVolume: volume });
                      audioSystem.setEffectsVolume(volume);
                    }}
                    className="w-full h-6 accent-primary"
                  />
                </div>

                {/* Test Sound Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="success"
                    fullWidth
                    icon={<Play size={18} />}
                    onClick={() => audioSystem.playSound('/sounds/caller/180.mp3')}
                  >
                    {t('settings.test_caller')}
                  </Button>
                  <Button
                    variant="tonal"
                    fullWidth
                    icon={<Play size={18} />}
                    onClick={() => audioSystem.playSound('/sounds/OMNI/pop-success.mp3')}
                  >
                    {t('settings.test_effect')}
                  </Button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{t('settings.vibration')}</span>
                  <Switch
                    checked={settings.vibrationEnabled}
                    onChange={(v) => updateSettings({ vibrationEnabled: v })}
                    label={t('settings.vibration')}
                  />
                </div>
              </div>
            </div>
            
            {/* Game Settings */}
            <div className="pb-6 border-b border-outline-variant">
              <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                <Bell size={20} />
                {t('settings.game_settings')}
              </h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{t('settings.show_checkout_hints')}</span>
                  <Switch
                    checked={settings.showCheckoutHints}
                    onChange={(v) => updateSettings({ showCheckoutHints: v })}
                    label={t('settings.show_checkout_hints')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{t('settings.auto_next_player')}</span>
                  <Switch
                    checked={settings.autoNextPlayer}
                    onChange={(v) => updateSettings({ autoNextPlayer: v })}
                    label={t('settings.auto_next_player')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{t('settings.show_stats_during_game')}</span>
                  <Switch
                    checked={settings.showStatsDuringGame}
                    onChange={(v) => updateSettings({ showStatsDuringGame: v })}
                    label={t('settings.show_stats_during_game')}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-on-surface-variant">{t('settings.show_dartboard_helper')}</span>
                  <Switch
                    checked={settings.showDartboardHelper}
                    onChange={(v) => updateSettings({ showDartboardHelper: v })}
                    label={t('settings.show_dartboard_helper')}
                  />
                </div>
              </div>
            </div>
            
            {/* Language */}
            <div className="pb-6 border-b border-outline-variant">
              <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                <Globe size={20} />
                {t('settings_page.language_label')}
              </h3>

              <Select<'de' | 'en'>
                value={settings.language}
                onChange={(language) => updateSettings({ language })}
                size="lg"
                aria-label={t('settings_page.language_label')}
                options={[
 { value:'de', label:' Deutsch' },
 { value:'en', label:' English' },
                ]}
              />

              <p className="m3-body-medium text-on-surface-variant mt-2">
                {t('settings_page.language_instant')}
              </p>
            </div>
            
            {/* Data Management */}
            <div className="pb-6 border-b border-outline-variant">
              <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                <Download size={20} />
                {t('settings.data_management')}
              </h3>

              <div className="space-y-3">
                <Button
                  variant="filled"
                  fullWidth
                  icon={<Download size={20} />}
                  onClick={handleExport}
                >
                  {t('settings_page.export_json')}
                </Button>

                <Button
                  variant="success"
                  fullWidth
                  icon={<Upload size={20} />}
                  onClick={handleImportClick}
                >
                  {t('settings_page.import_json')}
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />

                <div className="p-3 bg-tertiary-container rounded-m3-md">
                  <p className="m3-body-medium text-on-tertiary-container">
                    ℹ {t('settings.export_info')}
                  </p>
                </div>
              </div>
            </div>

            {/* Bug Reports */}
            <div className="pb-6 border-b border-outline-variant">
              <button
                onClick={() => setBugReportsOpen(!bugReportsOpen)}
                className="w-full m3-title-large flex items-center justify-between text-on-surface hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-2">
                  <AlertCircle size={20} />
                  {t('settings.bug_reports')}
                  {bugReports.length > 0 && (
                    <span className="m3-body-small bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">{bugReports.length}</span>
                  )}
                </span>
                <ChevronDown size={20} className={`transform transition-transform ${bugReportsOpen ? 'rotate-180' : ''}`} />
              </button>

              {bugReportsOpen && <div className="mt-4">
              {isLoadingReports ? (
                <div className="text-center py-8 text-on-surface-variant">
                  {t('settings.loading_reports')}
                </div>
              ) : bugReports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-on-surface-variant mb-4">
                    {t('settings.no_bug_reports')}
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {bugReports.map(report => (
                    <Card
                      key={report.id}
                      variant="filled"
                      interactive
                      onClick={() => setSelectedBugReport(report)}
                      className="p-4 cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-on-surface">{report.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold uppercase ${
                          report.status === 'open' ? 'bg-error-container text-on-error-container' :
                          report.status === 'in_progress' ? 'bg-primary-container text-on-primary-container' :
                          report.status === 'resolved' ? 'bg-success-container text-on-success-container' :
                          'bg-surface-container-high text-on-surface-variant'
                        }`}>
                          {statusLabel(report.status)}
                        </span>
                      </div>
                      <p className="m3-body-medium text-on-surface-variant mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-3 m3-body-small text-on-surface-variant">
                        <span>{new Date(report.createdAt).toLocaleDateString(i18n.language)}</span>
                        <span className={`px-2 py-0.5 rounded ${
                          report.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                          report.severity === 'high' ? 'bg-tertiary-container text-on-tertiary-container' :
                          report.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                          'bg-primary-container text-on-primary-container'
                        }`}>
                          {severityLabel(report.severity)}
                        </span>
                        <span>{categoryLabel(report.category)}</span>
                      </div>
                    </Card>
                  ))}
                </div>
              )}

              <Button
                variant="danger"
                fullWidth
                className="mt-3"
                icon={<AlertCircle size={20} />}
                onClick={() => setShowBugReportModal(true)}
              >
                {t('settings.report_new_bug')}
              </Button>
              </div>}
            </div>

            {/* Profile */}
            <div>
              <h3 className="m3-title-large mb-4 flex items-center gap-2 text-on-surface">
                <User size={20} />
                {t('settings.profile')}
              </h3>

              <div className="bg-surface-container rounded-m3-md p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center m3-headline-small">
                    <Icon name={iconForEmoji(currentTenant?.avatar)} size={26} />
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{currentTenant?.name}</p>
                    <p className="m3-body-medium text-on-surface-variant">
                      {t('settings_page.active_profile')}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Card>

      {/* Bug Report Detail Modal */}
      {selectedBugReport && (
        <Dialog
          open={!!selectedBugReport}
          onClose={() => setSelectedBugReport(null)}
          widthClassName="max-w-3xl"
          title={
            <span className="flex items-center gap-3">
              <AlertCircle className="text-tertiary" size={28} />
              <span className="m3-title-large text-on-surface">{t('admin.bug_report_details')}</span>
            </span>
          }
          actions={
            <>
              <Button
                variant="tonal"
                onClick={() => setSelectedBugReport(null)}
              >
                {t('common.close')}
              </Button>
              <Button
                variant="danger"
                onClick={async () => {
                  if (await confirm({ title: t('settings.delete_bug_confirm'), danger: true, confirmLabel: t('common.delete') })) {
                    try {
                      await api.bugReports.delete(selectedBugReport.id);
                      setBugReports(prev => prev.filter(r => r.id !== selectedBugReport.id));
                      setSelectedBugReport(null);
                    } catch (err) {
                      console.error('Failed to delete bug report:', err);
                    }
                  }
                }}
              >
                {t('common.delete')}
              </Button>
            </>
          }
        >
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block m3-label-large text-on-surface-variant mb-2">{t('bug.field_title')}</label>
                <p className="text-on-surface m3-title-medium">{selectedBugReport.title}</p>
              </div>

              {/* Status and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('settings.status')}</label>
                  <span className={`inline-block px-3 py-1.5 text-sm rounded-full font-semibold uppercase ${
                    selectedBugReport.status === 'open' ? 'bg-error-container text-on-error-container' :
                    selectedBugReport.status === 'in_progress' ? 'bg-primary-container text-on-primary-container' :
                    selectedBugReport.status === 'resolved' ? 'bg-success-container text-on-success-container' :
                    'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {statusLabel(selectedBugReport.status)}
                  </span>
                </div>

                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('settings.severity')}</label>
                  <span className={`inline-block px-3 py-1.5 text-sm rounded font-semibold ${
                    selectedBugReport.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                    selectedBugReport.severity === 'high' ? 'bg-tertiary-container text-on-tertiary-container' :
                    selectedBugReport.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                    'bg-primary-container text-on-primary-container'
                  }`}>
                    {severityLabel(selectedBugReport.severity)}
                  </span>
                </div>
              </div>

              {/* Category and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('settings.category')}</label>
                  <p className="text-on-surface">
                    {categoryLabel(selectedBugReport.category)}
                  </p>
                </div>

                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('settings.created_at')}</label>
                  <p className="text-on-surface">
                    {new Date(selectedBugReport.createdAt).toLocaleString(i18n.language, {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block m3-label-large text-on-surface-variant mb-2">{t('bug.field_description')}</label>
                <p className="text-on-surface bg-surface-container rounded-m3-md p-4 whitespace-pre-wrap">
                  {selectedBugReport.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedBugReport.screenshotUrl && (
                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('admin.screenshot')}</label>
                  <div className="relative group">
                    <a href={selectedBugReport.screenshotUrl} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={selectedBugReport.screenshotUrl}
                        alt={t('settings_page.bug_screenshot_alt')}
                        className="w-full rounded-m3-md border border-outline-variant hover:border-primary transition-colors"
                      />
                    </a>
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={selectedBugReport.screenshotUrl}
                        download={`bug-report-${selectedBugReport.id}.png`}
                        className="px-3 py-1 bg-surface-container-highest hover:bg-surface-container-high text-on-surface m3-body-medium rounded-m3-sm transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {t('admin.download')}
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Browser Info */}
              {selectedBugReport.browserInfo && (
                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('settings_page.browser_info')}</label>
                  <div className="bg-surface-container rounded-m3-md p-4 m3-body-medium">
                    <p className="text-on-surface-variant mb-1">
                      <span className="text-on-surface font-medium">{t('settings_page.user_agent')}</span> {selectedBugReport.browserInfo.userAgent}
                    </p>
                    <p className="text-on-surface-variant mb-1">
                      <span className="text-on-surface font-medium">{t('settings_page.screen')}</span> {selectedBugReport.browserInfo.screenResolution}
                    </p>
                    <p className="text-on-surface-variant">
                      <span className="text-on-surface font-medium">{t('settings_page.viewport')}</span> {selectedBugReport.browserInfo.viewport}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedBugReport.adminNotes && (
                <div>
                  <label className="block m3-label-large text-on-surface-variant mb-2">{t('admin.admin_notes')}</label>
                  <p className="text-on-surface bg-primary-container rounded-m3-md p-4 whitespace-pre-wrap">
                    {selectedBugReport.adminNotes}
                  </p>
                </div>
              )}
            </div>
        </Dialog>
      )}

      {/* Bug Report Modal */}
      {showBugReportModal && (
        <BugReportModal
          onClose={() => setShowBugReportModal(false)}
          currentRoute={window.location.pathname}
        />
      )}
    </PageShell>
  );
};

export default Settings;