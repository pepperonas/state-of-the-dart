import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Camera } from 'lucide-react';
import { api } from '../../services/api';
import { captureScreenshot, getBrowserInfo } from '../../utils/screenshot';
import type { BugReportSeverity, BugReportCategory } from '../../types';
import { Select, Dialog, Button, IconButton, TextField, TextArea } from '../common';
import { Icon } from '../icons';

interface BugReportModalProps {
  onClose: () => void;
  currentRoute?: string;
}

export default function BugReportModal({ onClose, currentRoute }: BugReportModalProps) {
  const { t } = useTranslation();
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
      setError(t('bug.fill_required'));
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
          setError(retryErr.message || t('bug.send_failed'));
        }
      } else {
        setError(err.message || t('bug.send_failed'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const severityOptions: { value: BugReportSeverity; label: string }[] = [
    { value: 'low', label: t('bug.severity_low') },
    { value: 'medium', label: t('bug.severity_medium') },
    { value: 'high', label: t('bug.severity_high') },
    { value: 'critical', label: t('bug.severity_critical') },
  ];

  const categoryOptions: { value: BugReportCategory; label: string }[] = (
    ['gameplay', 'ui', 'audio', 'performance', 'auth', 'data', 'achievements', 'other'] as BugReportCategory[]
  ).map(value => ({ value, label: t(`bug.category_${value}`) }));

  return (
    <Dialog open onClose={isSubmitting ? () => {} : onClose} title={t('bug.title')} widthClassName="max-w-2xl">
      {success ? (
        <div role="status" className="py-10 text-center">
          <div className="mb-4 flex justify-center text-success"><Icon name="checkCircle" size={56} /></div>
          <h3 className="m3-headline-small text-on-surface mb-2">{t('bug.thanks')}</h3>
          <p className="m3-body-large text-on-surface-variant">{t('bug.sent')}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div role="alert" className="rounded-m3-md p-4 bg-error-container text-on-error-container m3-body-medium">
              {error}
            </div>
          )}

          <TextField
            label={`${t('bug.field_title')} *`}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('bug.field_title_placeholder')}
            required
            disabled={isSubmitting}
            maxLength={100}
          />

          <TextArea
            label={`${t('bug.field_description')} *`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('bug.field_description_placeholder')}
            rows={6}
            required
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="m3-field">
              <span className="m3-field-label">{t('bug.field_severity')} *</span>
              <Select<BugReportSeverity>
                value={severity}
                onChange={setSeverity}
                options={severityOptions}
                size="lg"
                disabled={isSubmitting}
                aria-label={t('bug.field_severity')}
              />
            </div>
            <div className="m3-field">
              <span className="m3-field-label">{t('bug.field_category')} *</span>
              <Select<BugReportCategory>
                value={category}
                onChange={setCategory}
                options={categoryOptions}
                size="lg"
                disabled={isSubmitting}
                aria-label={t('bug.field_category')}
              />
            </div>
          </div>

          <div className="m3-field">
            <span className="m3-field-label">{t('bug.field_screenshot')}</span>
            {screenshot ? (
              <div className="relative">
                <img src={screenshot} alt={t('bug.field_screenshot')} className="w-full rounded-m3-md border border-outline-variant" />
                <IconButton
                  variant="filled"
                  label={t('bug.remove_screenshot')}
                  onClick={() => setScreenshot(null)}
                  disabled={isSubmitting}
                  className="absolute top-2 right-2"
                >
                  <X size={18} />
                </IconButton>
              </div>
            ) : (
              <Button
                type="button"
                variant="outlined"
                fullWidth
                icon={<Camera size={20} />}
                loading={isCapturing}
                onClick={handleCaptureScreenshot}
                disabled={isCapturing || isSubmitting}
              >
                {isCapturing ? t('bug.capturing') : t('bug.capture')}
              </Button>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="tonal" fullWidth onClick={onClose} disabled={isSubmitting}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="filled" fullWidth loading={isSubmitting} disabled={isSubmitting}>
              {isSubmitting ? t('bug.sending') : t('bug.submit')}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
