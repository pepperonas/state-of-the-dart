import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';
import { applyTheme } from '../utils/theme';

/**
 * ThemeManager Component
 * Applies the selected theme to the document root
 * Manages theme-specific classes and styles
 *
 * The DOM swap itself lives in `utils/theme.ts` so the animated theme reveal in
 * Settings can run exactly the same swap inside a view transition. This effect
 * stays the safety net: it also covers first load and any change that does not
 * come from the toggle.
 */
const ThemeManager: React.FC = () => {
  const { settings } = useSettings();

  useEffect(() => {
    applyTheme(settings.theme);
  }, [settings.theme]);

  return null; // This component doesn't render anything
};

export default ThemeManager;
