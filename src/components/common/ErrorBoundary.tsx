import React from 'react';
import { logger } from '../../utils/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Top-level React error boundary. Without this, any render-time throw (a bad
 * JSON.parse during match reconstruction, a failed lazy chunk, etc.) white-
 * screens the whole PWA. Catches the error, logs it, and shows an M3 recovery
 * screen with reload / back-to-menu actions.
 */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    logger.error('React render error caught by ErrorBoundary:', error, info?.componentStack);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleHome = () => {
    window.location.href = '/';
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-dvh flex items-center justify-center gradient-mesh p-4">
        <div className="m3-card m3-elevated rounded-m3-xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎯💥</div>
          <h1 className="m3-headline-small font-bold text-on-surface mb-2">
            Etwas ist schiefgelaufen
          </h1>
          <p className="m3-body-medium text-on-surface-variant mb-6">
            Die App ist auf einen unerwarteten Fehler gestoßen. Deine Daten sind sicher gespeichert —
            ein Neuladen behebt das meist.
          </p>
          {this.state.error?.message && (
            <div className="bg-surface-container rounded-m3-md p-3 mb-6 text-left">
              <code className="m3-body-small text-on-surface-variant break-words">
                {this.state.error.message}
              </code>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={this.handleReload}
              className="px-6 py-3 rounded-m3-full bg-primary text-on-primary font-semibold hover:opacity-90 transition-all"
            >
              Neu laden
            </button>
            <button
              onClick={this.handleHome}
              className="px-6 py-3 rounded-m3-full bg-surface-container-high text-on-surface font-semibold hover:bg-surface-container-highest transition-all"
            >
              Zum Hauptmenü
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
