import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

/**
 * The way out of the auth screens.
 *
 * Every auth page used to be a dead end: land on `/login` from a shared link and
 * the only exits were "register" or "forgot password" — there was no way to see
 * what the product even is. This is that way back, and it sits in the same spot
 * on all of them so it is findable without looking.
 *
 * It points at `/willkommen` rather than `/`, because `/` is the auth switch: a
 * user who signed in in another tab would otherwise be bounced into the app
 * instead of the page they asked for.
 */
const BackToLanding: React.FC<{ className?: string }> = ({ className = '' }) => (
  <Link
    to="/willkommen"
    className={`inline-flex items-center gap-1.5 mb-4 m3-label-large text-on-surface-variant hover:text-on-surface transition-colors ${className}`}
  >
    <ArrowLeft size={16} />
    Zur Startseite
  </Link>
);

export default BackToLanding;
