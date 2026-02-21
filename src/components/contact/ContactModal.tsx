import React, { useState } from 'react';
import { X, Send, CheckCircle, Loader } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';

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

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="glass-card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <h2 className="text-xl font-bold text-white">{t('contact.title')}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-dark-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 text-center">
            <CheckCircle size={64} className="mx-auto text-green-400 mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">{t('contact.success_title')}</h3>
            <p className="text-dark-300 mb-6">{t('contact.success_text')}</p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors"
            >
              {t('common.close')}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">{t('contact.name')}</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('contact.name_placeholder')}
                required
                className="w-full px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">{t('contact.email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('contact.email_placeholder')}
                required
                className="w-full px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">{t('contact.subject')}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={t('contact.subject_placeholder')}
                required
                className="w-full px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1">{t('contact.message')}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, MAX_MESSAGE))}
                placeholder={t('contact.message_placeholder')}
                required
                rows={5}
                className="w-full px-4 py-2 bg-dark-800 border border-white/10 rounded-lg text-white placeholder-dark-500 focus:outline-none focus:border-primary-500 transition-colors resize-none"
              />
              <p className="text-xs text-dark-500 mt-1 text-right">
                {t('contact.char_count', { count: message.length, max: MAX_MESSAGE })}
              </p>
            </div>

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={sending || !name || !email || !subject || !message}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
            >
              {sending ? (
                <>
                  <Loader size={18} className="animate-spin" />
                  {t('contact.sending')}
                </>
              ) : (
                <>
                  <Send size={18} />
                  {t('contact.send')}
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ContactModal;
