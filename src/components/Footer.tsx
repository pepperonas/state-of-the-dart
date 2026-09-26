import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Github, Linkedin } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import packageJson from '../../package.json';

/** Names, not language — they stay the same in every locale. */
const COPYRIGHT_HOLDER = 'Martin Pfeffer';
const SITE_NAME = 'celox.io';
const LINKEDIN = 'LinkedIn';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="mt-auto pt-8 pb-4">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-3 m3-enter-fade m3-delay-3">
        <div className="flex flex-wrap items-center justify-center gap-3 m3-body-small text-on-surface-variant">
          <span>© 2026 {COPYRIGHT_HOLDER}</span>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://celox.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80 transition-opacity inline-flex items-center gap-1 min-h-6"
          >
            <Globe size={14} />
            {SITE_NAME}
          </a>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://github.com/pepperonas/state-of-the-dart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80 transition-opacity inline-flex items-center gap-1 min-h-6"
          >
            <Github size={14} />
            GitHub
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 m3-label-medium text-on-surface-variant">
          <Link to="/impressum" className="hover:text-on-surface transition-colors inline-flex items-center min-h-6">
            {t('footer.imprint')}
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link to="/datenschutz" className="hover:text-on-surface transition-colors inline-flex items-center min-h-6">
            {t('footer.privacy')}
          </Link>
          <span className="hidden sm:inline">•</span>
          <Link to="/nutzungsbedingungen" className="hover:text-on-surface transition-colors inline-flex items-center min-h-6">
            {t('footer.terms')}
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 m3-label-medium text-on-surface-variant">
          <a
            href="https://www.linkedin.com/in/martin-pfeffer-020831134/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors inline-flex items-center gap-1 min-h-6"
          >
            <Linkedin size={14} />
            {LINKEDIN}
          </a>
          <span className="hidden sm:inline">•</span>
          <a
            href="https://github.com/pepperonas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors inline-flex items-center gap-1 min-h-6"
          >
            <Github size={14} />
            {t('footer.github_profile')}
          </a>
        </div>

        <p className="m3-label-medium text-on-surface-variant">
          {t('footer.version', { version: packageJson.version })}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
