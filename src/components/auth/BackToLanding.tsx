import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * The way out of the auth screens.
 *
 * Every auth page used to be a dead end: land on `/login` from a shared link and
 * the only exits were "register" or "forgot password" — there was no way to see
 * what the product even is. This is that way back, and it sits in the same spot
 * on all of them so it is findable without looking.
 *
 * It points at `/`: signed out that is the landing (since 0.48.0 the only
 * one — `/willkommen` redirects there).
 */
const BackToLanding: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { t } = useTranslation();
  return (
  <Link
    to="/"
    className={`inline-flex items-center gap-1.5 mb-4 m3-label-large text-on-surface-variant hover:text-on-surface transition-colors ${className}`}
  >
    <ArrowLeft size={16} />
    {t('back_to_landing.label')}
  </Link>
  );
};

export default BackToLanding;
