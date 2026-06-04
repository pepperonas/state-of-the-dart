import React, { useState } from 'react';
import { Send, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Dialog, Button, TextField } from '../common';

interface ContactModalProps {
  onClose: () => void;
}

const ContactModal: React.FC<ContactModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const MAX_MESSAGE = 5000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !subject || !message) return;

    setSending(true);
    setError('');

    try {
      await api.contact.send({ name, email, subject, message });
      setSent(true);
    } catch (err: any) {
      if (err.message?.includes('429') || err.message?.includes('Too many')) {
        setError(t('contact.rate_limit'));
      } else {
        setError(t('contact.error'));
      }
    } finally {
      setSending(false);
    }
  };

  const canSubmit = !sending && !!name && !!email && !!subject && !!message;

  return (
    <Dialog
      open
      onClose={onClose}
      title={t('contact.title')}
      widthClassName="max-w-lg"
      actions={
        sent ? (
          <Button variant="filled" onClick={onClose}>
            {t('common.close')}
          </Button>
        ) : (
          <Button
            variant="filled"
            type="submit"
            form="contact-form"
            loading={sending}
            disabled={!canSubmit}
            icon={!sending ? <Send size={18} /> : undefined}
          >
            {sending ? t('contact.sending') : t('contact.send')}
          </Button>
        )
      }
    >
      {sent ? (
        <div className="py-4 text-center">
          <CheckCircle size={64} className="mx-auto text-success mb-4" />
          <h3 className="m3-title-large text-on-surface mb-2">{t('contact.success_title')}</h3>
          <p className="m3-body-medium text-on-surface-variant">{t('contact.success_text')}</p>
        </div>
      ) : (
        <form id="contact-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <TextField
            label={t('contact.name')}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('contact.name_placeholder')}
            required
          />

          {/* Email */}
          <TextField
            label={t('contact.email')}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('contact.email_placeholder')}
            required
          />

          {/* Subject */}
          <TextField
            label={t('contact.subject')}
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={t('contact.subject_placeholder')}
            required
          />

          {/* Message */}
          <div>
            <label className="m3-label-large block text-on-surface-variant mb-1">
              {t('contact.message')}
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
              placeholder={t('contact.message_placeholder')}
              required
              rows={5}
              className="w-full px-4 py-2 bg-surface-container border border-outline-variant rounded-m3-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none focus:border-primary transition-colors resize-none"
            />
            <p className="m3-body-small text-on-surface-variant mt-1 text-right">
              {t('contact.char_count', { count: message.length, max: MAX_MESSAGE })}
            </p>
          </div>

          {error && <p className="m3-body-small text-error">{error}</p>}
        </form>
      )}
    </Dialog>
  );
};

export default ContactModal;
