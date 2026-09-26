import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
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

const normalizeTheme = (theme: any): 'modern' | 'modern-light' => {
  // Map old steampunk theme to modern
  if (theme === 'steampunk' || theme === 'dark') return 'modern';
  if (theme === 'modern-light') return 'modern-light';
  return 'modern';
};

const SettingsContext = createContext<SettingsContextType | null>(null);

/** The API row for a full settings object. */
const toApiSettings = (s: AppSettings) => ({
  theme: s.theme,
  language: s.language,
  show_checkout_suggestions: s.showCheckoutHints,
  auto_next_player: s.autoNextPlayer,
  show_dartboard_helper: s.showDartboardHelper,
  sound_volume: s.soundVolume,
  caller_volume: s.callerVolume,
  effects_volume: s.effectsVolume,
  show_stats_during_game: s.showStatsDuringGame,
  confirm_scores: s.confirmScores,
  vibration_enabled: s.vibrationEnabled,
});

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const userId = user?.id;
  
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
          soundVolume: response.sound_volume ?? 70,
          callerVolume: response.caller_volume ?? 70,
          effectsVolume: response.effects_volume ?? 70,
          showCheckoutHints: response.show_checkout_suggestions !== 0,
          autoNextPlayer: response.auto_next_player !== 0,
          showStatsDuringGame: response.show_stats_during_game !== undefined ? !!response.show_stats_during_game : true,
          confirmScores: response.confirm_scores !== undefined ? !!response.confirm_scores : false,
          vibrationEnabled: response.vibration_enabled !== undefined ? !!response.vibration_enabled : true,
          // Own column since 2026-09 — it used to live in enable_achievements_hints.
          showDartboardHelper: (response.show_dartboard_helper ?? response.enable_achievements_hints) !== 0,
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
    // The id, not the object: a fresh user object (refreshUser) must not
    // reload settings and throw away unsaved local changes.
  }, [user?.id]);

  useEffect(() => {
    i18n.changeLanguage(settings.language);
  }, [settings.language]);
  
  // The latest settings, readable synchronously. updateSettings used to build
  // on the `settings` of its render: two quick changes (dragging two volume
  // sliders) each started from the same old object, and the second one sent —
  // and kept — the first one's old value.
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    if (!userId) return;

    const previous = settingsRef.current;
    const next = { ...previous, ...updates };
    settingsRef.current = next;
    setSettings(next);

    if (updates.language && updates.language !== previous.language) {
      await i18n.changeLanguage(updates.language);
    }

    try {
      await api.settings.update(toApiSettings(next));
    } catch (error) {
      console.error('Failed to update settings:', error);
      // Roll back only what THIS call changed, and only where nothing newer
      // has overwritten it since.
      const current = settingsRef.current;
      const rolledBack = { ...current };
      let changed = false;
      (Object.keys(updates) as Array<keyof AppSettings>).forEach(key => {
        if (current[key] === next[key]) {
          (rolledBack as Record<string, unknown>)[key] = previous[key];
          changed = true;
        }
      });
      if (changed) {
        settingsRef.current = rolledBack;
        setSettings(rolledBack);
        if (updates.language && rolledBack.language !== current.language) {
          await i18n.changeLanguage(rolledBack.language);
        }
      }
      throw error;
    }
  }, [userId]);

  const resetSettings = useCallback(async () => {
    if (!userId) return;
    settingsRef.current = defaultSettings;
    setSettings(defaultSettings);
    try {
      await api.settings.update(toApiSettings(defaultSettings));
    } catch (error) {
      console.error('Failed to reset settings:', error);
      throw error;
    }
  }, [userId]);

  // Stable value: every consumer re-rendered on every provider render before.
  const value = useMemo(
    () => ({ settings, loading, updateSettings, resetSettings }),
    [settings, loading, updateSettings, resetSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
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
