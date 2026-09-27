import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Delete, WifiOff, RotateCcw, LogOut } from 'lucide-react';
import { Button, Card, IconButton, AnimatedNumber } from '../common';
import { shouldHandleGameKey } from '../../utils/gameKeys';
import { checkOnlineVisit } from '../../utils/onlineVisit';
import { getCheckoutSuggestion } from '../../data/checkoutTable';

export interface OnlineSeat {
  id: string;
  name: string;
  connected?: boolean;
}

export interface OnlineRoomView {
  host: string;
  players: OnlineSeat[];
  settings: { startScore: number; legsToWin: number; doubleOut?: boolean };
  status: 'waiting' | 'playing' | 'finished';
  gameState?: { currentPlayerIndex: number; scores: Record<string, number>; legs: Record<string, number> };
}

export interface OnlineVisit {
  playerId: string;
  name: string;
  score: number;
  thrown: number;
  remaining: number;
  bust: boolean;
}

interface Props {
  room: OnlineRoomView;
  myId: string;
  visits: OnlineVisit[];
  winnerId: string | null;
  onThrow: (score: number, checkout: boolean) => void;
  onRematch: () => void;
  onLeave: () => void;
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

/**
 * The online game itself: scoreboard, whose turn it is, and — on your turn —
 * the score input. Until 0.17.0 the online mode could create rooms and start a
 * game, but had no way to enter a throw.
 */
const OnlineGamePanel: React.FC<Props> = ({ room, myId, visits, winnerId, onThrow, onRematch, onLeave }) => {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const gs = room.gameState;
  const current = gs ? room.players[gs.currentPlayerIndex] : undefined;
  const myTurn = room.status === 'playing' && current?.id === myId;
  const myRemaining = gs?.scores[myId] ?? room.settings.startScore;
  const doubleOut = room.settings.doubleOut ?? true;
  const isHost = room.host === myId;

  const submit = (value = input) => {
    if (!myTurn || value === '') return;
    const score = Number(value);
    const check = checkOnlineVisit(score, myRemaining, doubleOut);
    if (!check.ok) {
      setError(t(`online_game.invalid_${check.reason}`, { score }));
      return;
    }
    setError(null);
    setInput('');
    onThrow(score, check.checkout);
  };

  const press = (digit: string) => {
    setError(null);
    setInput(prev => (prev.length >= 3 ? prev : (prev + digit).replace(/^0+(?=\d)/, '')));
  };

  // Keyboard: digits, Backspace, Enter — only on your turn.
  useEffect(() => {
    if (!myTurn) return;
    const onKey = (e: KeyboardEvent) => {
      if (!shouldHandleGameKey(e)) return;
      if (/^[0-9]$/.test(e.key)) { press(e.key); e.preventDefault(); }
      else if (e.key === 'Backspace') { setInput(prev => prev.slice(0, -1)); e.preventDefault(); }
      else if (e.key === 'Enter') { submit(); e.preventDefault(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const suggestion = myTurn && doubleOut ? getCheckoutSuggestion(myRemaining) : null;
  const winner = winnerId ? room.players.find(p => p.id === winnerId) : undefined;

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className={`grid gap-3 ${room.players.length > 2 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
        {room.players.map(p => {
          const active = room.status === 'playing' && current?.id === p.id;
          return (
            <Card
              key={p.id}
              variant="filled"
              className={`p-4 text-center ${active ? 'ring-4 ring-[var(--m3-primary)] bg-surface-container-high' : ''}`}
              aria-current={active ? 'true' : undefined}
            >
              <p className="m3-title-small text-on-surface truncate">
                {p.name}{p.id === myId ? ` (${t('online_game.you')})` : ''}
              </p>
              <AnimatedNumber value={gs?.scores[p.id] ?? room.settings.startScore} className="block m3-display-small m3-emphasized tabular-nums text-on-surface" />
              <p className="m3-label-medium text-on-surface-variant">
                {t('online_game.legs_of', { won: gs?.legs[p.id] ?? 0, needed: room.settings.legsToWin })}
              </p>
              {p.connected === false && (
                <p className="mt-1 inline-flex items-center gap-1 m3-label-medium text-error">
                  <WifiOff size={14} aria-hidden="true" /> {t('online_game.waiting_reconnect')}
                </p>
              )}
            </Card>
          );
        })}
      </div>

      {/* Finished */}
      {room.status === 'finished' && (
        <Card variant="elevated" className="p-6 text-center">
          <Trophy size={48} className="mx-auto mb-2 text-[var(--m3-medal-gold)]" aria-hidden="true" />
          <h2 className="m3-headline-small m3-emphasized text-on-surface mb-4">
            {winner ? t('online_game.winner', { name: winner.name }) : t('online_game.status_finished')}
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            {isHost ? (
              <Button variant="filled" icon={<RotateCcw size={18} />} onClick={onRematch}>{t('online_game.rematch')}</Button>
            ) : (
              <p className="m3-body-medium text-on-surface-variant self-center">{t('online_game.waiting_rematch')}</p>
            )}
            <Button variant="tonal" icon={<LogOut size={18} />} onClick={onLeave}>{t('online_game.leave_room')}</Button>
          </div>
        </Card>
      )}

      {/* Turn / input */}
      {room.status === 'playing' && (
        <Card variant="elevated" className="p-4 sm:p-6">
          {myTurn ? (
            <>
              <h2 className="m3-title-large text-on-surface mb-1">{t('online_game.your_turn')}</h2>
              {suggestion && (
                <p className="m3-body-medium text-on-surface-variant mb-2">
                  {t('online_game.checkout_hint', { route: suggestion.join(' · ') })}
                </p>
              )}
              <div className="flex items-center gap-2 mb-3">
                <output
                  aria-label={t('online_game.entered_score')}
                  className="flex-1 m3-display-small m3-emphasized tabular-nums text-center rounded-m3-md bg-surface-container-highest text-on-surface py-2"
                >
                  {input || '0'}
                </output>
                <IconButton variant="tonal" label={t('online_game.delete_digit')} onClick={() => setInput(prev => prev.slice(0, -1))}>
                  <Delete size={20} />
                </IconButton>
              </div>
              {error && <p role="alert" className="m3-body-medium text-error mb-2">{error}</p>}
              <div className="grid grid-cols-3 gap-2">
                {KEYS.map(k => (
                  <Button key={k} variant="tonal" size="lg" onClick={() => press(k)}>{k}</Button>
                ))}
                <Button variant="text" size="lg" onClick={() => { setInput(''); setError(null); }}>{t('online_game.clear')}</Button>
                <Button variant="tonal" size="lg" onClick={() => press('0')}>0</Button>
                <Button variant="filled" size="lg" onClick={() => submit()} disabled={input === ''}>{t('online_game.submit')}</Button>
              </div>
              {myRemaining <= 170 && (
                <Button variant="success" fullWidth className="mt-3" onClick={() => submit(String(myRemaining))}>
                  {t('online_game.checkout_button', { score: myRemaining })}
                </Button>
              )}
            </>
          ) : (
            <p className="m3-title-medium text-on-surface text-center py-4">
              {current ? t('online_game.their_turn', { name: current.name }) : ''}
            </p>
          )}
        </Card>
      )}

      {/* Last visits */}
      {visits.length > 0 && (
        <Card variant="filled" className="p-4">
          <h3 className="m3-title-small text-on-surface mb-2">{t('online_game.last_visits')}</h3>
          <ol className="space-y-1">
            {visits.slice(-5).reverse().map((v, i) => (
              <li key={visits.length - i} className="m3-body-medium text-on-surface-variant flex justify-between gap-2">
                <span className="truncate">{v.name}</span>
                <span className="tabular-nums">
                  {v.bust ? t('online_game.bust_line', { thrown: v.thrown }) : v.score}
                  {' · '}
                  {t('online_game.rest', { remaining: v.remaining })}
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
};

export default OnlineGamePanel;
