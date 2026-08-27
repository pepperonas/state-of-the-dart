import React from 'react';
import { Link } from 'react-router-dom';
import { Globe, Github, Linkedin } from 'lucide-react';
import packageJson from '../../package.json';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto pt-8 pb-4">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-3 m3-enter-fade m3-delay-3">
        <div className="flex flex-wrap items-center justify-center gap-3 m3-body-small text-on-surface-variant">
          <span>&copy; 2026 Martin Pfeffer</span>
          <span className="hidden sm:inline">&bull;</span>
          <a
            href="https://celox.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <Globe size={14} />
            celox.io
          </a>
          <span className="hidden sm:inline">&bull;</span>
          <a
            href="https://github.com/pepperonas/state-of-the-dart"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:opacity-80 transition-opacity flex items-center gap-1"
          >
            <Github size={14} />
            GitHub
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 m3-label-medium text-on-surface-variant">
          <Link to="/impressum" className="hover:text-on-surface transition-colors">
            Impressum
          </Link>
          <span className="hidden sm:inline">&bull;</span>
          <Link to="/datenschutz" className="hover:text-on-surface transition-colors">
            Datenschutz
          </Link>
          <span className="hidden sm:inline">&bull;</span>
          <Link to="/nutzungsbedingungen" className="hover:text-on-surface transition-colors">
            AGB
          </Link>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 m3-label-medium text-on-surface-variant">
          <a
            href="https://www.linkedin.com/in/martin-pfeffer-020831134/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Linkedin size={14} />
            LinkedIn
          </a>
          <span className="hidden sm:inline">&bull;</span>
          <a
            href="https://github.com/pepperonas"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors flex items-center gap-1"
          >
            <Github size={14} />
            GitHub Profil
          </a>
        </div>

        <p className="m3-label-medium text-on-surface-variant opacity-70">
          Version {packageJson.version}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
