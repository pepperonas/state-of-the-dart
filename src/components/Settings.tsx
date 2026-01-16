import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Volume2, Bell, Globe, LogOut, User, Play, Download, Upload, Smartphone, Palette, Check, Sparkles } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';
import audioSystem from '../utils/audio';
import { exportTenantData, importTenantData } from '../utils/exportImport';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode }) => {
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
          Back to Menu
        </button>
        
        <div className="glass-card rounded-xl shadow-lg p-6 md:p-8">
          <h2 className="text-3xl font-bold mb-6 text-white">Settings</h2>
          
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

                {/* Steampunk Theme */}
                <button
                  onClick={() => updateSettings({ theme: 'steampunk' })}
                  className={`w-full p-4 rounded-lg border-2 transition-all ${
                    settings.theme === 'steampunk' 
                      ? 'border-amber-600 bg-amber-600/10' 
                      : 'border-dark-700 bg-dark-800 hover:border-dark-600'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg sp-bronze-gradient border border-amber-700/50 flex items-center justify-center relative overflow-hidden">
                      <span className="text-2xl">⚙️</span>
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white font-semibold">Victorian Steampunk</p>
                      <p className="text-sm text-dark-300">Bronze, brass & gears</p>
                    </div>
                    {settings.theme === 'steampunk' && (
                      <div className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center">
                        <Check size={16} className="text-white" />
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
                Language
              </h3>
              
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'de' })}
                className="w-full p-2 rounded-lg border border-dark-700 bg-dark-800 text-white"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
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
    </div>
  );
};

export default Settings;