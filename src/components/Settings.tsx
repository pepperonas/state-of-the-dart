import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Volume2, Bell, Globe, LogOut, User, Play, Download, Upload, Smartphone, Palette, Check, Sparkles, AlertCircle, X } from 'lucide-react';
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
    <div className="min-h-screen p-4 md:p-8 gradient-mesh">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 glass-card px-4 py-2 rounded-lg text-white hover:glass-card-hover transition-all"
        >
          <ArrowLeft size={20} />
          {t('menu.back_to_menu')}
        </button>
        
        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-3xl font-bold mb-6 text-white">{t('settings.settings')}</h2>
          
          <div className="space-y-6">
            {/* PWA Installation */}
            {(isInstallable || isInstalled) && (
              <div className="pb-6 border-b border-dark-700">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                  <Smartphone size={20} />
                  Progressive Web App
                </h3>
                
                {isInstalled ? (
                  <div className="p-4 bg-success-500/20 border border-success-500 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-success-500 rounded-full flex items-center justify-center">
                        <Smartphone size={20} className="text-white" />
                      </div>
                      <div>
                        <p className="text-white font-semibold">App installiert! ✅</p>
                        <p className="text-dark-300 text-sm">Die App läuft als eigenständige Anwendung.</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={handleInstallClick}
                      className="w-full py-4 bg-gradient-to-r from-primary-500 to-accent-500 hover:from-primary-600 hover:to-accent-600 text-white rounded-lg font-bold text-lg flex items-center justify-center gap-3 transition-all shadow-lg hover:shadow-xl"
                    >
                      <Smartphone size={24} />
                      App installieren
                    </button>
                    
                    <div className="mt-3 p-3 bg-primary-500/10 border border-primary-500/30 rounded-lg">
                      <p className="text-sm text-dark-300">
                        📱 <strong className="text-white">Vorteile:</strong>
                      </p>
                      <ul className="text-sm text-dark-300 mt-2 space-y-1 ml-4 list-disc">
                        <li>Offline-Funktionalität</li>
                        <li>Schnellerer Zugriff vom Homescreen</li>
                        <li>Native App-Erfahrung</li>
                        <li>Keine Browser-Leiste</li>
                      </ul>
                    </div>
                    
                    <div className="mt-3 p-3 bg-dark-800 rounded-lg">
                      <p className="text-xs text-dark-400">
                        💡 <strong>iOS:</strong> Nutze "Zum Home-Bildschirm" im Safari-Menü<br/>
                        💡 <strong>Android:</strong> Klicke auf "App installieren" oben
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* Theme Selection */}
            <div className="pb-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Palette size={20} />
                Theme / Aussehen
              </h3>
              
              <div className="space-y-3">
                {/* Modern Theme */}
                <button
                  onClick={() => updateSettings({ theme: 'modern' })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    settings.theme === 'modern' 
                      ? 'border-primary-500 bg-primary-500/10' 
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-900 to-gray-800 border border-primary-500/30 flex items-center justify-center">
                      <Moon size={24} className="text-primary-400" />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold">Modern Minimalist</p>
                      <p className="text-sm text-dark-300">Clean, dark & professional</p>
                    </div>
                    {settings.theme === 'modern' && (
                      <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                        <Check size={16} className="text-white" />
                      </div>
                    )}
                  </div>
                </button>

                {/* Cyberpunk Theme */}
                <button
                  onClick={() => updateSettings({ theme: 'steampunk' })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    settings.theme === 'steampunk'
                      ? 'border-yellow-400 bg-yellow-400/10'
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-600 border border-yellow-500/50 flex items-center justify-center relative overflow-hidden">
                      <span className="text-2xl">⚡</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold">Cyberpunk Neon</p>
                      <p className="text-sm text-dark-300">Neon yellow & dark</p>
                    </div>
                    {settings.theme === 'steampunk' && (
                      <div className="w-6 h-6 rounded-full bg-yellow-400 flex items-center justify-center">
                        <Check size={16} className="text-black" />
                      </div>
                    )}
                  </div>
                </button>
                
                <div className="mt-3 p-3 bg-primary-500/10 rounded-lg border border-primary-500/30">
                  <p className="text-xs text-primary-300 flex items-center gap-2">
                    <Sparkles size={14} />
                    Das Theme wird sofort auf alle Seiten angewendet
                  </p>
                </div>
              </div>
            </div>
            
            {/* Sound */}
            <div className="pb-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Volume2 size={20} />
                Sound
              </h3>
              
              <div className="space-y-4">
                {/* Caller Volume */}
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-dark-300">Caller Volume (Scores)</span>
                    <span className="text-sm text-dark-400">{settings.callerVolume ?? settings.soundVolume}%</span>
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
                    className="w-full"
                  />
                </div>

                {/* Effects Volume */}
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-dark-300">Effects Volume (UI)</span>
                    <span className="text-sm text-dark-400">{settings.effectsVolume ?? settings.soundVolume}%</span>
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
                    className="w-full"
                  />
                </div>
                
                {/* Test Sound Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => audioSystem.playSound('/sounds/caller/180.mp3')}
                    className="py-2 px-4 bg-success-500 hover:bg-success-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={18} />
                    Caller Test
                  </button>
                  <button
                    onClick={() => audioSystem.playSound('/sounds/OMNI/pop-success.mp3')}
                    className="py-2 px-4 bg-primary-500 hover:bg-primary-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                  >
                    <Play size={18} />
                    Effect Test
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-dark-300">Vibration</span>
                  <button
                    onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.vibrationEnabled ? 'bg-success-500' : 'bg-dark-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.vibrationEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Game Settings */}
            <div className="pb-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Bell size={20} />
                Game
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-dark-300">Show Checkout Hints</span>
                  <button
                    onClick={() => updateSettings({ showCheckoutHints: !settings.showCheckoutHints })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showCheckoutHints ? 'bg-success-500' : 'bg-dark-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showCheckoutHints ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-dark-300">Auto Next Player</span>
                  <button
                    onClick={() => updateSettings({ autoNextPlayer: !settings.autoNextPlayer })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoNextPlayer ? 'bg-success-500' : 'bg-dark-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.autoNextPlayer ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-dark-300">Show Stats During Game</span>
                  <button
                    onClick={() => updateSettings({ showStatsDuringGame: !settings.showStatsDuringGame })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showStatsDuringGame ? 'bg-success-500' : 'bg-dark-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showStatsDuringGame ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-dark-300">Show Dartboard Helper</span>
                  <button
                    onClick={() => updateSettings({ showDartboardHelper: !settings.showDartboardHelper })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showDartboardHelper ? 'bg-success-500' : 'bg-dark-700'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings.showDartboardHelper ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Language */}
            <div className="pb-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Globe size={20} />
                Language / Sprache
              </h3>
              
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'de' })}
                className="w-full p-3 rounded-lg border-2 border-dark-700 bg-dark-800 text-white font-semibold hover:border-primary-500 focus:border-primary-500 focus:outline-none transition-colors cursor-pointer"
              >
                <option value="de">🇩🇪 Deutsch</option>
                <option value="en">🇬🇧 English</option>
              </select>
              
              <p className="text-sm text-dark-300 mt-2">
                Language changes are applied instantly
              </p>
            </div>
            
            {/* Data Management */}
            <div className="pb-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <Download size={20} />
                Datenverwaltung
              </h3>
              
              <div className="space-y-3">
                <button
                  onClick={handleExport}
                  className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Download size={20} />
                  Alle Daten exportieren (JSON)
                </button>
                
                <button
                  onClick={handleImportClick}
                  className="w-full py-3 bg-success-500 hover:bg-success-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Upload size={20} />
                  Daten importieren (JSON)
                </button>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
                
                <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm text-yellow-800 dark:text-yellow-300">
                    ℹ️ Exportiert werden: Spieler, Matches, Einstellungen, Statistiken, Training-Sessions
                  </p>
                </div>
              </div>
            </div>

            {/* Bug Reports */}
            <div className="pb-6 border-b border-dark-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <AlertCircle size={20} />
                Meine Bug Reports
              </h3>

              {isLoadingReports ? (
                <div className="text-center py-8 text-gray-400">
                  Lade Bug Reports...
                </div>
              ) : bugReports.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400 mb-4">
                    Du hast noch keine Bug Reports eingereicht.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {bugReports.map(report => (
                    <div
                      key={report.id}
                      onClick={() => setSelectedBugReport(report)}
                      className="bg-dark-800/50 rounded-lg p-4 border border-dark-700 cursor-pointer hover:border-warning-500 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-white">{report.title}</h4>
                        <span className={`px-2 py-1 text-xs rounded-full font-semibold uppercase ${
                          report.status === 'open' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                          report.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                          report.status === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {report.status === 'in_progress' ? 'in Bearbeitung' :
                           report.status === 'resolved' ? 'Gelöst' :
                           report.status === 'closed' ? 'Geschlossen' : 'Offen'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-400 mb-2 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span>{new Date(report.createdAt).toLocaleDateString('de-DE')}</span>
                        <span className={`px-2 py-0.5 rounded ${
                          report.severity === 'critical' ? 'bg-red-600/20 text-red-400' :
                          report.severity === 'high' ? 'bg-orange-600/20 text-orange-400' :
                          report.severity === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                          'bg-blue-600/20 text-blue-400'
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
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowBugReportModal(true)}
                className="w-full mt-3 py-3 bg-gradient-to-r from-warning-500 to-orange-600 hover:from-warning-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                <AlertCircle size={20} />
                Neuen Bug melden
              </button>
            </div>

            {/* Profile */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
                <User size={20} />
                Profil
              </h3>
              
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-2xl">
                    {currentTenant?.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{currentTenant?.name}</p>
                    <p className="text-sm text-dark-400">
                      Aktives Profil
                    </p>
                  </div>
                </div>
              </div>
              
            </div>
          </div>
        </div>
      </div>

      {/* Bug Report Detail Modal */}
      {selectedBugReport && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-warning-400" size={28} />
                <h2 className="text-2xl font-bold text-white">Bug Report Details</h2>
              </div>
              <button
                onClick={() => setSelectedBugReport(null)}
                className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
              >
                <X size={24} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-dark-300 mb-2">Titel</label>
                <p className="text-white text-lg font-semibold">{selectedBugReport.title}</p>
              </div>

              {/* Status and Severity */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Status</label>
                  <span className={`inline-block px-3 py-1.5 text-sm rounded-full font-semibold uppercase ${
                    selectedBugReport.status === 'open' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                    selectedBugReport.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' :
                    selectedBugReport.status === 'resolved' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {selectedBugReport.status === 'in_progress' ? 'In Bearbeitung' :
                     selectedBugReport.status === 'resolved' ? 'Gelöst' :
                     selectedBugReport.status === 'closed' ? 'Geschlossen' : 'Offen'}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Schweregrad</label>
                  <span className={`inline-block px-3 py-1.5 text-sm rounded font-semibold ${
                    selectedBugReport.severity === 'critical' ? 'bg-red-600/20 text-red-400' :
                    selectedBugReport.severity === 'high' ? 'bg-orange-600/20 text-orange-400' :
                    selectedBugReport.severity === 'medium' ? 'bg-yellow-600/20 text-yellow-400' :
                    'bg-blue-600/20 text-blue-400'
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
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Kategorie</label>
                  <p className="text-white capitalize">
                    {selectedBugReport.category === 'gameplay' ? 'Gameplay' :
                     selectedBugReport.category === 'ui' ? 'Benutzeroberfläche' :
                     selectedBugReport.category === 'audio' ? 'Audio' :
                     selectedBugReport.category === 'performance' ? 'Performance' :
                     selectedBugReport.category === 'auth' ? 'Authentifizierung' :
                     selectedBugReport.category === 'data' ? 'Daten' : 'Sonstiges'}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Gemeldet am</label>
                  <p className="text-white">
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
                <label className="block text-sm font-semibold text-dark-300 mb-2">Beschreibung</label>
                <p className="text-white bg-dark-800/50 rounded-lg p-4 border border-dark-700 whitespace-pre-wrap">
                  {selectedBugReport.description}
                </p>
              </div>

              {/* Screenshot */}
              {selectedBugReport.screenshotUrl && (
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Screenshot</label>
                  <div className="relative group">
                    <img
                      src={selectedBugReport.screenshotUrl}
                      alt="Bug screenshot"
                      className="w-full rounded-lg border border-dark-700 cursor-pointer hover:border-warning-500 transition-colors"
                      onClick={() => window.open(selectedBugReport.screenshotUrl, '_blank')}
                    />
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a
                        href={selectedBugReport.screenshotUrl}
                        download={`bug-report-${selectedBugReport.id}.png`}
                        className="px-3 py-1 bg-dark-900/90 hover:bg-dark-800 text-white text-sm rounded-lg transition-colors"
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
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Browser-Informationen</label>
                  <div className="bg-dark-800/50 rounded-lg p-4 border border-dark-700 text-sm">
                    <p className="text-dark-400 mb-1">
                      <span className="text-white font-medium">User Agent:</span> {selectedBugReport.browserInfo.userAgent}
                    </p>
                    <p className="text-dark-400 mb-1">
                      <span className="text-white font-medium">Bildschirm:</span> {selectedBugReport.browserInfo.screenResolution}
                    </p>
                    <p className="text-dark-400">
                      <span className="text-white font-medium">Viewport:</span> {selectedBugReport.browserInfo.viewport}
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              {selectedBugReport.adminNotes && (
                <div>
                  <label className="block text-sm font-semibold text-dark-300 mb-2">Admin-Notizen</label>
                  <p className="text-white bg-blue-500/10 rounded-lg p-4 border border-blue-500/30 whitespace-pre-wrap">
                    {selectedBugReport.adminNotes}
                  </p>
                </div>
              )}
            </div>

            {/* Close Button */}
            <div className="mt-6">
              <button
                onClick={() => setSelectedBugReport(null)}
                className="w-full py-3 px-4 bg-dark-700 hover:bg-dark-600 rounded-lg text-white font-semibold transition-colors"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
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