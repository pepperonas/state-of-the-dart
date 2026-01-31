import React from 'react';
import { ExternalLink, Github, Linkedin } from 'lucide-react';
import packageJson from '../../package.json';

const Footer: React.FC = () => {
  return (
    <footer className="mt-auto pt-8 pb-4">
      <div className="max-w-6xl mx-auto px-4 text-center space-y-3">
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-dark-400">
          <span>© 2026 Martin Pfeffer</span>
          <span>•</span>
          <a 
            href="https://celox.io" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            celox.io
            <ExternalLink size={12} />
          </a>
          <span>•</span>
          <a 
            href="https://github.com/pepperonas/state-of-the-dart" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
          >
            <Github size={14} />
            GitHub
          </a>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-dark-500">
          <a 
            href="https://celox.io/impressum" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-dark-400 transition-colors"
          >
            Impressum
          </a>
          <span>•</span>
          <a 
            href="https://celox.io/datenschutz" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-dark-400 transition-colors"
          >
            Datenschutz
          </a>
          <span>•</span>
          <a 
            href="https://celox.io/agb" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-dark-400 transition-colors"
          >
            AGB
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-dark-500">
          <a 
            href="https://www.linkedin.com/in/martin-pfeffer-020831134/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary-400 transition-colors flex items-center gap-1"
          >
            <Linkedin size={14} />
            LinkedIn
          </a>
          <span>•</span>
          <a 
            href="https://github.com/pepperonas" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-primary-400 transition-colors flex items-center gap-1"
          >
            <Github size={14} />
            GitHub Profil
          </a>
        </div>

        <p className="text-xs text-dark-600">
          Version {packageJson.version}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
