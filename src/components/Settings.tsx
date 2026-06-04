import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun, Volume2, Bell, Globe, User, Play, Download, Upload, Smartphone, Palette, Check, Sparkles, AlertCircle, ChevronDown } from 'lucide-react';
import { BackButton, Button, Switch, Card, Dialog } from './common';
import { useTranslation } from 'react-i18next';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';
import audioSystem from '../utils/audio';
import { exportTenantData, importTenantData } from '../utils/exportImport';
import { api } from '../services/api';
import type { BugReport } from '../types';
import BugReportModal from './bugReport/BugReportModal';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { currentTenant, setCurrentTenant } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // PWA Installation
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  }

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(() => {
    return window.matchMedia('(display-mode: standalone)').matches;
  });

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

  useEffect(() => {
    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert('ℹ️ Installation ist derzeit nicht verfügbar.\n\nTipp: Auf iOS verwende "Zum Home-Bildschirm" im Safari-Menü.');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('PWA installation accepted');
    } else {
      console.log('PWA installation dismissed');
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleExport = () => {
    if (!currentTenant) return;
    
    try {
      exportTenantData(currentTenant.id, currentTenant.name);
      alert('✅ Daten erfolgreich exportiert!');
    } catch (error) {
      alert('❌ Export fehlgeschlagen. Bitte versuche es erneut.');
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
      alert('❌ Bitte wähle eine JSON-Datei aus.');
      return;
    }

    const confirmed = window.confirm(
      '⚠️ Achtung: Der Import überschreibt alle aktuellen Daten!\n\n' +
      'Möchtest du vorher ein Backup exportieren?'
    );

    if (!confirmed) {
      event.target.value = '';
      return;
    }

    try {
      await importTenantData(file, currentTenant.id);
      alert('✅ Daten erfolgreich importiert!\n\nDie Seite wird neu geladen...');
      window.location.reload();
    } catch (error) {
      alert('❌ Import fehlgeschlagen. Bitte überprüfe die Datei.');
      console.error(error);
    }

    event.target.value = '';
  };
  
  return (
    <div className="min-h-dvh p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <BackButton onClick={() => navigate('/')} label={t('menu.back_to_menu')} />

        <Card variant="elevated" className="p-6 md:p-8">
          <h2 className="m3-headline-small font-bold mb-6 text-on-surface">{t('settings.settings')}</h2>

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
                        <p className="text-on-success-container font-semibold">{t('settings.app_installed')} ✅</p>
                        <p className="text-on-success-container text-sm">Die App läuft als eigenständige Anwendung.</p>
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

                    <div className="mt-3 p-3 bg-primary-container rounded-m3-md">
                      <p className="text-sm text-on-primary-container">
                        📱 <strong className="text-on-primary-container">{t('settings.pwa_benefits')}</strong>
                      </p>
                      <ul className="text-sm text-on-primary-container mt-2 space-y-1 ml-4 list-disc">
                        <li>{t('settings.pwa_benefit_offline')}</li>
                        <li>{t('settings.pwa_benefit_homescreen')}</li>
                        <li>{t('settings.pwa_benefit_native')}</li>
                        <li>{t('settings.pwa_benefit_no_browser')}</li>
                      </ul>
                    </div>

                    <div className="mt-3 p-3 bg-surface-container rounded-m3-md">
                      <p className="text-xs text-on-surface-variant">
                        💡 <strong>iOS:</strong> {t('settings.pwa_ios_tip')}<br/>
                        💡 <strong>Android:</strong> {t('settings.pwa_android_tip')}
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
                  onClick={() => updateSettings({ theme: 'modern' })}
                  className={`w-full p-4 rounded-m3-lg border-2 transition-all ${
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
                  onClick={() => updateSettings({ theme: 'modern-light' })}
                  className={`w-full p-4 rounded-m3-lg border-2 transition-all ${
                    settings.theme === 'modern-light'
                      ? 'border-primary bg-primary-container'
                      : 'border-outline-variant bg-surface-container hover:border-outline'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-m3-md bg-gradient-to-br from-gray-100 to-gray-300 border border-outline-variant flex items-center justify-center">
                      <Sun size={24} className="text-primary-600" />
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
                  <p className="text-xs text-on-primary-container flex items-center gap-2">
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
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-on-surface-variant">{t('settings.caller_volume')}</span>
                    <span className="text-sm text-on-surface-variant">{settings.callerVolume ?? settings.soundVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.callerVolume ?? settings.soundVolume}
                    onChange={(e) => {
                      const volume = parseInt(e.target.value);
                      updateSettings({ callerVolume: volume });
                      audioSystem.setCallerVolume(volume);
                    }}
                    className="w-full accent-primary"
                  />
                </div>

                {/* Effects Volume */}
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-on-surface-variant">{t('settings.effects_volume')}</span>
                    <span className="text-sm text-on-surface-variant">{settings.effectsVolume ?? settings.soundVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.effectsVolume ?? settings.soundVolume}
                    onChange={(e) => {
                      const volume = parseInt(e.target.value);
                      updateSettings({ effectsVolume: volume });
                      audioSystem.setEffectsVolume(volume);
                    }}
                    className="w-full accent-primary"
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
                Language / Sprache
              </h3>

              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'de' })}
                className="w-full p-3 rounded-m3-sm bg-surface-container border border-outline-variant text-on-surface cursor-pointer focus:border-primary focus:outline-none transition-colors"
              >
                <option value="de">🇩🇪 Deutsch</option>
                <option value="en">🇬🇧 English</option>
              </select>

              <p className="text-sm text-on-surface-variant mt-2">
                Language changes are applied instantly
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
                  {t('settings.export')} (JSON)
                </Button>

                <Button
                  variant="success"
                  fullWidth
                  icon={<Upload size={20} />}
                  onClick={handleImportClick}
                >
                  {t('settings.import')} (JSON)
                </Button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />

                <div className="p-3 bg-tertiary-container rounded-m3-md">
                  <p className="text-sm text-on-tertiary-container">
                    ℹ️ {t('settings.export_info')}
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
                    <span className="text-xs bg-surface-container-high text-on-surface-variant px-2 py-0.5 rounded-full">{bugReports.length}</span>
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
                          {report.status === 'in_progress' ? 'in Bearbeitung' :
                           report.status === 'resolved' ? 'Gelöst' :
                           report.status === 'closed' ? 'Geschlossen' : 'Offen'}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-3 text-xs text-on-surface-variant">
                        <span>{new Date(report.createdAt).toLocaleDateString('de-DE')}</span>
                        <span className={`px-2 py-0.5 rounded ${
                          report.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                          report.severity === 'high' ? 'bg-tertiary-container text-on-tertiary-container' :
                          report.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                          'bg-primary-container text-on-primary-container'
                        }`}>
                          {report.severity === 'critical' ? 'Kritisch' :
                           report.severity === 'high' ? 'Hoch' :
                           report.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                        </span>
                        <span className="capitalize">{
                          report.category === 'gameplay' ? 'Gameplay' :
                          report.category === 'ui' ? 'UI' :
                          report.category === 'audio' ? 'Audio' :
                          report.category === 'performance' ? 'Performance' :
                          report.category === 'auth' ? 'Auth' :
                          report.category === 'data' ? 'Daten' : 'Sonstiges'
                        }</span>
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
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-2xl">
                    {currentTenant?.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-on-surface">{currentTenant?.name}</p>
                    <p className="text-sm text-on-surface-variant">
                      Aktives Profil
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </Card>
      </div>

      {/* Bug Report Detail Modal */}
      {selectedBugReport && (
        <Dialog
          open={!!selectedBugReport}
          onClose={() => setSelectedBugReport(null)}
          widthClassName="max-w-3xl"
          title={
            <span className="flex items-center gap-3">
              <AlertCircle className="text-tertiary" size={28} />
              <span className="m3-title-large text-on-surface">Bug Report Details</span>
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
                  if (confirm('Bug Report wirklich löschen?')) {
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
                Löschen
              </Button>
            </>
          }
        >
            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-on-surface-variant mb-2">Titel</label>
                <p className="text-on-surface text-lg font-semibold">{selectedBugReport.title}</p>
              </div>

              {/* Status and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('settings.status')}</label>
                  <span className={`inline-block px-3 py-1.5 text-sm rounded-full font-semibold uppercase ${
                    selectedBugReport.status === 'open' ? 'bg-error-container text-on-error-container' :
                    selectedBugReport.status === 'in_progress' ? 'bg-primary-container text-on-primary-container' :
                    selectedBugReport.status === 'resolved' ? 'bg-success-container text-on-success-container' :
                    'bg-surface-container-high text-on-surface-variant'
                  }`}>
                    {selectedBugReport.status === 'in_progress' ? 'In Bearbeitung' :
                     selectedBugReport.status === 'resolved' ? 'Gelöst' :
                     selectedBugReport.status === 'closed' ? 'Geschlossen' : 'Offen'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('settings.severity')}</label>
                  <span className={`inline-block px-3 py-1.5 text-sm rounded font-semibold ${
                    selectedBugReport.severity === 'critical' ? 'bg-error-container text-on-error-container' :
                    selectedBugReport.severity === 'high' ? 'bg-tertiary-container text-on-tertiary-container' :
                    selectedBugReport.severity === 'medium' ? 'bg-secondary-container text-on-secondary-container' :
                    'bg-primary-container text-on-primary-container'
                  }`}>
                    {selectedBugReport.severity === 'critical' ? 'Kritisch' :
                     selectedBugReport.severity === 'high' ? 'Hoch' :
                     selectedBugReport.severity === 'medium' ? 'Mittel' : 'Niedrig'}
                  </span>
                </div>
              </div>

              {/* Category and Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('settings.category')}</label>
                  <p className="text-on-surface capitalize">
                    {selectedBugReport.category === 'gameplay' ? 'Gameplay' :
                     selectedBugReport.category === 'ui' ? 'Benutzeroberfläche' :
                     selectedBugReport.category === 'audio' ? 'Audio' :
                     selectedBugReport.category === 'performance' ? 'Performance' :
                     selectedBugReport.category === 'auth' ? 'Authentifizierung' :
                     selectedBugReport.category === 'data' ? 'Daten' : 'Sonstiges'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">{t('settings.created_at')}</label>
                  <p className="text-on-surface">
                    {new Date(selectedBugReport.createdAt).toLocaleString('de-DE', {
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
                <label className="block text-sm font-semibold text-on-surface-variant mb-2">Beschreibung</label>
                <p className="text-on-surface bg-surface-container rounded-m3-md p-4 whitespace-pre-wrap">
                  {selectedBugReport.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedBugReport.screenshotUrl && (
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Screenshot</label>
                  <div className="relative group">
                    <img
                      src={selectedBugReport.screenshotUrl}
                      alt="Bug screenshot"
                      className="w-full rounded-m3-md border border-outline-variant cursor-pointer hover:border-primary transition-colors"
                      onClick={() => window.open(selectedBugReport.screenshotUrl, '_blank')}
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={selectedBugReport.screenshotUrl}
                        download={`bug-report-${selectedBugReport.id}.png`}
                        className="px-3 py-1 bg-surface-container-highest hover:bg-surface-container-high text-on-surface text-sm rounded-m3-sm transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Download
                      </a>
                    </div>
                  </div>
                </div>
              )}

              {/* Browser Info */}
              {selectedBugReport.browserInfo && (
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Browser-Informationen</label>
                  <div className="bg-surface-container rounded-m3-md p-4 text-sm">
                    <p className="text-on-surface-variant mb-1">
                      <span className="text-on-surface font-medium">User Agent:</span> {selectedBugReport.browserInfo.userAgent}
                    </p>
                    <p className="text-on-surface-variant mb-1">
                      <span className="text-on-surface font-medium">Bildschirm:</span> {selectedBugReport.browserInfo.screenResolution}
                    </p>
                    <p className="text-on-surface-variant">
                      <span className="text-on-surface font-medium">Viewport:</span> {selectedBugReport.browserInfo.viewport}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedBugReport.adminNotes && (
                <div>
                  <label className="block text-sm font-semibold text-on-surface-variant mb-2">Admin-Notizen</label>
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
    </div>
  );
};

export default Settings;