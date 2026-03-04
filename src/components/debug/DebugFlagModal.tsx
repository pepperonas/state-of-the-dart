import React, { useState, useEffect, useRef } from 'react';
import { XCircle, Flag, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { captureScreenshot, getBrowserInfo } from '../../utils/screenshot';
import { logBuffer } from '../../utils/logBuffer';
import { api } from '../../services/api';

interface DebugFlagModalProps {
  onClose: () => void;
}

const DebugFlagModal: React.FC<DebugFlagModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const capturedRef = useRef(false);

  // Auto-capture screenshot on mount (before modal is visible in DOM)
  useEffect(() => {
    if (capturedRef.current) return;
    capturedRef.current = true;

    captureScreenshot().then(url => {
      if (url) setScreenshotUrl(url);
    });
  }, []);

  // Get game state safely
  const getGameState = (): unknown => {
    try {
      const saved = localStorage.getItem('state-of-the-dart-active-match');
      if (saved) {
        const match = JSON.parse(saved);
        return {
          matchId: match.id,
          type: match.type,
          status: match.status,
          players: match.players?.map((p: any) => ({
            name: p.name,
            playerId: p.playerId,
            legsWon: p.legsWon,
            matchAverage: p.matchAverage,
          })),
          currentLegIndex: match.currentLegIndex,
          legsCount: match.legs?.length,
        };
      }
    } catch {
      // Graceful null
    }
    return null;
  };

  const handleSubmit = async () => {
    if (!comment.trim()) {
      setError(t('debug.comment_required'));
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload = {
        comment: comment.trim(),
        route: window.location.pathname + window.location.search,
        browserInfo: getBrowserInfo(),
        screenshotUrl: screenshotUrl || undefined,
        gameState: getGameState(),
        logEntries: logBuffer.getSnapshot(500, 60),
      };

      try {
        await api.debugFlags.create(payload);
      } catch (err: any) {
        // Retry without screenshot if payload too large (413)
        if (err?.message?.includes('413')) {
          await api.debugFlags.create({ ...payload, screenshotUrl: undefined });
        } else {
          throw err;
        }
      }

      setSuccess(true);
      setTimeout(() => onClose(), 1500);
    } catch (err: any) {
      setError(err.message || t('debug.create_failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Flag size={24} className="text-amber-400" />
            </div>
            <h3 className="text-xl font-bold text-white">{t('debug.title')}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dark-700/50 rounded-lg transition-colors"
          >
            <XCircle size={24} className="text-gray-400" />
          </button>
        </div>

        {success ? (
          <div className="text-center py-8">
            <div className="text-green-400 text-lg font-semibold mb-2">{t('debug.created_success')}</div>
            <p className="text-dark-400 text-sm">{t('debug.created_hint')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-dark-300 mb-2">
                {t('debug.comment_label')} *
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                className="w-full px-4 py-3 bg-dark-800/50 border border-dark-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 resize-none"
                rows={4}
                placeholder={t('debug.comment_placeholder')}
                autoFocus
              />
            </div>

            {screenshotUrl && (
              <div>
                <label className="block text-sm font-semibold text-dark-300 mb-2">{t('debug.screenshot_preview')}</label>
                <img
                  src={screenshotUrl}
                  alt="Screenshot"
                  className="w-full rounded-lg border border-dark-700 max-h-40 object-cover"
                />
              </div>
            )}

            <div className="text-xs text-dark-500 space-y-1">
              <p>{t('debug.auto_capture_info')}</p>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-semibold transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !comment.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 size={18} className="animate-spin" /> : <Flag size={18} />}
                {t('debug.submit')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DebugFlagModal;
