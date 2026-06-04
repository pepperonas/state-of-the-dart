/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Modern Minimalist Color Palette
        primary: {
          DEFAULT: 'var(--m3-primary)', // bare `bg-primary`/`text-primary` = M3 role
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        accent: {
          DEFAULT: 'var(--m3-tertiary)', // bare `bg-accent`/`text-accent` = M3 tertiary role
          50: '#faf5ff',
          100: '#f3e8ff',
          200: '#e9d5ff',
          300: '#d8b4fe',
          400: '#c084fc',
          500: '#a855f7',
          600: '#9333ea',
          700: '#7e22ce',
          800: '#6b21a8',
          900: '#581c87',
        },
        success: {
          DEFAULT: 'var(--m3-success)', // bare `bg-success`/`text-success` = M3 role
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        dark: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
          950: '#0a0a0a',
        },

        /* ── Material 3 Expressive color roles (token-backed) ──
           These resolve to CSS vars in src/styles/m3.css and switch with the
           theme. Legacy scales above are kept for unmigrated screens. Role
           names that would collide with a legacy scale (primary/secondary/
           success) are exposed only via their `*-container`/`on-*` variants;
           use `text-[var(--m3-primary)]` or the common/* primitives for the
           base primary/secondary roles. */
        secondary: 'var(--m3-secondary)',
        'on-primary': 'var(--m3-on-primary)',
        'primary-container': 'var(--m3-primary-container)',
        'on-primary-container': 'var(--m3-on-primary-container)',
        'on-secondary': 'var(--m3-on-secondary)',
        'secondary-container': 'var(--m3-secondary-container)',
        'on-secondary-container': 'var(--m3-on-secondary-container)',
        tertiary: 'var(--m3-tertiary)',
        'on-tertiary': 'var(--m3-on-tertiary)',
        'tertiary-container': 'var(--m3-tertiary-container)',
        'on-tertiary-container': 'var(--m3-on-tertiary-container)',
        error: 'var(--m3-error)',
        'on-error': 'var(--m3-on-error)',
        'error-container': 'var(--m3-error-container)',
        'on-error-container': 'var(--m3-on-error-container)',
        'on-success': 'var(--m3-on-success)',
        'success-container': 'var(--m3-success-container)',
        'on-success-container': 'var(--m3-on-success-container)',
        surface: 'var(--m3-surface)',
        'surface-dim': 'var(--m3-surface-dim)',
        'surface-bright': 'var(--m3-surface-bright)',
        'surface-container-lowest': 'var(--m3-surface-container-lowest)',
        'surface-container-low': 'var(--m3-surface-container-low)',
        'surface-container': 'var(--m3-surface-container)',
        'surface-container-high': 'var(--m3-surface-container-high)',
        'surface-container-highest': 'var(--m3-surface-container-highest)',
        'on-surface': 'var(--m3-on-surface)',
        'on-surface-variant': 'var(--m3-on-surface-variant)',
        outline: 'var(--m3-outline)',
        'outline-variant': 'var(--m3-outline-variant)',
        'inverse-surface': 'var(--m3-inverse-surface)',
        'inverse-on-surface': 'var(--m3-inverse-on-surface)',
      },
      borderRadius: {
        'm3-xs': 'var(--m3-shape-xs)',
        'm3-sm': 'var(--m3-shape-sm)',
        'm3-md': 'var(--m3-shape-md)',
        'm3-lg': 'var(--m3-shape-lg)',
        'm3-lg-increased': 'var(--m3-shape-lg-increased)',
        'm3-xl': 'var(--m3-shape-xl)',
        'm3-2xl': 'var(--m3-shape-2xl)',
        'm3-full': 'var(--m3-shape-full)',
      },
      boxShadow: {
        'm3-1': 'var(--m3-elevation-1)',
        'm3-2': 'var(--m3-elevation-2)',
        'm3-3': 'var(--m3-elevation-3)',
        'm3-4': 'var(--m3-elevation-4)',
        'm3-5': 'var(--m3-elevation-5)',
      },
      backdropBlur: {
        xs: '2px',
      },
      backgroundColor: {
        'glass': 'rgba(255, 255, 255, 0.03)',
        'glass-light': 'rgba(255, 255, 255, 0.05)',
        'glass-hover': 'rgba(255, 255, 255, 0.08)',
      },
      backdropBlur: {
        xs: '2px',
      },
      animation: {
        'dart-hit': 'dartHit 0.3s ease-out',
        'score-pop': 'scorePop 0.5s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        dartHit: {
          '0%': { transform: 'scale(1.5)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scorePop: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '50%': { transform: 'translateY(-10px)', opacity: '1' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        }
      },
    },
  },
  plugins: [],
}