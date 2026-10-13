import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Dart } from '../../types';
import type { CheckRule } from '../../utils/checkRules';
import { calculateThrowScore, numpadDarts, validateScore } from '../../utils/scoring';
import { shortDart } from '../../utils/decompose';
import { Button, Dialog, SegmentedButton, TextField } from '../common';
import { DartGrid } from './DartGrid';
import { gridDart, type GridMultiplier } from '../../utils/gridDart';

export type EditVisitTab = 'sum' | 'darts';

interface EditVisitDialogProps {
  open: boolean;
  onClose: () => void;
  playerName: string;
  visitNumber: number;
  /** The visit as booked. */
  score: number;
  darts: Dart[];
  /** Remaining score before this visit (a typed total that equals it is a checkout route). */
  remainingBefore: number;
  outRule: CheckRule;
  initialTab?: EditVisitTab;
  /** Applies the correction; returns an error message to show, or null when it was applied. */
  onSave: (darts: Dart[]) => string | null;
}

/**
 * "Correct visit" — reached from the last-visit pills and the visit list.
 * Sum: type the right total, as on the numpad. Darts: pick the beds, which
 * also makes them count in the heatmap.
 */
export const EditVisitDialog: React.FC<EditVisitDialogProps> = ({
  open, onClose, playerName, visitNumber, score, darts, remainingBefore, outRule, initialTab = 'sum', onSave,
}) => {
  const { t } = useTranslation();
  const [tab, setTab] = useState<EditVisitTab>(initialTab);
  const [sum, setSum] = useState('');
  const [picked, setPicked] = useState<Dart[]>(() => darts.filter(d => !d.estimated));
  const [multiplier, setMultiplier] = useState<GridMultiplier>('1');
  const [error, setError] = useState<string | null>(null);

  const save = () => {
    let next: Dart[];
    if (tab === 'sum') {
      const n = Number(sum);
      if (sum === '' || !Number.isInteger(n) || !validateScore(n)) { setError(t('correction.error_invalid')); return; }
      next = numpadDarts(n, remainingBefore, 3, outRule);
    } else {
      if (picked.length === 0) { setError(t('correction.error_no_darts')); return; }
      next = picked;
    }
    const problem = onSave(next);
    if (problem) setError(problem);
    else onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t('correction.title', { name: playerName, n: visitNumber })}
      widthClassName="max-w-md"
      actions={
        <>
          <Button variant="text" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant="filled" onClick={save} data-testid="edit-visit-save">{t('correction.save')}</Button>
        </>
      }
    >
      <div className="space-y-4" data-testid="edit-visit-dialog">
        <p className="m3-body-medium text-on-surface-variant">
          {t('correction.booked', { score })}
          {darts.some(d => !d.estimated) && <> · <span className="tabular-nums">{darts.map(shortDart).join(' · ')}</span></>}
        </p>
        <SegmentedButton<EditVisitTab>
          label={t('correction.mode')}
          value={tab}
          onChange={v => { setTab(v); setError(null); }}
          options={[
            { value: 'sum', label: t('correction.tab_sum') },
            { value: 'darts', label: t('correction.tab_darts') },
          ]}
        />
        {tab === 'sum' ? (
          <form onSubmit={e => { e.preventDefault(); save(); }}>
            <TextField
              label={t('correction.new_sum')}
              inputMode="numeric"
              autoFocus
              value={sum}
              onChange={e => { setSum(e.target.value.replace(/\D/g, '').slice(0, 3)); setError(null); }}
              error={error ?? undefined}
              data-testid="edit-visit-sum"
            />
          </form>
        ) : (
          <div>
            <div className="flex gap-2 mb-3">
              {[0, 1, 2].map(i => {
                const d = picked[i];
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!d}
                    onClick={() => setPicked(p => p.filter((_, j) => j !== i))}
                    aria-label={d ? t('correction.remove_dart', { dart: shortDart(d) }) : t('game.empty_dart', { n: i + 1 })}
                    className={`flex-1 h-12 rounded-m3-md border m3-title-large tabular-nums ${d ? 'bg-secondary-container text-on-secondary-container border-transparent m3-state-layer' : 'bg-surface-container border-outline-variant text-on-surface-variant'}`}
                  >
                    {d ? shortDart(d) : '–'}
                  </button>
                );
              })}
              <div className="min-w-[4rem] flex flex-col items-center justify-center rounded-m3-md bg-tertiary-container text-on-tertiary-container">
                <span className="m3-label-small">{t('score_input.total')}</span>
                <span className="m3-title-large tabular-nums">{calculateThrowScore(picked)}</span>
              </div>
            </div>
            <DartGrid
              keyTone="bg-surface-container-highest"
              multiplier={multiplier}
              onMultiplierChange={setMultiplier}
              disabled={picked.length >= 3}
              onPick={segment => {
                setPicked(p => (p.length >= 3 ? p : [...p, gridDart(segment, multiplier)]));
                setMultiplier('1');
                setError(null);
              }}
            />
            {error && <p className="m3-body-small text-error" role="alert">{error}</p>}
          </div>
        )}
      </div>
    </Dialog>
  );
};

export default EditVisitDialog;
