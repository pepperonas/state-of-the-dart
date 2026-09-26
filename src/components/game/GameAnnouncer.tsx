import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Match } from '../../types';
import { announcementFor } from '../../utils/announce';

/**
 * Polite live region for the game: "Anna: 100, Rest 401", bust, leg won.
 * Visually hidden — sighted players see the scoreboard change; a screen reader
 * user heard nothing at all before (the app had no aria-live in play).
 */
const GameAnnouncer: React.FC<{ match: Match | null }> = ({ match }) => {
  const { t } = useTranslation();
  const prev = useRef<Match | null>(match);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const text = announcementFor(prev.current, match, t);
    prev.current = match;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derived from a prop change, announced once
    if (text) setMessage(text);
  }, [match, t]);

  return (
    <div data-testid="game-announcer" role="status" aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
};

export default GameAnnouncer;
