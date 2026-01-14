import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types/index';
import { useTenant } from './TenantContext';

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const defaultSettings: AppSettings = {
  theme: 'auto',
  language: 'en',
  soundVolume: 70,
  showCheckoutHints: true,
  autoNextPlayer: true,
  showStatsDuringGame: true,
  confirmScores: false,
  vibrationEnabled: true,
  showDartboardHelper: true,
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { storage } = useTenant();
  
  const [settings, setSettings] = useState<AppSettings>(() => {
    if (!storage) return defaultSettings;
    const saved = storage.get<Partial<AppSettings>>('settings', {});
    return { ...defaultSettings, ...saved };
  });
  
  // Reload settings when tenant changes
  useEffect(() => {
    if (storage) {
      const saved = storage.get<Partial<AppSettings>>('settings', {});
      setSettings({ ...defaultSettings, ...saved });
    } else {
      setSettings(defaultSettings);
    }
  }, [storage]);
  
  useEffect(() => {
    if (storage) {
      storage.set('settings', settings);
    }
  }, [settings, storage]);
  
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