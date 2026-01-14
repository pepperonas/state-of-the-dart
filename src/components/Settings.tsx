import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Volume2, Bell, Globe, LogOut, User } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import { useTenant } from '../context/TenantContext';

interface SettingsProps {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}

const Settings: React.FC<SettingsProps> = ({ darkMode, setDarkMode }) => {
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const { currentTenant, setCurrentTenant } = useTenant();
  
  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="mb-6 flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
        >
          <ArrowLeft size={20} />
          Back to Menu
        </button>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
          <h2 className="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Settings</h2>
          
          <div className="space-y-6">
            {/* Theme */}
            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                {darkMode ? <Moon size={20} /> : <Sun size={20} />}
                Appearance
              </h3>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">Dark Mode</span>
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    darkMode ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      darkMode ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
            
            {/* Sound */}
            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Volume2 size={20} />
                Sound
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between mb-2">
                    <span className="text-gray-700 dark:text-gray-300">Volume</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{settings.soundVolume}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.soundVolume}
                    onChange={(e) => updateSettings({ soundVolume: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Vibration</span>
                  <button
                    onClick={() => updateSettings({ vibrationEnabled: !settings.vibrationEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.vibrationEnabled ? 'bg-green-500' : 'bg-gray-300'
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
            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Bell size={20} />
                Game
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Show Checkout Hints</span>
                  <button
                    onClick={() => updateSettings({ showCheckoutHints: !settings.showCheckoutHints })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showCheckoutHints ? 'bg-green-500' : 'bg-gray-300'
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
                  <span className="text-gray-700 dark:text-gray-300">Auto Next Player</span>
                  <button
                    onClick={() => updateSettings({ autoNextPlayer: !settings.autoNextPlayer })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.autoNextPlayer ? 'bg-green-500' : 'bg-gray-300'
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
                  <span className="text-gray-700 dark:text-gray-300">Show Stats During Game</span>
                  <button
                    onClick={() => updateSettings({ showStatsDuringGame: !settings.showStatsDuringGame })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showStatsDuringGame ? 'bg-green-500' : 'bg-gray-300'
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
                  <span className="text-gray-700 dark:text-gray-300">Show Dartboard Helper</span>
                  <button
                    onClick={() => updateSettings({ showDartboardHelper: !settings.showDartboardHelper })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings.showDartboardHelper ? 'bg-green-500' : 'bg-gray-300'
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
            <div className="pb-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Globe size={20} />
                Language
              </h3>
              
              <select
                value={settings.language}
                onChange={(e) => updateSettings({ language: e.target.value as 'en' | 'de' })}
                className="w-full p-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
              >
                <option value="en">English</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            
            {/* Profile */}
            <div>
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Aktives Profil
                    </p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => {
                  if (confirm('Möchtest du dich wirklich abmelden? Das aktuelle Spiel wird gespeichert.')) {
                    setCurrentTenant(null);
                    navigate('/');
                  }
                }}
                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <LogOut size={20} />
                Profil wechseln
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;