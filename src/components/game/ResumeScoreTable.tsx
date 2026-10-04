import React from 'react';
import { useTranslation } from 'react-i18next';
import { Trophy, Target } from 'lucide-react';
import { legLeaderFromRemaining } from '../../utils/legLeader';

export interface ResumeScoreRow {
  playerId: string;
  name: string;
  legsWon: number;
  /** Remaining score in the current leg; undefined when the server did not send it. */
  remaining?: number;
  matchAverage?: number;
}

interface Props {
  rows: ResumeScoreRow[];
  /** Visits thrown in the whole match — 0 means it was started and left at once. */
  totalVisits?: number;
}

/**
 * Where a paused match stands, as a table: one row per player with legs won,
 * remaining score in the current leg and match average. The leg leader carries
 * the same board icon as on the game screen.
 */
const ResumeScoreTable: React.FC<Props> = ({ rows, totalVisits }) => {
  const { t } = useTranslation();
  const leader = legLeaderFromRemaining(rows);

  return (
    <div className="mt-3">
      <table className="w-full m3-body-medium tabular-nums border-separate border-spacing-0" data-testid="resume-score-table">
        <caption className="sr-only">{t('resume_screen.table_caption')}</caption>
        <thead>
          <tr className="text-on-surface-variant m3-label-medium">
            <th scope="col" className="text-left font-medium pb-1">{t('resume_screen.col_player')}</th>
            <th scope="col" className="text-right font-medium pb-1 w-14">{t('resume_screen.col_legs')}</th>
            <th scope="col" className="text-right font-medium pb-1 w-16">{t('resume_screen.col_rest')}</th>
            <th scope="col" className="text-right font-medium pb-1 w-16">{t('resume_screen.col_avg')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => {
            const isLeader = r.playerId === leader;
            return (
              <tr key={r.playerId} data-testid={`resume-row-${r.name}`} >
                <th scope="row" className="text-left font-normal py-1.5 border-t border-outline-variant text-on-surface">
                  <span className="inline-flex items-center gap-1.5 min-w-0 max-w-full">
                    <span className="truncate">{r.name}</span>
                    {isLeader && (
                      <span role="img" aria-label={t('player_score.leg_leader')} title={t('player_score.leg_leader')} className="text-primary shrink-0">
                        <Target size={14} aria-hidden="true" />
                      </span>
                    )}
                  </span>
                </th>
                <td className="text-right py-1.5 border-t border-outline-variant">
                  <span className={`inline-flex items-center justify-end gap-1 ${r.legsWon > 0 ? 'text-tertiary font-semibold' : 'text-on-surface-variant'}`}>
                    {r.legsWon}
                    {r.legsWon > 0 && <Trophy size={12} fill="currentColor" aria-hidden="true" />}
                  </span>
                </td>
                <td className={`text-right py-1.5 border-t border-outline-variant ${isLeader ? 'text-primary font-semibold' : 'text-on-surface'}`}>
                  {r.remaining ?? '–'}
                </td>
                <td className="text-right py-1.5 border-t border-outline-variant text-on-surface-variant">
                  {(r.matchAverage ?? 0).toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {totalVisits === 0 && (
        <p className="mt-2 m3-body-small text-on-surface-variant" data-testid="resume-no-throws">{t('resume_screen.no_throws')}</p>
      )}
    </div>
  );
};

export default ResumeScoreTable;
