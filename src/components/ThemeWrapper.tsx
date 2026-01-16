import React, { ReactNode } from 'react';
import { useSettings } from '../context/SettingsContext';

interface ThemeWrapperProps {
  children: ReactNode;
  className?: string;
}

/**
 * ThemeWrapper Component
 * Wraps content with theme-specific classes
 */
export const ThemeWrapper: React.FC<ThemeWrapperProps> = ({ children, className = '' }) => {
  const { settings } = useSettings();
  const isSteampunk = settings.theme === 'steampunk';

  // Background classes based on theme
  const bgClass = isSteampunk 
    ? 'sp-gradient-bg' 
    : 'gradient-mesh';

  return (
    <div className={`${bgClass} ${className}`}>
      {children}
    </div>
  );
};

/**
 * Get theme-specific card classes
 */
export const useThemeCard = () => {
  const { settings } = useSettings();
  const isSteampunk = settings.theme === 'steampunk';

  return isSteampunk
    ? 'sp-card sp-font-body text-sp-text-primary'
    : 'glass-card text-white';
};

/**
 * Get theme-specific button classes
 */
export const useThemeButton = () => {
  const { settings } = useSettings();
  const isSteampunk = settings.theme === 'steampunk';

  return isSteampunk
    ? 'sp-button sp-font-body'
    : 'bg-primary-600 hover:bg-primary-700';
};

/**
 * Get theme-specific input classes
 */
export const useThemeInput = () => {
  const { settings } = useSettings();
  const isSteampunk = settings.theme === 'steampunk';

  return isSteampunk
    ? 'sp-input sp-font-body'
    : 'bg-dark-800 border-dark-700 text-white';
};

/**
 * Get theme-specific heading classes
 */
export const useThemeHeading = () => {
  const { settings } = useSettings();
  const isSteampunk = settings.theme === 'steampunk';

  return isSteampunk
    ? 'sp-font-heading sp-text-gold'
    : 'text-white';
};

/**
 * Get theme-specific divider
 */
export const useThemeDivider = () => {
  const { settings } = useSettings();
  const isSteampunk = settings.theme === 'steampunk';

  return isSteampunk
    ? 'sp-divider'
    : 'border-t border-dark-700';
};

export default ThemeWrapper;
