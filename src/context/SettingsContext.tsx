import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types/index';
import { useTenant } from './TenantContext';
import i18n from '../i18n/config';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'modern',
  language: 'de', // Default auf Deutsch
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

// Normalize legacy theme values
const normalizeTheme = (theme: any): 'modern' | 'steampunk' => {
  if (theme === 'steampunk') return 'steampunk';
  // Map 'dark', 'auto', 'light' to 'modern'
  return 'modern';
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { storage } = useTenant();
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (!storage) return defaultSettings;
    const saved = storage.get<Partial<AppSettings>>('settings', {});
    const normalized = { ...defaultSettings, ...saved };
    // Normalize theme
    normalized.theme = normalizeTheme(normalized.theme);
    return normalized;
  });
  
  // Reload settings when tenant changes
  useEffect(() => {
    if (storage) {
      const saved = storage.get<Partial<AppSettings>>('settings', {});
      const normalized = { ...defaultSettings, ...saved };
      // Normalize theme
      normalized.theme = normalizeTheme(normalized.theme);
      setSettings(normalized);
      // Sync language with i18n
      i18n.changeLanguage(normalized.language);
    } else {
      setSettings(defaultSettings);
      i18n.changeLanguage(defaultSettings.language);
    }
  }, [storage]);
  
  useEffect(() => {
    if (storage) {
      storage.set('settings', settings);
    }
  }, [settings, storage]);

  // Sync language changes with i18n
  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);
  
  const updateSettings = (updates: Partial<AppSettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };
  
  const resetSettings = () => {
    setSettings(defaultSettings);
  };
  
  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
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