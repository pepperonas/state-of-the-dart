import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

/**
 * ThemeManager Component
 * Applies the selected theme to the document root
 * Manages theme-specific classes and styles
 */
const ThemeManager: React.FC = () => {
  const { settings } = useSettings();

  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;

    // Remove all theme classes
    root.classList.remove('modern', 'steampunk', 'cyberpunk', 'dark');
    body.classList.remove('modern', 'steampunk', 'cyberpunk', 'dark');

    // Map theme names (steampunk class is now cyberpunk styling)
    const theme = settings.theme === 'dark' ? 'modern' : settings.theme;
    root.classList.add(theme);
    body.classList.add(theme);

    // Apply theme-specific font family
    if (theme === 'steampunk') {
      // Cyberpunk fonts
      body.style.fontFamily = "'Rajdhani', sans-serif";
    } else {
      body.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    }

    console.log(`🎨 Theme applied: ${theme}`);
  }, [settings.theme]);

  return null; // This component doesn't render anything
};

export default ThemeManager;
