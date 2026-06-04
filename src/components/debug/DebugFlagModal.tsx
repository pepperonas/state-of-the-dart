import React, { useState, useEffect, useRef } from 'react';
import { Flag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { captureScreenshot, getBrowserInfo } from '../../utils/screenshot';
import { logBuffer } from '../../utils/logBuffer';
import { api } from '../../services/api';
import { Button, Dialog } from '../common';

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
    <Dialog
      open
      onClose={onClose}
      widthClassName="max-w-2xl"
      title={
        <span className="flex items-center gap-3">
          <span className="p-2 rounded-m3-md bg-tertiary-container text-tertiary">
            <Flag size={24} />
          </span>
          {t('debug.title')}
        </span>
      }
      actions={
        success ? undefined : (
          <>
            <Button variant="text" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="filled"
              icon={<Flag size={18} />}
              loading={submitting}
              disabled={submitting || !comment.trim()}
              onClick={handleSubmit}
            >
              {t('debug.submit')}
            </Button>
          </>
        )
      }
    >
      {success ? (
        <div className="text-center py-8">
          <div className="text-success m3-title-medium mb-2">{t('debug.created_success')}</div>
          <p className="text-on-surface-variant m3-body-small">{t('debug.created_hint')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block m3-label-large text-on-surface-variant mb-2">
              {t('debug.comment_label')} *
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded-m3-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary resize-none"
              rows={4}
              placeholder={t('debug.comment_placeholder')}
              autoFocus
            />
          </div>

          {screenshotUrl && (
            <div>
              <label className="block m3-label-large text-on-surface-variant mb-2">{t('debug.screenshot_preview')}</label>
              <img
                src={screenshotUrl}
                alt="Screenshot"
                className="w-full rounded-m3-sm border border-outline-variant max-h-40 object-cover"
              />
            </div>
          )}

          <div className="m3-body-small text-on-surface-variant space-y-1">
            <p>{t('debug.auto_capture_info')}</p>
          </div>

          {error && (
            <div className="bg-error-container border border-outline-variant rounded-m3-sm p-3 text-error m3-body-small">
              {error}
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
};

export default DebugFlagModal;
