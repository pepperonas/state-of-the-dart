import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppSettings } from '../types/index';
import { useTenant } from './TenantContext';
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

// Normalize legacy theme values
const normalizeTheme = (theme: any): 'modern' | 'steampunk' => {
  if (theme === 'steampunk') return 'steampunk';
  return 'modern';
};

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { storage } = useTenant();
  const { user } = useAuth();
  
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  
  // Load settings from API when user is authenticated
  useEffect(() => {
    const loadSettings = async () => {
      if (!user) {
        // Not logged in → use default settings
        setSettings(defaultSettings);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        
        // Try to load from API
        const response = await api.settings.get();
        console.log('🔧 SettingsContext: Loaded from API:', response);
        
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
        
        // Cache in localStorage for offline access
        if (storage) {
          storage.set('settings-cache', loadedSettings);
        }
        
        // Sync language with i18n
        i18n.changeLanguage(loadedSettings.language);
      } catch (error) {
        console.error('❌ Failed to load settings from API:', error);
        
        // Fallback: try localStorage cache
        if (storage) {
          const cached = storage.get<Partial<AppSettings>>('settings-cache', {});
          if (cached && Object.keys(cached).length > 0) {
            console.log('📦 Using cached settings (offline)');
            const mergedSettings = { ...defaultSettings, ...cached };
            setSettings(mergedSettings);
            i18n.changeLanguage(mergedSettings.language);
          } else {
            setSettings(defaultSettings);
            i18n.changeLanguage(defaultSettings.language);
          }
        } else {
          setSettings(defaultSettings);
          i18n.changeLanguage(defaultSettings.language);
        }
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user, storage]);

  // Sync language changes with i18n
  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);
  
  const updateSettings = async (updates: Partial<AppSettings>) => {
    // Optimistic UI Update
    const previousSettings = settings;
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    
    // Update localStorage cache immediately
    if (storage) {
      storage.set('settings-cache', newSettings);
    }
    
    // Sync to API
    if (user) {
      try {
        await api.settings.update({
          theme: newSettings.theme,
          language: newSettings.language,
          show_checkout_suggestions: newSettings.showCheckoutHints,
          auto_next_player: newSettings.autoNextPlayer,
          enable_achievements_hints: newSettings.showDartboardHelper,
        });
        console.log('✅ Settings synced to API');
      } catch (error) {
        console.error('❌ Failed to sync settings to API:', error);
        // Rollback on error
        setSettings(previousSettings);
        throw error;
      }
    }
  };
  
  const resetSettings = async () => {
    // Reset to default
    setSettings(defaultSettings);
    
    // Update localStorage cache
    if (storage) {
      storage.set('settings-cache', defaultSettings);
    }
    
    // Sync to API
    if (user) {
      try {
        await api.settings.update({
          theme: defaultSettings.theme,
          language: defaultSettings.language,
          show_checkout_suggestions: defaultSettings.showCheckoutHints,
          auto_next_player: defaultSettings.autoNextPlayer,
          enable_achievements_hints: defaultSettings.showDartboardHelper,
        });
        console.log('✅ Settings reset synced to API');
      } catch (error) {
        console.error('❌ Failed to sync settings reset to API:', error);
        throw error;
      }
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
