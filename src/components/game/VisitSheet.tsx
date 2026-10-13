import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Throw } from '../../types/index';
import { shortDart } from '../../utils/decompose';

export interface SheetLeg {
  /** 1-based leg number in the match. */
  number: number;
  throws: Throw[];
}

interface VisitSheetProps {
  players: { playerId: string; name: string }[];
  legs: SheetLeg[];
  /** The player at the oche — their column is marked. */
  activeId?: string;
  /** Show "Leg N" rows between legs (the whole-match view). */
  showLegHeaders?: boolean;
  onEdit: (throwId: string) => void;
}

/**
 * The visit history as a score sheet (0.42.0): one row per round, one column
 * per player, like the sheet a marker keeps at the board.
 *
 * It replaced a card per visit, stacked per player — "Wurf #1 · 12 → 289" plus
 * "Summe getippt – Felder unbekannt" under every typed total — where two rounds
 * of three players took six cards and the order of play was lost. A cell shows
 * the score, the remaining score under it and, only when the darts are known,
 * the beds. A typed total simply has no bed line. Tapping a cell corrects it.
 */
const VisitSheet: React.FC<VisitSheetProps> = ({ players, legs, activeId, showLegHeaders = false, onEdit }) => {
  const { t } = useTranslation();
  const rounds = (leg: SheetLeg) => {
    const byPlayer = players.map(p => leg.throws.filter(th => th.playerId === p.playerId));
    const n = Math.max(0, ...byPlayer.map(l => l.length));
    return Array.from({ length: n }, (_, i) => byPlayer.map(l => l[i]));
  };
  const total = legs.reduce((n, l) => n + l.throws.length, 0);

  if (total === 0) {
    return <p className="m3-body-medium text-on-surface-variant">{t('game_screen.no_visits')}</p>;
  }

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <table data-testid="visit-sheet" className="w-full tabular-nums border-separate border-spacing-x-1 border-spacing-y-1">
        <thead>
          <tr>
            <th scope="col" className="w-8 m3-label-small text-on-surface-variant text-left font-normal">
              <span className="sr-only">{t('game_screen.sheet_round')}</span>#
            </th>
            {players.map(p => (
              <th
                key={p.playerId}
                scope="col"
                className={`px-2 py-1.5 rounded-m3-sm m3-label-large text-center truncate max-w-[9rem] ${
                  p.playerId === activeId ? 'bg-primary-container text-on-primary-container' : 'text-on-surface-variant'
                }`}
              >
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {legs.map(leg => (
            <React.Fragment key={leg.number}>
              {showLegHeaders && leg.throws.length > 0 && (
                <tr>
                  <th colSpan={players.length + 1} scope="rowgroup" className="pt-2 text-left m3-label-medium text-on-surface-variant font-normal">
                    {t('game_screen.leg_number', { n: leg.number })}
                  </th>
                </tr>
              )}
              {rounds(leg).map((cells, r) => (
                <tr key={`${leg.number}-${r}`}>
                  <th scope="row" className="m3-label-medium text-on-surface-variant text-left font-normal">{r + 1}</th>
                  {cells.map((v, i) => (
                    <td key={players[i].playerId} className="p-0 align-top">
                      {v ? <SheetCell visit={v} onEdit={onEdit} /> : null}
                    </td>
                  ))}
                </tr>
              ))}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SheetCell: React.FC<{ visit: Throw; onEdit: (id: string) => void }> = ({ visit, onEdit }) => {
  const { t } = useTranslation();
  const typed = visit.darts.length > 0 && visit.darts.every(d => d.estimated);
  const label = t('correction.edit_visit', { score: visit.isBust ? t('game.bust') : visit.score });
  return (
    <button
      type="button"
      onClick={() => onEdit(visit.id)}
      aria-label={typed ? `${label} · ${t('correction.typed')}` : label}
      data-testid="history-edit"
      data-typed={typed ? 'true' : undefined}
      className="m3-state-layer w-full min-h-[44px] rounded-m3-sm bg-surface-container px-2 py-1.5 text-center"
    >
      <span className="flex items-baseline justify-center gap-1.5">
        <span className={`m3-title-medium font-semibold ${
          visit.isBust ? 'text-error'
            : visit.score >= 140 ? 'text-tertiary'
            : visit.score >= 100 ? 'text-primary'
            : 'text-on-surface'
        }`}>
          {visit.isBust ? t('game.bust') : visit.score}
        </span>
        <span className="m3-label-small text-on-surface-variant">{visit.remaining}</span>
      </span>
      {!typed && visit.darts.length > 0 && (
        <span data-testid="sheet-darts" className="block m3-label-small text-on-surface-variant whitespace-nowrap">
          {visit.darts.map(shortDart).join(' · ')}
        </span>
      )}
    </button>
  );
};

export default VisitSheet;
