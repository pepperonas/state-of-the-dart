import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types/index';
import { useAuth } from './AuthContext';
import { api } from '../services/api';
import i18n from '../i18n/config';

interface SettingsContextType {
  settings: AppSettings;
  loading: boolean;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => Promise<void>;
}

const defaultSettings: AppSettings = {
  theme: 'modern',
  language: 'de',
  soundVolume: 70,
  callerVolume: 70,
  effectsVolume: 70,
  showCheckoutHints: true,
  autoNextPlayer: true,
  showStatsDuringGame: true,
  confirmScores: false,
  vibrationEnabled: true,
  showDartboardHelper: true,
};

const normalizeTheme = (theme: any): 'modern' | 'steampunk' => {
  if (theme === 'steampunk') return 'steampunk';
  return 'modern';
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  
  // Load settings from API (Database only!)
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        setSettings(defaultSettings);
        i18n.changeLanguage(defaultSettings.language);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await api.settings.get();
        
        const loadedSettings: AppSettings = {
          theme: normalizeTheme(response.theme || 'modern'),
          language: response.language || 'de',
          soundVolume: 70,
          callerVolume: 70,
          effectsVolume: 70,
          showCheckoutHints: response.show_checkout_suggestions !== 0,
          autoNextPlayer: response.auto_next_player !== 0,
          showStatsDuringGame: true,
          confirmScores: false,
          vibrationEnabled: true,
          showDartboardHelper: response.enable_achievements_hints !== 0,
        };
        
        setSettings(loadedSettings);
        i18n.changeLanguage(loadedSettings.language);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setSettings(defaultSettings);
        i18n.changeLanguage(defaultSettings.language);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);
  
  const updateSettings = async (updates: Partial<AppSettings>) => {
    if (!user) return;
    
    const previousSettings = settings;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    try {
      await api.settings.update({
        theme: newSettings.theme,
        language: newSettings.language,
        show_checkout_suggestions: newSettings.showCheckoutHints,
        auto_next_player: newSettings.autoNextPlayer,
        enable_achievements_hints: newSettings.showDartboardHelper,
      });
    } catch (error) {
      console.error('Failed to update settings:', error);
      setSettings(previousSettings);
      throw error;
    }
  };
  
  const resetSettings = async () => {
    if (!user) return;
    
    setSettings(defaultSettings);
    
    try {
      await api.settings.update({
        theme: defaultSettings.theme,
        language: defaultSettings.language,
        show_checkout_suggestions: defaultSettings.showCheckoutHints,
        auto_next_player: defaultSettings.autoNextPlayer,
        enable_achievements_hints: defaultSettings.showDartboardHelper,
      });
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  };
  
  return (
    <SettingsContext.Provider value={{ settings, loading, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
