import { useState } from 'react';
import { X, Camera, AlertCircle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { captureScreenshot, getBrowserInfo } from '../../utils/screenshot';
import type { BugReportSeverity, BugReportCategory } from '../../types';
import { Select } from '../common';
import { Icon } from '../icons';

interface BugReportModalProps {
  onClose: () => void;
  currentRoute?: string;
}

export default function BugReportModal({ onClose, currentRoute }: BugReportModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<BugReportSeverity>('medium');
  const [category, setCategory] = useState<BugReportCategory>('other');
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleCaptureScreenshot = async () => {
    setIsCapturing(true);
    try {
      const screenshotData = await captureScreenshot();
      setScreenshot(screenshotData);
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !description.trim()) {
      setError('Bitte Titel und Beschreibung ausfüllen');
      return;
    }

    setIsSubmitting(true);

    try {
      const browserInfo = getBrowserInfo();

      await api.bugReports.create({
        title: title.trim(),
        description: description.trim(),
        severity,
        category,
        screenshotUrl: screenshot || undefined,
        browserInfo,
        route: currentRoute,
      });

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      // If screenshot might be too large, retry without it
      if (screenshot && (err.message?.includes('413') || err.message?.includes('payload') || err.message?.includes('too large') || err.response?.status === 413)) {
        try {
          await api.bugReports.create({
            title: title.trim(),
            description: description.trim(),
            severity,
            category,
            browserInfo: getBrowserInfo(),
            route: currentRoute,
          });
          setScreenshot(null);
          setSuccess(true);
          setTimeout(() => onClose(), 1500);
          return;
        } catch (retryErr: any) {
          setError(retryErr.message || 'Fehler beim Senden des Bug-Reports');
        }
      } else {
        setError(err.message || 'Fehler beim Senden des Bug-Reports');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityOptions: { value: BugReportSeverity; label: string; color: string }[] = [
    { value: 'low', label: 'Niedrig', color: 'text-blue-400' },
    { value: 'medium', label: 'Mittel', color: 'text-yellow-400' },
    { value: 'high', label: 'Hoch', color: 'text-orange-400' },
    { value: 'critical', label: 'Kritisch', color: 'text-red-400' },
  ];

  const categoryOptions: { value: BugReportCategory; label: string }[] = [
    { value: 'gameplay', label: 'Gameplay' },
    { value: 'ui', label: 'Benutzeroberfläche' },
    { value: 'audio', label: 'Audio/Sound' },
    { value: 'performance', label: 'Performance' },
    { value: 'auth', label: 'Login/Authentifizierung' },
    { value: 'data', label: 'Daten/Speicherung' },
    { value: 'achievements', label: 'Achievements' },
    { value: 'other', label: 'Sonstiges' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 m3-scrim-enter">
      <div className="m3-card m3-elevated rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto m3-dialog-enter">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-warning-400" size={28} />
            <h2 className="text-2xl font-bold text-on-surface">Bug melden</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface-container-high rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X size={24} className="text-gray-400" />
          </button>
        </div>

        {success ? (
          <div className="py-12 text-center">
            <div className="mb-4 flex justify-center text-success"><Icon name="checkCircle" size={56} /></div>
            <h3 className="text-2xl font-bold text-on-surface mb-2">Vielen Dank!</h3>
            <p className="text-gray-400">Dein Bug-Report wurde erfolgreich übermittelt.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Error Message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Titel *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Kurze Zusammenfassung des Problems"
                className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary transition-colors"
                required
                disabled={isSubmitting}
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Beschreibung *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Beschreibe das Problem so detailliert wie möglich. Was hast du erwartet und was ist stattdessen passiert?"
                rows={6}
                className="w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-lg text-on-surface placeholder-on-surface-variant focus:outline-none focus:border-primary transition-colors resize-none"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Severity and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Severity */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Schweregrad *
                </label>
                <Select<BugReportSeverity>
                  value={severity}
                  onChange={setSeverity}
                  options={severityOptions}
                  size="lg"
                  disabled={isSubmitting}
                  aria-label="Schweregrad"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-2">
                  Kategorie *
                </label>
                <Select<BugReportCategory>
                  value={category}
                  onChange={setCategory}
                  options={categoryOptions}
                  size="lg"
                  disabled={isSubmitting}
                  aria-label="Kategorie"
                />
              </div>
            </div>

            {/* Screenshot */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-2">
                Screenshot (optional)
              </label>
              {screenshot ? (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="w-full rounded-lg border border-outline-variant"
                  />
                  <button
                    type="button"
                    onClick={() => setScreenshot(null)}
                    className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                    disabled={isSubmitting}
                  >
                    <X size={16} className="text-on-surface" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureScreenshot}
                  disabled={isCapturing || isSubmitting}
                  className="w-full py-3 px-4 bg-surface-container border border-outline-variant hover:border-primary rounded-lg text-on-surface transition-colors flex items-center justify-center gap-2"
                >
                  {isCapturing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      <span>Erfasse Screenshot...</span>
                    </>
                  ) : (
                    <>
                      <Camera size={20} />
                      <span>Screenshot erfassen</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 px-4 bg-surface-container-high hover:bg-surface-container-highest rounded-lg text-on-surface font-semibold transition-colors"
                disabled={isSubmitting}
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 bg-tertiary-container text-on-tertiary-container m3-state-layer m3-ripple rounded-m3-full font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Wird gesendet...</span>
                  </>
                ) : (
                  'Bug melden'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
